// ── Backend API (Render) ──────────────────────────────────────
const API_URL = "https://kidney-disease-detection-t0y3.onrender.com/predict";

// ── Class metadata ────────────────────────────────────────────
const META = {
  Normal: { emoji:"✅", cls:"r-normal", color:"#16a34a", bar:"#16a34a", border:"#bbf7d0", bg:"#f0fdf4" },
  Cyst:   { emoji:"🔵", cls:"r-cyst",   color:"#2563eb", bar:"#2563eb", border:"#bfdbfe", bg:"#eff6ff" },
  Stone:  { emoji:"🟡", cls:"r-stone",  color:"#d97706", bar:"#d97706", border:"#fde68a", bg:"#fffbeb" },
  Tumor:  { emoji:"🔴", cls:"r-tumor",  color:"#dc2626", bar:"#dc2626", border:"#fecaca", bg:"#fef2f2" },
};
const ORDER = ["Normal","Cyst","Stone","Tumor"];

// ── DOM refs ──────────────────────────────────────────────────
const dropZone    = document.getElementById("drop-zone");
const dropDefault = document.getElementById("drop-default");
const dropPreview = document.getElementById("drop-preview");
const previewImg  = document.getElementById("preview-img");
const fileInput   = document.getElementById("file-input");
const removeBtn   = document.getElementById("remove-btn");
const analyzeBtn  = document.getElementById("analyze-btn");
const analyzeText = document.getElementById("analyze-text");
const btnIcon     = document.getElementById("btn-icon");
const btnSpinner  = document.getElementById("btn-spinner");

const resultCard    = document.getElementById("result-card");
const resultHeader  = document.getElementById("result-header");
const resultIconBox = document.getElementById("result-icon-box");
const resultIcon    = document.getElementById("result-icon");
const resultClass   = document.getElementById("result-class");
const confValue     = document.getElementById("conf-value");
const resultMsgBox  = document.getElementById("result-msg-box");
const resultMsg     = document.getElementById("result-msg");
const scoresGrid    = document.getElementById("scores-grid");
const resetBtn      = document.getElementById("reset-btn");

let selectedFile = null;

// ── Upload / Preview ──────────────────────────────────────────

dropZone.addEventListener("click", () => { if (!selectedFile) fileInput.click(); });
dropZone.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !selectedFile) { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
});

// Drag & drop
dropZone.addEventListener("dragover",  (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

removeBtn.addEventListener("click", (e) => { e.stopPropagation(); clearFile(); });

function handleFile(file) {
  const allowed = ["image/jpeg","image/jpg","image/png","image/bmp","image/tiff"];
  if (!allowed.includes(file.type)) {
    alert("Please upload a JPG, PNG, BMP, or TIFF image.");
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    dropDefault.style.display = "none";
    dropPreview.style.display = "flex";
  };
  reader.readAsDataURL(file);

  analyzeBtn.disabled     = false;
  analyzeText.textContent = "Analyze Image";
  resultCard.style.display = "none";
}

function clearFile() {
  selectedFile = null;
  fileInput.value = "";
  previewImg.src = "";
  dropPreview.style.display  = "none";
  dropDefault.style.display  = "flex";
  analyzeBtn.disabled        = true;
  analyzeText.textContent    = "Select an image to begin";
  resultCard.style.display   = "none";
}

// ── Analyse ───────────────────────────────────────────────────

analyzeBtn.addEventListener("click", runAnalysis);

async function runAnalysis() {
  if (!selectedFile) return;
  setLoading(true);

  const form = new FormData();
  form.append("file", selectedFile);

  try {
    const res = await fetch(API_URL, { method:"POST", body: form });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || `Server error: ${res.status}`);
    }
    const data = await res.json();
    renderResult(data);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  analyzeBtn.disabled       = on;
  analyzeText.textContent   = on ? "Analysing…" : "Analyze Image";
  btnIcon.style.display     = on ? "none" : "block";
  btnSpinner.style.display  = on ? "block" : "none";
}

// ── Render result ─────────────────────────────────────────────

function renderResult(data) {
  const cls    = data.predicted_class;
  const conf   = data.confidence;      // 0–100
  const scores = data.scores;
  const msg    = data.message;
  const m      = META[cls] || META.Normal;

  // Icon + class name + colours
  resultIcon.textContent  = m.emoji;
  resultIconBox.style.background   = m.bg;
  resultIconBox.style.borderColor  = m.border;
  resultClass.textContent = cls;
  resultClass.className   = `result-class ${m.cls}`;
  confValue.textContent   = `${Math.round(conf)}%`;
  confValue.style.color   = m.color;

  // Message
  resultMsg.textContent           = msg;
  resultMsgBox.style.borderLeftColor = m.color;
  resultMsgBox.style.background      = m.bg;
  resultMsgBox.style.borderColor     = m.border;
  resultMsgBox.style.borderLeftColor = m.color;

  // Score bars
  scoresGrid.innerHTML = "";
  ORDER.forEach((label) => {
    const val = ((scores[label] ?? 0) * 100);
    const pm  = META[label];
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `
      <span class="score-name" style="color:${pm.color}">${label}</span>
      <div class="score-track">
        <div class="score-fill" data-w="${val.toFixed(1)}" style="background:${pm.bar}"></div>
      </div>
      <span class="score-pct">${val.toFixed(1)}%</span>`;
    scoresGrid.appendChild(row);
  });

  // Animate bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll(".score-fill").forEach(b => {
        b.style.width = `${b.dataset.w}%`;
      });
    }, 80);
  });

  resultCard.style.display = "block";
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Reset ─────────────────────────────────────────────────────

resetBtn.addEventListener("click", () => {
  clearFile();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Error helper ──────────────────────────────────────────────

function showError(msg) {
  resultCard.style.display = "block";
  resultCard.innerHTML = `
    <div class="error-box">
      <strong>⚠️ Analysis Failed</strong>
      ${msg}<br/><br/>
      💡 <em>The free Render server may be sleeping (first request takes ~30 sec). Please wait and try again.</em>
    </div>`;
  resultCard.scrollIntoView({ behavior:"smooth" });
}
