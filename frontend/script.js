/* ─── KidneyAI — script.js ──────────────────────────────────────────────── */

// ══════════════════════════════════════════════════════════════════════════
// 🔧 Backend URL — Render deployment
// ══════════════════════════════════════════════════════════════════════════
const API_URL = "https://kidney-disease-detection-t0y3.onrender.com/predict";

// ── Class metadata ─────────────────────────────────────────────────────
const META = {
  Normal: { emoji: "✅", cssClass: "cls-normal", color: "#34d399", bar: "linear-gradient(90deg,#34d399,#059669)" },
  Cyst:   { emoji: "🔵", cssClass: "cls-cyst",   color: "#60a5fa", bar: "linear-gradient(90deg,#60a5fa,#3b82f6)" },
  Stone:  { emoji: "🟡", cssClass: "cls-stone",  color: "#fbbf24", bar: "linear-gradient(90deg,#fbbf24,#d97706)" },
  Tumor:  { emoji: "🔴", cssClass: "cls-tumor",  color: "#f87171", bar: "linear-gradient(90deg,#f87171,#ef4444)" },
};
const CLASS_ORDER = ["Normal", "Cyst", "Stone", "Tumor"];

// ── DOM refs ───────────────────────────────────────────────────────────
const dropZone      = document.getElementById("drop-zone");
const dropInner     = document.getElementById("drop-inner");
const previewOvl    = document.getElementById("preview-overlay");
const previewImg    = document.getElementById("preview-img");
const fileInput     = document.getElementById("file-input");
const browseBtn     = document.getElementById("browse-btn");
const removeBtn     = document.getElementById("remove-btn");
const analyzeBtn    = document.getElementById("analyze-btn");
const analyzeText   = document.getElementById("analyze-text");
const btnSpinner    = document.getElementById("btn-spinner");
const resultSection = document.getElementById("result-section");
const resultEmoji   = document.getElementById("result-emoji");
const resultClass   = document.getElementById("result-class");
const resultMsg     = document.getElementById("result-msg");
const confPct       = document.getElementById("conf-pct");
const ringFill      = document.getElementById("ring-fill");
const scoresGrid    = document.getElementById("scores-grid");
const resetBtn      = document.getElementById("reset-btn");

let selectedFile = null;

// ══════════════════════════════════════════════════════════════════════════
// Upload / Preview
// ══════════════════════════════════════════════════════════════════════════

browseBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener("click", () => { if (!selectedFile) fileInput.click(); });
dropZone.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !selectedFile) { e.preventDefault(); fileInput.click(); }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
});

// Drag & drop
dropZone.addEventListener("dragover",  (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", ()  => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

removeBtn.addEventListener("click", (e) => { e.stopPropagation(); clearFile(); });

function handleFile(file) {
  const allowed = ["image/jpeg","image/jpg","image/png","image/bmp","image/tiff"];
  if (!allowed.includes(file.type)) {
    showError("Please upload a valid image file (JPG, PNG, BMP, or TIFF).");
    return;
  }
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src     = e.target.result;
    dropInner.style.display  = "none";
    previewOvl.style.display = "flex";
  };
  reader.readAsDataURL(file);

  analyzeBtn.disabled     = false;
  analyzeText.textContent = "Analyse CT Scan";
  resultSection.style.display = "none";
}

function clearFile() {
  selectedFile              = null;
  fileInput.value           = "";
  previewImg.src            = "";
  previewOvl.style.display  = "none";
  dropInner.style.display   = "flex";
  analyzeBtn.disabled       = true;
  analyzeText.textContent   = "Select an image first";
  resultSection.style.display = "none";
}

// ══════════════════════════════════════════════════════════════════════════
// Analyse
// ══════════════════════════════════════════════════════════════════════════

analyzeBtn.addEventListener("click", runAnalysis);

async function runAnalysis() {
  if (!selectedFile) return;
  setLoading(true);

  const form = new FormData();
  form.append("file", selectedFile);

  try {
    const res = await fetch(API_URL, { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${res.status}`);
    }
    const data = await res.json();
    renderResult(data);
  } catch (err) {
    showError(`Analysis failed: ${err.message}<br/><br/>
      💡 <strong>Tip:</strong> The free Render backend may be sleeping.
      Wait 30 seconds and try again.`);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  analyzeBtn.disabled       = on;
  analyzeText.textContent   = on ? "Analysing…" : "Analyse CT Scan";
  btnSpinner.style.display  = on ? "block" : "none";
}

// ══════════════════════════════════════════════════════════════════════════
// Render result
// ══════════════════════════════════════════════════════════════════════════

function renderResult(data) {
  const cls  = data.predicted_class;
  const conf = data.confidence;     // 0–100
  const scores = data.scores;
  const msg  = data.message;
  const m    = META[cls] || META.Normal;

  // Emoji + class
  resultEmoji.textContent = m.emoji;
  resultClass.textContent = cls;
  resultClass.className   = `result-class ${m.cssClass}`;

  // Message + border colour
  resultMsg.textContent        = msg;
  resultMsg.style.borderLeftColor = m.color;

  // Ring
  const pct    = Math.round(conf);
  const offset = 213.63 - (conf / 100) * 213.63;
  confPct.textContent           = `${pct}%`;
  ringFill.style.stroke         = m.color;
  setTimeout(() => { ringFill.style.strokeDashoffset = offset; }, 60);

  // Score bars
  scoresGrid.innerHTML = "";
  CLASS_ORDER.forEach((label) => {
    const val  = (scores[label] ?? 0) * 100;
    const pm   = META[label];
    const row  = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `
      <span class="score-name" style="color:${pm.color}">${label}</span>
      <div class="score-track">
        <div class="score-fill" data-w="${val.toFixed(1)}" style="background:${pm.bar}"></div>
      </div>
      <span class="score-pct">${val.toFixed(1)}%</span>`;
    scoresGrid.appendChild(row);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll(".score-fill").forEach(b => {
        b.style.width = `${b.dataset.w}%`;
      });
    }, 80);
  });

  resultSection.style.display = "block";
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ══════════════════════════════════════════════════════════════════════════
// Reset
// ══════════════════════════════════════════════════════════════════════════

resetBtn.addEventListener("click", () => {
  clearFile();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ══════════════════════════════════════════════════════════════════════════
// Error helper
// ══════════════════════════════════════════════════════════════════════════

function showError(html) {
  resultSection.style.display = "block";
  resultSection.innerHTML = `<div class="error-box">⚠️ ${html}</div>`;
  resultSection.scrollIntoView({ behavior: "smooth" });
}
