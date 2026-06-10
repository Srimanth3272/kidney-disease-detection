import gradio as gr
import numpy as np
import tensorflow as tf
from PIL import Image

# ── Load model ────────────────────────────────────────────────
print("Loading model...")
model = tf.keras.models.load_model("KIDNEY_STONE_CYST_TUMOR_DETECTION.h5")
print("Model loaded!")

CLASS_LABELS = ["Cyst", "Normal", "Stone", "Tumor"]
IMG_SIZE = (200, 200)

# ── Class info ────────────────────────────────────────────────
CLASS_INFO = {
    "Normal": {
        "message": "✅ No abnormality detected. The kidney appears healthy.",
        "advice": "Continue regular health checkups as recommended by your doctor."
    },
    "Cyst": {
        "message": "🔵 A kidney cyst has been detected.",
        "advice": "Cysts are usually benign. Consult a nephrologist for further evaluation."
    },
    "Stone": {
        "message": "🟡 A kidney stone has been detected.",
        "advice": "Please consult a urologist for treatment options."
    },
    "Tumor": {
        "message": "🔴 A tumor has been detected.",
        "advice": "⚠️ Immediate medical consultation is strongly advised."
    },
}

# ── Prediction function ────────────────────────────────────────
def predict(image):
    if image is None:
        return "Please upload a CT scan image.", None

    # Preprocess
    img = Image.fromarray(image).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)   # (1, 200, 200, 3)

    # Predict
    preds = model.predict(arr, verbose=0)[0]
    pred_idx   = int(np.argmax(preds))
    pred_class = CLASS_LABELS[pred_idx]
    confidence = float(preds[pred_idx]) * 100

    info = CLASS_INFO[pred_class]

    # Build result text
    result = f"""
## {info['message']}

**Detected Condition:** {pred_class}
**Confidence:** {confidence:.1f}%

**Advice:** {info['advice']}

---
### All Class Scores
"""
    for label, score in zip(CLASS_LABELS, preds):
        bar_filled = int(score * 20)
        bar = "█" * bar_filled + "░" * (20 - bar_filled)
        result += f"\n**{label}:** {bar} {score*100:.1f}%"

    result += "\n\n---\n⚠️ *This tool is for research purposes only and is not a substitute for professional medical diagnosis.*"

    # Confidence scores dict for Gradio Label component
    scores_dict = {label: float(score) for label, score in zip(CLASS_LABELS, preds)}

    return result, scores_dict


# ── Gradio UI ──────────────────────────────────────────────────
with gr.Blocks(
    title="KidneyAI — CT Scan Disease Detection",
    theme=gr.themes.Soft(primary_hue="green"),
    css="""
        .gradio-container { max-width: 800px !important; margin: auto; }
        h1 { text-align: center; color: #15803d; }
        .subtitle { text-align: center; color: #64748b; margin-bottom: 20px; }
        footer { display: none !important; }
    """
) as demo:

    gr.HTML("""
        <h1>🫁 KidneyAI — Kidney Disease Detection</h1>
        <p class="subtitle">
            Upload a kidney CT scan to detect <strong>Cyst</strong>,
            <strong>Stone</strong>, <strong>Tumor</strong>, or <strong>Normal</strong>
            using Deep Learning (CNN + Transfer Learning)
        </p>
    """)

    with gr.Row():
        with gr.Column(scale=1):
            image_input = gr.Image(
                label="Upload CT Scan Image",
                type="numpy",
                sources=["upload", "clipboard"],
                height=280,
            )
            analyze_btn = gr.Button(
                "🔍 Analyze CT Scan",
                variant="primary",
                size="lg"
            )

        with gr.Column(scale=1):
            result_text = gr.Markdown(label="Diagnosis Result")
            confidence_label = gr.Label(
                label="Confidence Scores",
                num_top_classes=4
            )

    analyze_btn.click(
        fn=predict,
        inputs=[image_input],
        outputs=[result_text, confidence_label]
    )

    gr.Examples(
        examples=[],
        inputs=image_input
    )

    gr.HTML("""
        <div style="text-align:center;margin-top:20px;padding:12px;
                    background:#fffbeb;border-radius:10px;font-size:0.85rem;color:#92400e;">
            ⚠️ <strong>Medical Disclaimer:</strong>
            This AI tool is for research and educational purposes only.
            It is not a substitute for professional medical diagnosis.
            Always consult a qualified physician.
        </div>
    """)


if __name__ == "__main__":
    demo.launch()
