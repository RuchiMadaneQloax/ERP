from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from deepface import DeepFace
import numpy as np
import base64
import io
from PIL import Image
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from typing import List, Optional
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "hrm")
MATCH_THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "0.5"))

if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
employees_collection = db["employees"]


class FaceRequest(BaseModel):
    image: str


class EnrollRequest(BaseModel):
    images: Optional[List[str]] = Field(default=None)
    image: Optional[str] = Field(default=None)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return -1.0
    return float(np.dot(a, b) / denom)


def extract_embedding(image_base64: str):
    try:
        image_data = base64.b64decode(image_base64.split(",")[-1])
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        embedding = DeepFace.represent(
            img_path=np.array(image),
            model_name="ArcFace",
            enforce_detection=False,
        )

        if not embedding:
            return None

        return np.array(embedding[0]["embedding"], dtype=np.float32)
    except Exception as exc:
        print("Embedding error:", exc)
        return None


def collect_enroll_images(payload: EnrollRequest) -> List[str]:
    images = payload.images if isinstance(payload.images, list) else []
    images = [img for img in images if isinstance(img, str) and img.strip()]
    if not images and isinstance(payload.image, str) and payload.image.strip():
        images = [payload.image]
    return images


@app.post("/enroll/{employee_id}")
def enroll_face(employee_id: str, data: EnrollRequest):
    images = collect_enroll_images(data)
    if not images:
        raise HTTPException(status_code=400, detail="At least one face image is required")

    embeddings = []
    for img in images:
        emb = extract_embedding(img)
        if emb is not None:
            embeddings.append(emb)

    if not embeddings:
        raise HTTPException(status_code=400, detail="No valid face detected in provided images")

    primary_embedding = np.mean(np.stack(embeddings), axis=0)

    try:
        result = employees_collection.update_one(
            {"_id": ObjectId(employee_id)},
            {
                "$set": {
                    "faceEmbedding": primary_embedding.tolist(),
                    "faceEmbeddings": [emb.tolist() for emb in embeddings],
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Employee not found")

        return {
            "message": "Face enrolled successfully",
            "employeeId": employee_id,
            "embeddingsCount": len(embeddings),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/recognize")
def recognize_face(data: FaceRequest):
    new_embedding = extract_embedding(data.image)
    if new_embedding is None:
        return {"employeeId": None, "confidence": 0.0}

    best_match_id = None
    best_score = -1.0

    employees = employees_collection.find(
        {
            "$or": [
                {"faceEmbeddings.0": {"$exists": True}},
                {"faceEmbedding": {"$ne": None}},
            ]
        }
    )

    for emp in employees:
        candidate_embeddings = []

        if isinstance(emp.get("faceEmbeddings"), list) and emp["faceEmbeddings"]:
            candidate_embeddings.extend(emp["faceEmbeddings"])

        if isinstance(emp.get("faceEmbedding"), list) and emp["faceEmbedding"]:
            candidate_embeddings.append(emp["faceEmbedding"])

        for stored in candidate_embeddings:
            stored_embedding = np.array(stored, dtype=np.float32)
            similarity = cosine_similarity(new_embedding, stored_embedding)
            if similarity > best_score:
                best_score = similarity
                best_match_id = str(emp["_id"])

    if best_score > MATCH_THRESHOLD and best_match_id:
        return {"employeeId": best_match_id, "confidence": float(round(best_score, 3))}

    return {"employeeId": None, "confidence": float(round(max(best_score, 0.0), 3))}


@app.get("/")
def health_check():
    return {"status": "Face Recognition Service Running"}
