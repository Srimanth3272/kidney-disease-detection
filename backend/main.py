import os
import io
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import tensorflow as tf

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kidney Disease Detection API",
    description="CT scan kidney disease classifier — detects Cyst, Normal, Stone, Tumor",
    version="1.0.0",
)

# Allow all origins so the Vercel frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model loading ─────────────────────────────────────────────────────────────
CLASS_LABELS = ["Cyst", "Normal", "Stone", "Tumor"]
IMG_SIZE = (200, 200)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "KIDNEY_STONE_CYST_TUMOR_DETECTION.h5")

model = None


def load_model():
    global model
    if model is None:
        print(f"Loading model from {MODEL_PATH} …")
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully.")
    return model


# Load at startup so the first request isn't slow
@app.on_event("startup")
async def startup_event():
    load_model()


# ── Helper ────────────────────────────────────────────────────────────────────
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Resize to 200×200 RGB, normalise to [0,1] and add batch dimension."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)          # shape: (1, 200, 200, 3)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "message": "Kidney Disease Detection API is running 🚀",
        "endpoints": {
            "predict": "POST /predict  —  upload a CT scan image",
            "health":  "GET  /health   —  health check",
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # ── Validate file type ────────────────────────────────────────────────────
    allowed_types = {"image/jpeg", "image/png", "image/jpg", "image/bmp", "image/tiff"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Upload a JPEG or PNG image.",
        )

    try:
        image_bytes = await file.read()
        input_array = preprocess_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {str(e)}")

    # ── Inference ─────────────────────────────────────────────────────────────
    try:
        m = load_model()
        predictions = m.predict(input_array, verbose=0)[0]      # shape: (4,)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

    # ── Build response ────────────────────────────────────────────────────────
    predicted_index = int(np.argmax(predictions))
    predicted_class = CLASS_LABELS[predicted_index]
    confidence      = float(predictions[predicted_index])

    scores = {label: round(float(score), 4) for label, score in zip(CLASS_LABELS, predictions)}

    return JSONResponse(content={
        "predicted_class": predicted_class,
        "confidence":      round(confidence * 100, 2),   # percentage
        "scores":          scores,
        "message":         get_message(predicted_class),
    })


def get_message(cls: str) -> str:
    messages = {
        "Cyst":   "A cyst has been detected. Please consult a nephrologist for further evaluation.",
        "Normal": "No abnormality detected. The kidney appears healthy.",
        "Stone":  "A kidney stone has been detected. Please consult a urologist.",
        "Tumor":  "A tumor has been detected. Immediate medical consultation is strongly advised.",
    }
    return messages.get(cls, "Please consult a medical professional.")
