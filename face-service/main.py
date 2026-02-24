from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepface import DeepFace
import numpy as np
import base64
import io
from PIL import Image
from pymongo import MongoClient
from bson import ObjectId
import os

# =========================
# FASTAPI INIT
# =========================
app = FastAPI()

# Enable CORS (so React/Node can call this API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# MONGODB CONNECTION
# =========================
import os
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "hrm")

if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
employees_collection = db["employees"]

# REQUEST MODEL
# =========================
class FaceRequest(BaseModel):
    image: str  # base64 image


# =========================
# COSINE SIMILARITY
# =========================
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


# =========================
# EXTRACT FACE EMBEDDING
# =========================
def extract_embedding(image_base64):
    try:
        image_data = base64.b64decode(image_base64.split(",")[-1])
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        embedding = DeepFace.represent(
            img_path=np.array(image),
            model_name="ArcFace",   # 🔥 Strong model
            enforce_detection=False
        )

        if not embedding:
            return None

        return np.array(embedding[0]["embedding"])

    except Exception as e:
        print("Embedding Error:", e)
        return None


# =========================
# ENROLL FACE
# =========================
@app.post("/enroll/{employee_id}")
def enroll_face(employee_id: str, data: FaceRequest):

    embedding = extract_embedding(data.image)

    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected")

    try:
        result = employees_collection.update_one(
            {"_id": ObjectId(employee_id)},
            {"$set": {"faceEmbedding": embedding.tolist()}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Employee not found")

        return {
            "message": "Face enrolled successfully",
            "employeeId": employee_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# RECOGNIZE FACE
# =========================
@app.post("/recognize")
def recognize_face(data: FaceRequest):

    new_embedding = extract_embedding(data.image)

    if new_embedding is None:
        return {"employeeId": None, "confidence": 0}

    best_match_id = None
    best_score = -1

    employees = employees_collection.find({"faceEmbedding": {"$ne": None}})

    for emp in employees:
        stored_embedding = np.array(emp["faceEmbedding"])
        similarity = cosine_similarity(new_embedding, stored_embedding)

        print("Comparing with employee:", emp["_id"])
        print("Similarity score:", similarity)

        if similarity > best_score:
            best_score = similarity
            best_match_id = str(emp["_id"])

    # Threshold (adjust if needed)
    print("Best similarity found:", best_score)

    THRESHOLD = 0.5

    if best_score > THRESHOLD:
        return {
            "employeeId": best_match_id,
            "confidence": float(round(best_score, 3))
        }

    return {
        "employeeId": None,
        "confidence": float(round(best_score, 3))
    }


# =========================
# HEALTH CHECK
# =========================
@app.get("/")
def health_check():
    return {"status": "Face Recognition Service Running"}
