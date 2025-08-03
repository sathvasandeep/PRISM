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

import os, logging, traceback, asyncio, json
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
origins = [
    "http://localhost",
    "http://localhost:8080", # Your frontend's origin
    "http://127.0.0.1",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Use the specific list of origins
    allow_credentials=True,
    allow_methods=["*"],    # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],    # Allows all headers
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
# 6. DTOs (The Correct, Consolidated Block)
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

class TaskGenerationRequest(BaseModel):
    competency_id: str
    objective_text: str
    flavor_id: Optional[str] = None

class TaskResponseIn(BaseModel):
    response_payload: Dict

# --- MOVED FROM LATER IN THE FILE ---
# look‑up DTOs
class ProfessionOut(BaseModel): id:int; name:str
class DepartmentOut(BaseModel): id:int; profession_id:int; name:str
class RoleOut(BaseModel):       id:int; department_id:int; name:str

# task / KRA DTOs
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
        parts = key.split("_")
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                cur[part] = val
            else:
                if part not in cur:
                    cur[part] = {}
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
# NEW: 7.5 - Stage 3 Helper Dictionaries
# --------------------------------------------------------------------

# The bridge between Stage 2 objectives and Stage 3 GCRs
COMPETENCY_TO_GCR_MAP = {
    "skills-cognitive-analytical": "gcr-IG",
    "skills-cognitive-decisionMaking": "gcr-ED",
    "skills-cognitive-strategicPlanning": "gcr-SF",
    "skills-cognitive-criticalEvaluation": "gcr-ED",
    "skills-interpersonal-communication": "gcr-IG",
    "skills-interpersonal-collaboration": "gcr-CP",
    "skills-interpersonal-negotiation": "gcr-NA",
    "skills-interpersonal-empathy": "gcr-NA",
}

# This map links the GCR ID to the UI component that should render it
GCR_UI_COMPONENT_MAP = {
    "gcr-IG": "ui-markdown-editor",
    "gcr-ED": "ui-rank-and-write",
    "gcr-SF": "ui-kanban-board",
    "gcr-CP": "ui-team-chat-planner",
    "gcr-NA": "ui-negotiation-dialogue",
}

# In a real app, this would be loaded from a JSON file library
GCR_DEFINITIONS = {
    "gcr-ED": {
        "id": "gcr-ED",
        "name": "Evaluative Decision",
        "verbs": ["gather", "analyze", "prioritize", "communicate"],
        "input_schema": {
            "type": "object",
            "properties": {
                "options_list": {
                    "type": "array",
                    "description": "A list of 3-5 plausible options the user must choose from.",
                    "items": {"type": "string"}
                },
                "criteria_md": {
                    "type": "string",
                    "description": "A markdown string describing the criteria for making the decision."
                }
            },
        }
    }
    # ... other GCR definitions would be loaded here

}
# 4. The library of different scenario "flavors" for each GCR
GCR_FLAVORS = {
    "gcr-ED": [
        {"id": "prioritization", "name": "Prioritization Challenge"},
        {"id": "resource_allocation", "name": "Resource Allocation Dilemma"},
        {"id": "risk_mitigation", "name": "Risk Mitigation Choice"},
        {"id": "ethical_dilemma", "name": "Ethical Dilemma"},
    ],
    "gcr-SF": [
        {"id": "new_market_entry", "name": "New Market Entry Plan"},
        {"id": "product_roadmap", "name": "Product Roadmap Creation"},
    ]
    # ... add flavors for other GCRs as needed
}

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

    return Profile(
        id=pid,
        archetype=p["archetype"],
        roleData=RoleData(
            profession=p["profession"],
            department=p["department"],
            specificRole=p["specific_role"],
            description=p["description"],
            key_responsibilities=p["key_responsibilities"],
            day_to_day_tasks=p["day_to_day_tasks"],
        ),
        skiveRatings=inflate_ratings(flat),
        aleDesign=rebuild_ale(obj, ale, ski),
    )


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

# ====================================================================
# The Complete, Corrected Stage 3 Task Generation Endpoint
# ====================================================================
@app.post("/api/profiles/{pid}/generate-task", response_model=Dict)
async def generate_task_for_competency(pid: int, req: TaskGenerationRequest, db=Depends(get_db_connection)):
    # --- Step 1: Load Profile and Map to GCR ---
    profile_data = await load_profile(pid, db)
    competency_key = "-".join(req.competency_id.split('-')[:3])
    gcr_id = COMPETENCY_TO_GCR_MAP.get(competency_key)
    if not gcr_id: raise HTTPException(404, f"No GCR mapped for competency '{competency_key}'")
    gcr_definition = GCR_DEFINITIONS.get(gcr_id)
    if not gcr_definition: raise HTTPException(404, f"GCR definition for '{gcr_id}' not found")
    
    # --- Step 2: Build the AI Prompt with Flavor ---
    flavor_prompt_injection = ""
    if req.flavor_id and GCR_FLAVORS.get(gcr_id):
        flavor = next((f for f in GCR_FLAVORS[gcr_id] if f["id"] == req.flavor_id), None)
        if flavor:
            if flavor["id"] == "prioritization": flavor_prompt_injection = "The core of this scenario MUST be about prioritizing a list of competing tasks, features, or options under constraints."
            elif flavor["id"] == "resource_allocation": flavor_prompt_injection = "The core of this scenario MUST be about allocating a limited resource (like budget, time, or personnel) among several valid options."
            elif flavor["id"] == "risk_mitigation": flavor_prompt_injection = "The core of this scenario MUST be a choice between a high-reward, high-risk path and a lower-reward, low-risk path."
            elif flavor["id"] == "ethical_dilemma": flavor_prompt_injection = "The core of this scenario MUST be an ethical dilemma where there is no clear right answer, forcing a trade-off between competing values."

    # --- THIS IS THE FIX ---
    # Define the role_data variable from the loaded profile BEFORE using it.
    role_data = profile_data.roleData
    
    # Now, construct the prompt using the defined variable.
    prompt = f"""You are a simulation engine for professional training. Generate a realistic scenario for a serious game.

    ROLE: {role_data.specificRole} ({role_data.profession} / {role_data.department})
    ROLE DESCRIPTION: {role_data.description}
    KEY RESPONSIBILITIES: {role_data.key_responsibilities or "[]"}
    TYPICAL TASKS: {role_data.day_to_day_tasks or "[]"}
    
    The learning objective is: "{req.objective_text}"

    The cognitive task is an '{gcr_definition["name"]}'.

    *** IMPORTANT INSTRUCTION: {flavor_prompt_injection if flavor_prompt_injection else "Generate a standard scenario for this cognitive task."} ***

    Based on all this context, populate the following JSON object according to the schema. Make the content specific and plausible for the role.
    SCHEMA: {gcr_definition["input_schema"]}

    Respond with ONLY the populated JSON object, with no extra text or markdown formatting."""

    # --- Step 3: Call AI and Parse Response ---
    if not API_KEY: raise HTTPException(500, "Gemini disabled on server.")
    ai_generated_context = {}
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        raw_response = model.generate_content(prompt).text
        
        # --- NEW, MORE ROBUST PARSING LOGIC ---
        # 1. Clean the string of markdown and whitespace
        # The .strip() is the key part that will fix your current error.
        clean_response = raw_response.strip().replace("```json", "").replace("```", "").strip()

        # 2. Let json.loads be the validator. If it fails, the string is not valid JSON.
        ai_generated_context = json.loads(clean_response)

    except json.JSONDecodeError as e:
        logging.error(f"AI returned a string that could not be parsed as JSON. Error: {e}")
        logging.error(f"--- Raw AI Response was: ---\n{raw_response}\n-----------------------------")
        raise HTTPException(500, "AI returned malformed JSON.")
    except Exception as e:
        logging.error(f"An unexpected error occurred during AI Task Generation: {e}")
        raise HTTPException(500, "An unexpected error occurred while generating the task.")


    # --- Step 4: Save the Generated Task to the Database ---
    new_task_id = None
    cur = db.cursor()
    try:
        cur.execute(
            """INSERT INTO generated_tasks 
               (profile_id, objective_competency_id, gcr_id, flavor_id, context_json) 
               VALUES (%s, %s, %s, %s, %s)""",
            (pid, req.competency_id, gcr_id, req.flavor_id, json.dumps(ai_generated_context))
        )
        new_task_id = cur.lastrowid
        db.commit()
    except mysql.connector.Error as err:
        db.rollback()
        logging.error(f"Failed to save generated task: {err}")
        raise HTTPException(500, "Database error while saving generated task.")
    finally:
        cur.close()
    
    # --- Step 5: Assemble and Return the Final Payload ---
    task_payload = {
        "id": new_task_id,
        "competencyId": req.competency_id,
        "gcrId": gcr_id,
        "uiComponentId": GCR_UI_COMPONENT_MAP.get(gcr_id, "ui-unknown"),
        "context": ai_generated_context,
        "outputSchema": gcr_definition.get("output_schema", {}),
        "flavorId": req.flavor_id
    }
    return task_payload
# ====================================================================
# NEW: 9.6 - Endpoint to receive user responses for a task
# ====================================================================
@app.post("/api/tasks/{task_id}/submit", response_model=Dict)
async def submit_task_response(task_id: int, response: TaskResponseIn, db=Depends(get_db_connection)):
    # Note: In a real app, you'd add user authentication here
    cur = db.cursor()
    try:
        # First, save the user's response to the database
        cur.execute(
            "INSERT INTO task_responses (task_id, response_payload_json) VALUES (%s, %s)",
            (task_id, json.dumps(response.response_payload))
        )
        
        # Then, update the status of the original task to 'completed'
        cur.execute(
            "UPDATE generated_tasks SET status = 'completed' WHERE id = %s",
            (task_id,)
        )
        
        db.commit()
        
        return {"message": "Response successfully saved!"}
    except mysql.connector.Error as err:
        db.rollback()
        logging.error(f"Failed to save task response for task {task_id}: {err}")
        raise HTTPException(500, "Database error while saving response.")
    finally:
        cur.close()


# ====================================================================
# NEW: 9.7 - Endpoint to evaluate a submitted response
# ====================================================================
@app.post("/api/responses/{task_id}/evaluate", response_model=Dict)
async def evaluate_task_response(task_id: int, db=Depends(get_db_connection)):
    cur = db.cursor(dictionary=True)
    try:
        # 1. Fetch the original task and the user's response
        cur.execute("SELECT context_json FROM generated_tasks WHERE id=%s", (task_id,))
        task_row = cur.fetchone()
        if not task_row: raise HTTPException(404, "Original task not found.")
        
        cur.execute("SELECT id, response_payload_json FROM task_responses WHERE task_id=%s ORDER BY submitted_at DESC LIMIT 1", (task_id,))
        response_row = cur.fetchone()
        if not response_row: raise HTTPException(404, "Response not found for this task.")

        task_context = task_row['context_json']
        user_response = response_row['response_payload_json']
        response_id = response_row['id']

        # 2. Construct the evaluation prompt for the AI
        eval_prompt = f"""
        You are an expert evaluator for a professional training simulation.
        Your task is to score a user's response and provide constructive feedback.
        
        **Original Task Scenario:**
        {task_context}

        **User's Response:**
        {user_response}

        **Evaluation Criteria:**
        1.  **Clarity (1-5):** Is the rationale clear and easy to understand?
        2.  **Justification (1-5):** Does the user effectively justify their ranking based on the provided criteria?
        3.  **Prioritization Logic (1-5):** Does the user's ranking logically follow from the scenario's constraints and goals?

        **Instructions:**
        Respond with ONLY a JSON object in the following format. Do not include any other text or markdown.
        {{
          "score": <average_score_as_float_between_1_and_5>,
          "feedback": "<detailed_feedback_as_string_explaining_the_score>"
        }}
        """

        # 3. Call the AI
        if not API_KEY: raise HTTPException(500, "Gemini is not configured.")
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        raw_eval_response = model.generate_content(eval_prompt).text
        
        # 4. Parse the AI's structured response
        clean_eval_response = raw_eval_response.strip().replace("```json", "").replace("```", "").strip()
        eval_data = json.loads(clean_eval_response)
        score = eval_data.get("score")
        feedback = eval_data.get("feedback")

        # 5. Update the database with the evaluation results
        cur.execute(
            "UPDATE task_responses SET evaluation_score = %s, evaluation_feedback = %s WHERE id = %s",
            (score, feedback, response_id)
        )
        db.commit()

        return {"score": score, "feedback": feedback}

    except Exception as e:
        db.rollback()
        logging.error(f"Failed to evaluate response for task {task_id}: {e}")
        raise HTTPException(500, "An error occurred during evaluation.")
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
               label,
               bucket
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
# 12. One‑time DDL helper comment (No longer needed, assuming schema is up to date)
# --------------------------------------------------------------------