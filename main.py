# main.py  – FastAPI back-end for the PRISM Framework
# ================================================
import os, json, logging, traceback
from typing import Dict, Optional, List

from dotenv import load_dotenv
import mysql.connector
import google.generativeai as genai

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --------------------------------------------------------------------
# 1. Logging
# --------------------------------------------------------------------
logging.basicConfig(level=logging.DEBUG)

# --------------------------------------------------------------------
# 2. Environment (.env)
# --------------------------------------------------------------------
load_dotenv()                          # looks for ".env" in current dir
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    logging.warning("API_KEY not found in .env – AI features disabled.")
else:
    try:
        genai.configure(api_key=API_KEY)
        logging.info("Gemini client configured.")
    except Exception as e:
        logging.critical("Failed to configure Gemini: %s", e)
        API_KEY = None                 # disable AI gracefully

# --------------------------------------------------------------------
# 3. FastAPI + CORS
# --------------------------------------------------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --------------------------------------------------------------------
# 4. MySQL connector helper
# --------------------------------------------------------------------
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            autocommit=False,
        )
        yield conn
    except mysql.connector.Error as err:
        raise HTTPException(500, f"Database connection failed: {err}")
    finally:
        if "conn" in locals() and conn.is_connected():
            conn.close()

# --------------------------------------------------------------------
# 5. Pydantic models
# --------------------------------------------------------------------
class RoleData(BaseModel):
    profession: str
    specificRole: str
    description: str

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

# --------------------------------------------------------------------
# 6. Helper functions (unchanged)
# --------------------------------------------------------------------
def get_initial_profile_skive_ratings():
    return {
        "skills": {"cognitive": {}, "interpersonal": {}, "psychomotor": {}, "metacognitive": {}},
        "knowledge": {"declarative": {}, "procedural": {}, "conditional": {}},
        "identity": {}, "values": {}, "ethics": {},
    }

def flatten_skive_ratings(ratings: SkiveRatings) -> Dict[str, int]:
    flat, data = {}, ratings.dict()
    for cat in data:
        if cat in ("skills", "knowledge"):
            for sub in data[cat]:
                for name, val in data[cat][sub].items():
                    flat[f"{cat}_{sub}_{name}"] = val
        else:
            for name, val in data[cat].items():
                flat[f"{cat}_{name}"] = val
    return flat

def reconstruct_skive_ratings(flat: Optional[Dict]) -> Dict:
    nested = get_initial_profile_skive_ratings()
    if not flat:
        return nested
    for key, val in flat.items():
        if key in ("id", "profile_id"):
            continue
        cur = nested
        parts = key.split("_")
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                cur[part] = val
            else:
                cur = cur[part]
    return nested

def reconstruct_ale_design(obj, ale, skive) -> Dict:
    design = {"learningObjectives": {}, "selectedAleComponents": {}, "selectedSkiveApproaches": {}}
    if obj:
        design["learningObjectives"] = {o["competency_id"]: o["objective_text"] for o in obj}
    if ale:
        for r in ale:
            design["selectedAleComponents"].setdefault(r["feature"], []).append(r["component"])
    if skive:
        for r in skive:
            design["selectedSkiveApproaches"].setdefault(r["aspect"], []).append(r["approach"])
    return design

# --------------------------------------------------------------------
# 7.  AI endpoint – full traceback on error
# --------------------------------------------------------------------
@app.post("/api/generate-objective")
async def generate_objective(req: GenerationRequest):
    if not API_KEY:
        raise HTTPException(500, "Gemini API key not configured on server.")

    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest") 
        resp  = model.generate_content(req.prompt)
        return {"text": resp.text.strip()}
    except Exception as e:
        logging.error("Gemini call failed:\n%s", traceback.format_exc())
        raise HTTPException(500, f"AI model error: {e}")

# --------------------------------------------------------------------
# 8.  Profiles – read
# --------------------------------------------------------------------
@app.get("/api/profiles", response_model=List[Dict])
async def get_all_profiles(db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, profession, specific_role, description, archetype, updated_at "
            "FROM profiles ORDER BY updated_at DESC"
        )
        return cur.fetchall()
    finally:
        cur.close()

@app.get("/api/profiles/{pid}", response_model=Profile)
async def get_profile_by_id(pid: int, db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM profiles WHERE id=%s", (pid,))
        p = cur.fetchone()
        if not p:
            raise HTTPException(404, "Profile not found")

        cur.execute("SELECT * FROM skive_ratings WHERE profile_id=%s", (pid,))
        flat = cur.fetchone()
        cur.execute("SELECT * FROM learning_objectives       WHERE profile_id=%s", (pid,)); obj  = cur.fetchall()
        cur.execute("SELECT * FROM selected_ale_components   WHERE profile_id=%s", (pid,)); ale  = cur.fetchall()
        cur.execute("SELECT * FROM selected_skive_approaches WHERE profile_id=%s", (pid,)); ski  = cur.fetchall()

        return {
            "id": pid,
            "archetype": p["archetype"],
            "roleData": {
                "profession": p["profession"],
                "specificRole": p["specific_role"],
                "description": p["description"],
            },
            "skiveRatings": reconstruct_skive_ratings(flat),
            "aleDesign":    reconstruct_ale_design(obj, ale, ski),
        }
    finally:
        cur.close()

# --------------------------------------------------------------------
# 9.  Profiles – create / update
# --------------------------------------------------------------------
@app.post("/api/profiles", response_model=Dict)
async def save_or_update_profile(profile: Profile, db=Depends(get_db_connection)):
    cur = db.cursor()
    try:
        # ---------- UPDATE ----------
        if profile.id:
            cur.execute(
                "UPDATE profiles SET profession=%s, specific_role=%s, "
                "description=%s, archetype=%s WHERE id=%s",
                (
                    profile.roleData.profession,
                    profile.roleData.specificRole,
                    profile.roleData.description,
                    profile.archetype,
                    profile.id,
                ),
            )

            flat = flatten_skive_ratings(profile.skiveRatings)
            set_clause = ", ".join(f"{k}=%s" for k in flat)
            cur.execute(
                f"UPDATE skive_ratings SET {set_clause} WHERE profile_id=%s",
                list(flat.values()) + [profile.id],
            )
            msg = "Profile updated"

        # ---------- INSERT ----------
        else:
            cur.execute(
                "INSERT INTO profiles (profession, specific_role, description, archetype) "
                "VALUES (%s, %s, %s, %s)",
                (
                    profile.roleData.profession,
                    profile.roleData.specificRole,
                    profile.roleData.description,
                    profile.archetype,
                ),
            )
            profile.id = cur.lastrowid
            flat = flatten_skive_ratings(profile.skiveRatings)
            flat["profile_id"] = profile.id

            cols         = ", ".join(flat.keys())
            placeholders = ", ".join(["%s"] * len(flat))
            cur.execute(
                f"INSERT INTO skive_ratings ({cols}) VALUES ({placeholders})",
                list(flat.values()),
            )
            msg = "Profile saved"

        # ---------- Stage-2 tables ----------
        if profile.id:
            cur.execute("DELETE FROM learning_objectives       WHERE profile_id=%s", (profile.id,))
            cur.execute("DELETE FROM selected_ale_components   WHERE profile_id=%s", (profile.id,))
            cur.execute("DELETE FROM selected_skive_approaches WHERE profile_id=%s", (profile.id,))

        if profile.aleDesign.learningObjectives:
            cur.executemany(
                "INSERT INTO learning_objectives (profile_id, competency_id, objective_text) "
                "VALUES (%s, %s, %s)",
                [
                    (profile.id, cid, text)
                    for cid, text in profile.aleDesign.learningObjectives.items()
                ],
            )

        if profile.aleDesign.selectedAleComponents:
            cur.executemany(
                "INSERT INTO selected_ale_components (profile_id, feature, component) "
                "VALUES (%s, %s, %s)",
                [
                    (profile.id, feature, comp)
                    for feature, comps in profile.aleDesign.selectedAleComponents.items()
                    for comp in comps
                ],
            )

        if profile.aleDesign.selectedSkiveApproaches:
            cur.executemany(
                "INSERT INTO selected_skive_approaches (profile_id, aspect, approach) "
                "VALUES (%s, %s, %s)",
                [
                    (profile.id, aspect, appr)
                    for aspect, apprs in profile.aleDesign.selectedSkiveApproaches.items()
                    for appr in apprs
                ],
            )

        db.commit()
        return {"id": profile.id, "message": f"{msg} successfully!"}

    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(500, f"Database error: {err}")

    finally:
        cur.close()
