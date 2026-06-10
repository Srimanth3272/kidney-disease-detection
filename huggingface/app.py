import gradio as gr
import numpy as np
import tensorflow as tf
from PIL import Image

# ── Load model ────────────────────────────────────────────────
import os
import urllib.request

MODEL_PATH = "KIDNEY_STONE_CYST_TUMOR_DETECTION.h5"
MODEL_URL = "https://raw.githubusercontent.com/Srimanth3272/kidney-disease-detection/main/KIDNEY_STONE_CYST_TUMOR_DETECTION.h5"

if not os.path.exists(MODEL_PATH) or os.path.getsize(MODEL_PATH) < 1000000:
    print("Downloading model from GitHub...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Download complete!")

print("Loading model...")
try:
    model = tf.keras.models.load_model(
        MODEL_PATH,
        compile=False
    )
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    raise

CLASS_LABELS = ["Cyst", "Normal", "Stone", "Tumor"]
IMG_SIZE = (200, 200)

CLASS_INFO = {
    "Normal": {
        "message": "✅ No abnormality detected. The kidney appears healthy.",
        "advice":  "Continue regular health checkups as recommended by your doctor."
    },
    "Cyst": {
        "message": "🔵 A kidney cyst has been detected.",
        "advice":  "Cysts are usually benign. Consult a nephrologist for further evaluation."
    },
    "Stone": {
        "message": "🟡 A kidney stone has been detected.",
        "advice":  "Please consult a urologist for treatment options."
    },
    "Tumor": {
        "message": "🔴 A tumor has been detected.",
        "advice":  "⚠️ Immediate medical consultation is strongly advised."
    },
}

# ── Prediction ────────────────────────────────────────────────
def predict(image):
    if image is None:
        return "Please upload a CT scan image.", None

    img = Image.fromarray(image).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)

    preds      = model.predict(arr, verbose=0)[0]
    pred_idx   = int(np.argmax(preds))
    pred_class = CLASS_LABELS[pred_idx]
    confidence = float(preds[pred_idx]) * 100

    info = CLASS_INFO[pred_class]

    result = f"""## {info['message']}

**Detected Condition:** {pred_class}  
**Confidence:** {confidence:.1f}%

**Medical Advice:** {info['advice']}

---
### All Class Scores
"""
    for label, score in zip(CLASS_LABELS, preds):
        filled = int(score * 20)
        bar    = "█" * filled + "░" * (20 - filled)
        result += f"\n**{label}:** `{bar}` {score*100:.1f}%"

    result += "\n\n---\n⚠️ *Research purposes only — not a substitute for professional medical diagnosis.*"

    scores_dict = {label: float(score) for label, score in zip(CLASS_LABELS, preds)}
    return result, scores_dict


# ── Gradio UI ─────────────────────────────────────────────────
with gr.Blocks(
    title="KidneyAI — CT Scan Disease Detection",
    theme=gr.themes.Soft(primary_hue="green"),
) as demo:

    gr.HTML("""
        <div style="text-align:center;padding:20px 0 10px;">
            <h1 style="color:#15803d;font-size:2rem;font-weight:800;">
                🫁 KidneyAI — Kidney Disease Detection
            </h1>
            <p style="color:#64748b;font-size:1rem;max-width:560px;margin:10px auto 0;">
                Upload a kidney CT scan to detect
                <strong>Cyst</strong>, <strong>Stone</strong>,
                <strong>Tumor</strong>, or <strong>Normal</strong>
                using Deep Learning (CNN + Transfer Learning).
            </p>
        </div>
    """)

    with gr.Row():
        with gr.Column(scale=1):
            image_input = gr.Image(
                label="📷 Upload CT Scan Image",
                type="numpy",
                height=280,
            )
            analyze_btn = gr.Button(
                "🔍 Analyze CT Scan",
                variant="primary",
                size="lg"
            )

        with gr.Column(scale=1):
            result_md = gr.Markdown(label="Diagnosis Result")
            conf_label = gr.Label(
                label="📊 Confidence Scores",
                num_top_classes=4,
            )

    analyze_btn.click(
        fn=predict,
        inputs=[image_input],
        outputs=[result_md, conf_label],
    )

    gr.HTML("""
        <div style="margin-top:20px;padding:14px 18px;background:#fffbeb;
                    border:1px solid #fde68a;border-radius:10px;
                    font-size:0.85rem;color:#92400e;text-align:center;">
            ⚠️ <strong>Medical Disclaimer:</strong>
            This AI tool is for research and educational purposes only.
            It is not a substitute for professional medical diagnosis.
            Always consult a qualified physician.
        </div>
    """)

if __name__ == "__main__":
    demo.launch()
