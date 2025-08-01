# main.py – FastAPI back‑end for the PRISM Framework
# ==================================================
"""
Quick start
-----------
    pip install fastapi uvicorn python-dotenv mysql-connector-python google-generativeai

Environment (.env)
------------------
    DB_HOST=localhost
    DB_USER=prism_user
    DB_PASSWORD=secret_pw
    DB_NAME=prism_db
    API_KEY=<your‑Gemini‑key>    # optional – comment out to disable AI routes
"""

import os, logging, traceback, asyncio
from typing import Dict, List, Optional, Generator

from dotenv import load_dotenv
import mysql.connector
import google.generativeai as genai

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --------------------------------------------------------------------
# 1. Logging
# --------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)

# --------------------------------------------------------------------
# 2. Environment
# --------------------------------------------------------------------
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
API_KEY = os.getenv("API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        logging.info("Gemini client configured ✅")
    except Exception as e:
        logging.error("Gemini configure failed: %s", e)
        API_KEY = None
else:
    logging.warning("API_KEY missing – AI routes disabled.")

# --------------------------------------------------------------------
# 3. DB helper
# --------------------------------------------------------------------

def get_db_connection() -> Generator[mysql.connector.MySQLConnection, None, None]:
    """Yield a MySQL connection, always closing it afterwards."""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            autocommit=False,
        )
        yield conn
    except mysql.connector.Error as err:
        logging.exception("MySQL‑connect failed")
        raise HTTPException(500, f"DB connection failed: {err}")
    finally:
        if "conn" in locals() and conn.is_connected():
            conn.close()

# --------------------------------------------------------------------
# 4. FastAPI + CORS
# --------------------------------------------------------------------
app = FastAPI(title="PRISM Framework API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # 🔒 tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------
# 5.  Fail fast on bad DB creds
# --------------------------------------------------------------------
@app.on_event("startup")
async def startup_db_check():
    """Ping DB during startup so mis‑config shows immediately."""
    loop = asyncio.get_running_loop()

    def _ping():
        gen = get_db_connection()
        conn = next(gen)  # open
        conn.close()
        try:
            next(gen)     # finish generator
        except StopIteration:
            pass

    try:
        await loop.run_in_executor(None, _ping)
        logging.info("Initial DB connection OK 🎉")
    except Exception as exc:
        logging.critical("Initial DB connection failed: %s", exc)
        raise SystemExit(2)

# --------------------------------------------------------------------
# 6. DTOs
# --------------------------------------------------------------------
class RoleData(BaseModel):
    profession: str
    department: Optional[str] = None
    specificRole: str
    description: str
    key_responsibilities: Optional[str] = None   # JSON string of KRAs
    day_to_day_tasks: Optional[str] = None       # JSON string of tasks

class SkiveRatings(BaseModel):
    skills: Dict
    knowledge: Dict
    identity: Dict
    values: Dict
    ethics: Dict

class AleDesign(BaseModel):
    learningObjectives: Dict
    selectedAleComponents: Dict
    selectedSkiveApproaches: Dict

class Profile(BaseModel):
    id: Optional[int] = None
    roleData: RoleData
    skiveRatings: SkiveRatings
    aleDesign: AleDesign
    archetype: Optional[str] = None

class GenerationRequest(BaseModel):
    prompt: str

# look‑up DTOs --------------------------------------------------------
class ProfessionOut(BaseModel): id:int; name:str
class DepartmentOut(BaseModel): id:int; profession_id:int; name:str
class RoleOut(BaseModel):       id:int; department_id:int; name:str

# task / KRA DTOs -----------------------------------------------------
class TaskIn(BaseModel):  task_text:str; idx:int
class TaskOut(TaskIn):    id:int

class KraIn(BaseModel):  kra_id:Optional[int]=None; custom_label:Optional[str]=None
class KraOut(BaseModel): id:int; kra_id:Optional[int]; custom_label:Optional[str]

# --------------------------------------------------------------------
# 7.  Rating helpers
# --------------------------------------------------------------------

def _empty_skive():
    return {
        "skills": {"cognitive": {}, "interpersonal": {}, "psychomotor": {}, "metacognitive": {}},
        "knowledge": {"declarative": {}, "procedural": {}, "conditional": {}},
        "identity": {}, "values": {}, "ethics": {},
    }


def flatten_ratings(r: SkiveRatings) -> Dict[str, int]:
    flat, d = {}, r.dict()
    for cat in d:
        if cat in ("skills", "knowledge"):
            for sub in d[cat]:
                for k, v in d[cat][sub].items():
                    flat[f"{cat}_{sub}_{k}"] = v
        else:
            for k, v in d[cat].items():
                flat[f"{cat}_{k}"] = v
    return flat


def inflate_ratings(row: Optional[Dict]) -> Dict:
    nested = _empty_skive()
    if not row:
        return nested
    for key, val in row.items():
        if key in ("id", "profile_id"):
            continue
        cur = nested
        for i, part in enumerate(key.split("_")):
            if i == len(part):
                continue
            if i == len(key.split("_")) - 1:
                cur[part] = val
            else:
                cur = cur[part]
    return nested


def rebuild_ale(obj_rows, ale_rows, skive_rows):
    d = {"learningObjectives": {}, "selectedAleComponents": {}, "selectedSkiveApproaches": {}}
    if obj_rows:
        d["learningObjectives"] = {r["competency_id"]: r["objective_text"] for r in obj_rows}
    if ale_rows:
        for r in ale_rows:
            d["selectedAleComponents"].setdefault(r["feature"], []).append(r["component"])
    if skive_rows:
        for r in skive_rows:
            d["selectedSkiveApproaches"].setdefault(r["aspect"], []).append(r["approach"])
    return d

# --------------------------------------------------------------------
# 8.  Gemini endpoint
# --------------------------------------------------------------------
@app.post("/api/generate-objective")
async def generate(req: GenerationRequest):
    if not API_KEY:
        raise HTTPException(500, "Gemini disabled on server.")
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        text = model.generate_content(req.prompt).text.strip()
        return {"text": text}
    except Exception as e:
        logging.error("Gemini error:\n%s", traceback.format_exc())
        raise HTTPException(500, str(e))

# --------------------------------------------------------------------
# 9.  Profile CRUD
# --------------------------------------------------------------------
@app.get("/api/profiles", response_model=List[Dict])
async def list_profiles(db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("""SELECT id,profession,department,specific_role,description,
                          archetype,updated_at
                   FROM profiles ORDER BY updated_at DESC""")
    rows = cur.fetchall()
    cur.close()
    return rows


@app.get("/api/profiles/{pid}", response_model=Profile)
async def load_profile(pid:int, db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM profiles WHERE id=%s", (pid,))
    p = cur.fetchone()
    if not p:
        raise HTTPException(404, "Profile not found")

    cur.execute("SELECT * FROM skive_ratings WHERE profile_id=%s", (pid,))
    flat = cur.fetchone()
    cur.execute("SELECT * FROM learning_objectives WHERE profile_id=%s", (pid,))
    obj = cur.fetchall()
    cur.execute("SELECT * FROM selected_ale_components WHERE profile_id=%s", (pid,))
    ale = cur.fetchall()
    cur.execute("SELECT * FROM selected_skive_approaches WHERE profile_id=%s", (pid,))
    ski = cur.fetchall()
    cur.close()

    return {
        "id": pid,
        "archetype": p["archetype"],
        "roleData": {
            "profession": p["profession"],
            "department": p["department"],
            "specificRole": p["specific_role"],
            "description": p["description"],
            "key_responsibilities": p["key_responsibilities"],
            "day_to_day_tasks": p["day_to_day_tasks"],
        },
        "skiveRatings": inflate_ratings(flat),
        "aleDesign": rebuild_ale(obj, ale, ski),
    }


@app.post("/api/profiles", response_model=Dict)
async def save_profile(profile: Profile, db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    try:
        # ---------- UPDATE ----------
        if profile.id:
            cur.execute(
                """UPDATE profiles SET
                       profession=%s, department=%s, specific_role=%s,
                       description=%s, key_responsibilities=%s,
                       day_to_day_tasks=%s, archetype=%s
                     WHERE id=%s""",
                (
                    profile.roleData.profession,
                    profile.roleData.department,
                    profile.roleData.specificRole,
                    profile.roleData.description,
                    profile.roleData.key_responsibilities,
                    profile.roleData.day_to_day_tasks,
                    profile.archetype,
                    profile.id,
                ),
            )
            flat = flatten_ratings(profile.skiveRatings)
            set_clause = ", ".join(f"{k}=%s" for k in flat)
            cur.execute(
                f"UPDATE skive_ratings SET {set_clause} WHERE profile_id=%s",
                list(flat.values()) + [profile.id],
            )
            msg = "updated"
        # ---------- INSERT ----------
        else:
            cur.execute(
                """INSERT INTO profiles
                       (profession,department,specific_role,description,
                        key_responsibilities,day_to_day_tasks,archetype)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (
                    profile.roleData.profession,
                    profile.roleData.department,
                    profile.roleData.specificRole,
                    profile.roleData.description,
                    profile.roleData.key_responsibilities,
                    profile.roleData.day_to_day_tasks,
                    profile.archetype,
                ),
            )
            profile.id = cur.lastrowid
            flat = flatten_ratings(profile.skiveRatings)
            flat["profile_id"] = profile.id
            cols = ", ".join(flat.keys())
            ph   = ", ".join(["%s"] * len(flat))
            cur.execute(
                f"INSERT INTO skive_ratings ({cols}) VALUES ({ph})",
                list(flat.values()),
            )
            msg = "saved"

        # ---------- replace Stage‑2 tables ----------
        cur.execute("DELETE FROM learning_objectives WHERE profile_id=%s", (profile.id,))
        cur.execute("DELETE FROM selected_ale_components WHERE profile_id=%s", (profile.id,))
        cur.execute("DELETE FROM selected_skive_approaches WHERE profile_id=%s", (profile.id,))

        if profile.aleDesign.learningObjectives:
            cur.executemany(
                """INSERT INTO learning_objectives
                       (profile_id,competency_id,objective_text)
                       VALUES (%s,%s,%s)""",
                [
                    (profile.id, cid, txt)
                    for cid, txt in profile.aleDesign.learningObjectives.items()
                ],
            )
        if profile.aleDesign.selectedAleComponents:
            cur.executemany(
                """INSERT INTO selected_ale_components (profile_id,feature,component)
                       VALUES (%s,%s,%s)""",
                [
                    (profile.id, feat, comp)
                    for feat, comps in profile.aleDesign.selectedAleComponents.items()
                    for comp in comps
                ],
            )
        if profile.aleDesign.selectedSkiveApproaches:
            cur.executemany(
                """INSERT INTO selected_skive_approaches (profile_id,aspect,approach)
                       VALUES (%s,%s,%s)""",
                [
                    (profile.id, asp, appr)
                    for asp, apprs in profile.aleDesign.selectedSkiveApproaches.items()
                    for appr in apprs
                ],
            )
        db.commit()
        return {"id": profile.id, "message": f"Profile {msg}."}

    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(500, f"DB error: {err}")
    finally:
        cur.close()

# --------------------------------------------------------------------
# 10.  Lookup routes (professions → departments → roles)
# --------------------------------------------------------------------
@app.get("/api/professions", response_model=List[ProfessionOut])
async def list_professions(db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id,name FROM professions ORDER BY name")
    rows = cur.fetchall()
    cur.close()
    return rows

@app.get("/api/departments", response_model=List[DepartmentOut])
async def list_departments(profession_id:int=Query(...,ge=1), db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id,profession_id,name FROM departments WHERE profession_id=%s ORDER BY name", (profession_id,))
    rows = cur.fetchall()
    cur.close()
    return rows

@app.get("/api/roles", response_model=List[RoleOut])
async def list_roles(department_id:int=Query(...,ge=1), db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id,department_id,name FROM roles WHERE department_id=%s ORDER BY name", (department_id,))
    rows = cur.fetchall()
    cur.close()
    return rows

# master KRA list -----------------------------------------------------
@app.get("/api/kras_master", response_model=List[Dict])
async def list_kras_master(db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("""
        SELECT id,
               label AS kra_label,
               bucket,
               profession AS profession_name
        FROM kras_master
        ORDER BY bucket, label
    """)
    rows = cur.fetchall()
    cur.close()
    return rows

# --------------------------------------------------------------------
# 11.  Tasks & KRAs sub‑resources
# --------------------------------------------------------------------
@app.get("/api/profiles/{pid}/tasks", response_model=List[TaskOut])
async def load_tasks(pid:int, db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id,task_text,idx FROM profile_tasks WHERE profile_id=%s ORDER BY idx", (pid,))
    rows = cur.fetchall()
    cur.close()
    return rows

@app.post("/api/profiles/{pid}/tasks", response_model=dict)
async def save_tasks(pid:int, tasks:List[TaskIn], db=Depends(get_db_connection)):
    cur = db.cursor()
    cur.execute("DELETE FROM profile_tasks WHERE profile_id=%s", (pid,))
    if tasks:
        cur.executemany(
            "INSERT INTO profile_tasks (profile_id,task_text,idx) VALUES (%s,%s,%s)",
            [(pid, t.task_text, t.idx) for t in tasks],
        )
    db.commit()
    cur.close()
    return {"message": "Tasks saved"}

@app.get("/api/profiles/{pid}/kras", response_model=List[KraOut])
async def load_kras(pid:int, db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id,kra_id,custom_label FROM profile_kras WHERE profile_id=%s", (pid,))
    rows = cur.fetchall()
    cur.close()
    return rows

@app.post("/api/profiles/{pid}/kras", response_model=dict)
async def save_kras(pid:int, kras:List[KraIn], db=Depends(get_db_connection)):
    cur = db.cursor()
    cur.execute("DELETE FROM profile_kras WHERE profile_id=%s", (pid,))
    if kras:
        cur.executemany(
            "INSERT INTO profile_kras (profile_id,kra_id,custom_label) VALUES (%s,%s,%s)",
            [(pid, k.kra_id, k.custom_label) for k in kras],
        )
    db.commit()
    cur.close()
    return {"message": "KRAs saved"}

# --------------------------------------------------------------------
# 12. One‑time DDL helper comment
# --------------------------------------------------------------------
"""
ALTER TABLE profiles
  ADD COLUMN department VARCHAR(255),
  ADD COLUMN key_responsibilities TEXT,
  ADD COLUMN day_to_day_tasks TEXT;
"""
