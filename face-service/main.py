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
TOP2_GAP_THRESHOLD = float(os.environ.get("FACE_TOP2_GAP_THRESHOLD", "0.03"))

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


def decode_image(image_base64: str):
    try:
        image_data = base64.b64decode(image_base64.split(",")[-1])
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        return np.array(image)
    except Exception as exc:
        print("Image decode error:", exc)
        return None


def extract_embedding(image_base64: str):
    try:
        image_array = decode_image(image_base64)
        if image_array is None:
            return None, "Invalid image data"

        # Enforce single-face rule to avoid mismatches with group frames.
        faces = DeepFace.extract_faces(
            img_path=image_array,
            detector_backend="retinaface",
            enforce_detection=True,
        )
        if len(faces) != 1:
            return None, "Exactly one face must be visible in the frame"

        embedding = DeepFace.represent(
            img_path=image_array,
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=True,
        )

        if not embedding:
            return None, "Face embedding could not be generated"

        return np.array(embedding[0]["embedding"], dtype=np.float32), None
    except Exception as exc:
        print("Embedding error:", exc)
        return None, "Exactly one clear face is required"


def collect_enroll_images(payload: EnrollRequest) -> List[str]:
    images = payload.images if isinstance(payload.images, list) else []
    images = [img for img in images if isinstance(img, str) and img.strip()]
    if not images and isinstance(payload.image, str) and payload.image.strip():
        images = [payload.image]
    return images


@app.post("/enroll/{employee_id}")
def enroll_face(employee_id: str, data: EnrollRequest):
    images = collect_enroll_images(data)
    if len(images) != 3:
        raise HTTPException(status_code=400, detail="Exactly 3 face images are required")

    embeddings = []
    for index, img in enumerate(images):
        emb, error = extract_embedding(img)
        if error:
            raise HTTPException(
                status_code=400,
                detail=f"Image {index + 1}: {error}",
            )
        if emb is not None:
            embeddings.append(emb)

    if len(embeddings) != 3:
        raise HTTPException(
            status_code=400,
            detail="Face must be detected in all 3 images",
        )

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
            "embeddingsCount": 3,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/recognize")
def recognize_face(data: FaceRequest):
    new_embedding, validation_error = extract_embedding(data.image)
    if validation_error:
        return {"employeeId": None, "confidence": 0.0, "validationError": validation_error}
    if new_embedding is None:
        return {"employeeId": None, "confidence": 0.0}

    scored_candidates = []

    employees = employees_collection.find({"faceEmbeddings.2": {"$exists": True}})

    for emp in employees:
        stored_embeddings = emp.get("faceEmbeddings", [])
        if not isinstance(stored_embeddings, list) or len(stored_embeddings) < 3:
            continue

        similarities = []
        for stored in stored_embeddings[:3]:
            stored_embedding = np.array(stored, dtype=np.float32)
            similarities.append(cosine_similarity(new_embedding, stored_embedding))

        avg_similarity = float(np.mean(similarities))
        all_three_match = all(s >= MATCH_THRESHOLD for s in similarities)

        if all_three_match:
            scored_candidates.append((str(emp["_id"]), avg_similarity))

    if not scored_candidates:
        return {"employeeId": None, "confidence": 0.0}

    scored_candidates.sort(key=lambda x: x[1], reverse=True)
    best_match_id, best_score = scored_candidates[0]
    second_best_score = scored_candidates[1][1] if len(scored_candidates) > 1 else -1.0
    top2_gap = best_score - second_best_score if second_best_score >= 0 else best_score

    if best_score >= MATCH_THRESHOLD and top2_gap >= TOP2_GAP_THRESHOLD:
        return {
            "employeeId": best_match_id,
            "confidence": float(round(best_score, 3)),
            "top2Gap": float(round(top2_gap, 3)),
        }

    return {
        "employeeId": None,
        "confidence": float(round(max(best_score, 0.0), 3)),
        "top2Gap": float(round(max(top2_gap, 0.0), 3)),
    }


@app.get("/")
def health_check():
    return {"status": "Face Recognition Service Running"}
