/* ─────────────────────────────────────────────────────────────────────────────
   KidneyAI — script.js
   Handles: drag-drop upload, image preview, API call, result rendering
   ───────────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION — Replace with your Render backend URL after deployment
// ══════════════════════════════════════════════════════════════════════════════
const API_URL = "https://kidney-disease-detection-t0y3.onrender.com/predict";
// Example: const API_URL = "https://kidney-disease-api.onrender.com/predict";

// ── Class styling metadata ─────────────────────────────────────────────────
const CLASS_META = {
  Normal: { icon: "✅", color: "#34d399", barColor: "linear-gradient(90deg,#34d399,#059669)" },
  Cyst:   { icon: "🔵", color: "#60a5fa", barColor: "linear-gradient(90deg,#60a5fa,#3b82f6)" },
  Stone:  { icon: "🟡", color: "#fbbf24", barColor: "linear-gradient(90deg,#fbbf24,#d97706)" },
  Tumor:  { icon: "🔴", color: "#f87171", barColor: "linear-gradient(90deg,#f87171,#ef4444)" },
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const dropZone      = document.getElementById("drop-zone");
const dropContent   = document.getElementById("drop-zone-content");
const previewOverlay= document.getElementById("preview-overlay");
const previewImg    = document.getElementById("preview-img");
const fileInput     = document.getElementById("file-input");
const browseBtn     = document.getElementById("browse-btn");
const removeBtn     = document.getElementById("remove-btn");
const analyzeBtn    = document.getElementById("analyze-btn");
const analyzeText   = document.getElementById("analyze-text");
const btnSpinner    = document.getElementById("btn-spinner");
const resultSection = document.getElementById("result-section");
const resetBtn      = document.getElementById("reset-btn");

// Result elements
const resultIconWrap = document.getElementById("result-icon-wrap");
const resultIcon     = document.getElementById("result-icon");
const resultClass    = document.getElementById("result-class");
const resultMessage  = document.getElementById("result-message");
const confidencePct  = document.getElementById("confidence-pct");
const ringFill       = document.getElementById("ring-fill");
const scoresGrid     = document.getElementById("scores-grid");

// ── State ──────────────────────────────────────────────────────────────────
let selectedFile = null;

// ══════════════════════════════════════════════════════════════════════════════
// Upload / Preview logic
// ══════════════════════════════════════════════════════════════════════════════

browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropZone.addEventListener("click", () => {
  if (!selectedFile) fileInput.click();
});

dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (!selectedFile) fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) {
    handleFile(fileInput.files[0]);
  }
});

// Drag & drop
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

removeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  clearFile();
});

function handleFile(file) {
  // Validate type
  const allowed = ["image/jpeg", "image/png", "image/bmp", "image/tiff", "image/jpg"];
  if (!allowed.includes(file.type)) {
    showError("Please upload a valid image file (JPG, PNG, BMP, or TIFF).");
    return;
  }

  selectedFile = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    dropContent.style.display = "none";
    previewOverlay.style.display = "flex";
    previewOverlay.removeAttribute("aria-hidden");
  };
  reader.readAsDataURL(file);

  // Enable button
  analyzeBtn.disabled = false;
  analyzeBtn.setAttribute("aria-disabled", "false");
  analyzeText.textContent = "Analyse CT Scan";

  // Hide previous results
  resultSection.style.display = "none";
}

function clearFile() {
  selectedFile = null;
  fileInput.value = "";
  previewImg.src = "";
  previewOverlay.style.display = "none";
  previewOverlay.setAttribute("aria-hidden", "true");
  dropContent.style.display = "flex";
  analyzeBtn.disabled = true;
  analyzeBtn.setAttribute("aria-disabled", "true");
  analyzeText.textContent = "Select an image first";
  resultSection.style.display = "none";
}

// ══════════════════════════════════════════════════════════════════════════════
// Analyse — send to backend
// ══════════════════════════════════════════════════════════════════════════════

analyzeBtn.addEventListener("click", runAnalysis);

async function runAnalysis() {
  if (!selectedFile) return;

  // Loading state
  setLoading(true);

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${response.status}`);
    }

    const data = await response.json();
    renderResult(data);
  } catch (err) {
    showError(`Analysis failed: ${err.message}. Make sure the backend is running.`);
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  if (loading) {
    analyzeText.textContent = "Analysing…";
    btnSpinner.style.display = "block";
    analyzeBtn.disabled = true;
  } else {
    analyzeText.textContent = "Analyse CT Scan";
    btnSpinner.style.display = "none";
    analyzeBtn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Render result
// ══════════════════════════════════════════════════════════════════════════════

function renderResult(data) {
  const cls        = data.predicted_class;
  const confidence = data.confidence;   // 0–100
  const scores     = data.scores;       // { Cyst: 0.xx, Normal: 0.xx, ... }
  const message    = data.message;
  const meta       = CLASS_META[cls] || CLASS_META.Normal;

  // Icon + class name
  resultIcon.textContent = meta.icon;
  resultClass.textContent = cls;
  resultClass.className = `result-class class-${cls.toLowerCase()}`;
  resultIconWrap.style.borderColor = `${meta.color}40`;
  resultIconWrap.style.background  = `${meta.color}10`;

  // Message
  resultMessage.textContent = message;
  resultMessage.style.borderLeftColor = meta.color;

  // Confidence ring
  const circumference = 213.63; // 2π × 34
  const offset = circumference - (confidence / 100) * circumference;
  confidencePct.textContent = `${Math.round(confidence)}%`;

  // Inject SVG gradient + animate ring
  setTimeout(() => {
    ringFill.style.strokeDashoffset = offset;
  }, 50);

  // Ensure gradient def exists in SVG
  const svgEl = document.querySelector(".confidence-ring");
  if (!svgEl.querySelector("#ring-gradient")) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${meta.color}"/>
        <stop offset="100%" stop-color="#c084fc"/>
      </linearGradient>`;
    svgEl.appendChild(defs);
  } else {
    // Update gradient colour
    const stop0 = svgEl.querySelector("#ring-gradient stop:first-child");
    if (stop0) stop0.setAttribute("stop-color", meta.color);
  }

  // Scores bar chart
  scoresGrid.innerHTML = "";
  const orderedClasses = ["Normal", "Cyst", "Stone", "Tumor"];
  orderedClasses.forEach((label) => {
    const score = scores[label] ?? 0;
    const pct   = (score * 100).toFixed(1);
    const m     = CLASS_META[label];

    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `
      <span class="score-label" style="color:${m.color}">${label}</span>
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:0%;background:${m.barColor}" data-target="${pct}"></div>
      </div>
      <span class="score-pct">${pct}%</span>
    `;
    scoresGrid.appendChild(row);
  });

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll(".score-bar-fill").forEach((bar) => {
      bar.style.width = `${bar.dataset.target}%`;
    });
  }, 100);

  // Show result section
  resultSection.style.display = "block";
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ══════════════════════════════════════════════════════════════════════════════
// Reset
// ══════════════════════════════════════════════════════════════════════════════

resetBtn.addEventListener("click", () => {
  clearFile();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ══════════════════════════════════════════════════════════════════════════════
// Error helper
// ══════════════════════════════════════════════════════════════════════════════

function showError(msg) {
  resultSection.style.display = "block";
  resultSection.innerHTML = `<div class="card error-card">⚠️ ${msg}</div>`;
  resultSection.scrollIntoView({ behavior: "smooth" });
}
