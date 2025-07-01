# main.py
import os
from dotenv import load_dotenv
import mysql.connector
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

# Load environment variables from a .env file
load_dotenv()

app = FastAPI()

# Allow all origins for development purposes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Connection ---
def get_db_connection():
    """Provides a database connection for dependency injection."""
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME")
        )
        yield conn
    except mysql.connector.Error as err:
        print(f"Database Connection Error: {err}")
        raise HTTPException(status_code=500, detail="Could not connect to the database.")
    finally:
        if 'conn' in locals() and conn.is_connected():
            conn.close()

# --- Pydantic Models for Data Validation ---
class RoleData(BaseModel):
    profession: str
    specificRole: str
    description: str

class SkillsRatings(BaseModel):
    cognitive: Dict[str, int]
    interpersonal: Dict[str, int]
    psychomotor: Dict[str, int]
    metacognitive: Dict[str, int]

class KnowledgeRatings(BaseModel):
    declarative: Dict[str, int]
    procedural: Dict[str, int]
    conditional: Dict[str, int]

class IdentityRatings(BaseModel):
    professionalRole: int
    communityBelonging: int
    selfEfficacy: int
    dispositions: int

class ValuesRatings(BaseModel):
    coreValues: int
    epistemicValues: int
    stakeholderValues: int
    
class EthicsRatings(BaseModel):
    deontological: int
    consequentialist: int
    virtue: int

class SkiveRatings(BaseModel):
    skills: SkillsRatings
    knowledge: KnowledgeRatings
    identity: IdentityRatings
    values: ValuesRatings
    ethics: EthicsRatings

class AleDesign(BaseModel):
    learningObjectives: Dict[str, Any]
    selectedAleComponents: Dict[str, Any]
    selectedSkiveApproaches: Dict[str, Any]

class Profile(BaseModel):
    id: Optional[int] = None
    roleData: RoleData
    skiveRatings: SkiveRatings
    aleDesign: AleDesign


def flatten_skive_ratings(ratings: SkiveRatings) -> Dict[str, int]:
    """Flattens the nested SKIVE ratings object to match DB columns."""
    flat_data = {}
    
    for major_cat, major_cat_ratings in ratings.dict().items():
        if major_cat in ['skills', 'knowledge']:
            for sub_cat, sub_cat_ratings in major_cat_ratings.items():
                for name, value in sub_cat_ratings.items():
                    # Format: skills_cognitive_analytical
                    db_key = f"{major_cat}_{sub_cat}_{name}"
                    flat_data[db_key] = value
        else: # identity, values, ethics
            for name, value in major_cat_ratings.items():
                # Format: identity_professionalRole
                db_key = f"{major_cat}_{name}"
                flat_data[db_key] = value
                
    return flat_data

@app.post("/api/profiles")
async def save_or_update_profile(profile: Profile, db=Depends(get_db_connection)):
    """Saves a new profile or updates an existing one."""
    cursor = db.cursor()

    try:
        if profile.id:
            # --- UPDATE logic ---
            # 1. Update profiles table
            profile_sql = "UPDATE profiles SET profession = %s, specific_role = %s, description = %s WHERE id = %s"
            cursor.execute(profile_sql, (profile.roleData.profession, profile.roleData.specificRole, profile.roleData.description, profile.id))

            # 2. Update skive_ratings table
            flat_ratings = flatten_skive_ratings(profile.skiveRatings)
            set_clause = ', '.join([f"{key} = %s" for key in flat_ratings.keys()])
            skive_sql = f"UPDATE skive_ratings SET {set_clause} WHERE profile_id = %s"
            skive_values = list(flat_ratings.values()) + [profile.id]
            cursor.execute(skive_sql, skive_values)
            
            message = "Profile updated successfully"
            profile_id = profile.id
        else:
            # --- INSERT logic ---
            # 1. Insert into profiles table
            profile_sql = "INSERT INTO profiles (profession, specific_role, description) VALUES (%s, %s, %s)"
            cursor.execute(profile_sql, (profile.roleData.profession, profile.roleData.specificRole, profile.roleData.description))
            profile_id = cursor.lastrowid
            
            # 2. Insert into skive_ratings table
            flat_ratings = flatten_skive_ratings(profile.skiveRatings)
            flat_ratings['profile_id'] = profile_id
            
            columns = ', '.join(flat_ratings.keys())
            placeholders = ', '.join(['%s'] * len(flat_ratings))
            skive_sql = f"INSERT INTO skive_ratings ({columns}) VALUES ({placeholders})"
            cursor.execute(skive_sql, list(flat_ratings.values()))
            
            message = "Profile saved successfully"

        # NOTE: The aleDesign part of the profile is not being saved,
        # as it would require additional database tables and relationships.

        db.commit()
        return {"id": profile_id, "message": message}

    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        cursor.close()