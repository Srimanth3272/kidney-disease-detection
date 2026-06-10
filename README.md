# 🫁 Kidney Disease Detection — Full Stack Deployment Guide

An AI-powered web app that classifies kidney CT scans into **Cyst, Normal, Stone, or Tumor** using a trained CNN/Transfer Learning model.

---

## 📁 Project Structure

```
kidnry disease detection/
│
├── KIDNEY_STONE_CYST_TUMOR_DETECTION.h5   ← your trained model (root)
├── KIDNEY_STONE_CYST_TUMOR_DETECTION.ipynb
│
├── backend/                               ← Python FastAPI (deploy to Render)
│   ├── main.py
│   ├── requirements.txt
│   ├── runtime.txt
│   ├── render.yaml
│   └── model/
│       └── KIDNEY_STONE_CYST_TUMOR_DETECTION.h5   ← COPY .h5 HERE
│
└── frontend/                              ← HTML/CSS/JS (deploy to Vercel)
    ├── index.html
    ├── style.css
    ├── script.js
    └── vercel.json
```

---

## 🚀 Deployment Steps

### Step 1 — Copy model file into backend/model/

```
Copy:  KIDNEY_STONE_CYST_TUMOR_DETECTION.h5
  To:  backend/model/KIDNEY_STONE_CYST_TUMOR_DETECTION.h5
```

### Step 2 — Push to GitHub

1. Create a **free** GitHub account at https://github.com
2. Create a **new repository** (e.g., `kidney-disease-detection`)
3. Open PowerShell in your project folder and run:

```powershell
git init
git add .
git commit -m "Initial commit — Kidney Disease Detection App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kidney-disease-detection.git
git push -u origin main
```

---

### Step 3 — Deploy Backend to Render (Free)

1. Go to https://render.com → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account → Select your repository
4. **Configure the service:**
   - **Name:** `kidney-disease-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **"Create Web Service"**
6. Wait ~5 minutes for deployment
7. **Copy your Render URL** — it looks like: `https://kidney-disease-api.onrender.com`

> ⚠️ **Important:** The free Render tier sleeps after 15 min of inactivity. First request may take ~30 seconds to wake up.

---

### Step 4 — Update API URL in Frontend

Open `frontend/script.js` and replace line 9:

```javascript
// BEFORE:
const API_URL = "https://YOUR-BACKEND-URL.onrender.com/predict";

// AFTER (use your actual Render URL):
const API_URL = "https://kidney-disease-api.onrender.com/predict";
```

Then commit and push:
```powershell
git add frontend/script.js
git commit -m "Update API URL to Render backend"
git push
```

---

### Step 5 — Deploy Frontend to Vercel

1. Go to https://vercel.com → Sign up (free, use GitHub)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. **Configure:**
   - **Root Directory:** `frontend`
   - Framework Preset: **Other** (static)
5. Click **"Deploy"**
6. ✅ Your site is live at `https://your-project.vercel.app`

---

## 🧪 Testing Locally

### Test backend locally:
```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
Then open: http://localhost:8000

Test prediction:
```powershell
curl -X POST http://localhost:8000/predict -F "file=@path/to/ct_scan.jpg"
```

### Test frontend locally:
Just open `frontend/index.html` in your browser.
> Update `API_URL` in script.js to `http://localhost:8000/predict` for local testing.

---

## 📊 Model Details

| Property | Value |
|----------|-------|
| Input Size | 200 × 200 × 3 (RGB) |
| Classes | Cyst, Normal, Stone, Tumor |
| Preprocessing | Normalize ÷ 255 |
| Framework | TensorFlow / Keras |

---

## ⚠️ Medical Disclaimer

This tool is for **research and educational purposes only**.  
It is **not** a substitute for professional medical diagnosis.  
Always consult a qualified physician for medical advice.
