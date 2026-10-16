# StoryMotion AI — Zero-Cost Local WAN 2.1 Video Generation Studio

**StoryMotion AI** is a complete, local-first, zero-cost AI video generation and storyboard-planning studio with character consistency, sequential scene direction, and a local WAN 2.1 inference pipeline.

> **Zero-Cost Policy**: 100% free of paid APIs, cloud GPU subscriptions, credit cards, or hidden fees. All video rendering executes directly on your own NVIDIA GPU using open-source WAN 2.1 weights.

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│  Client Web App (React 19 + Vite + Tailwind)  │
│  • Story planning & character consistency    │
│  • Responsive for Android phone & Windows PC │
│  • Local Engine pairing & diagnostics        │
│  • Sequential scene queue & video player     │
└──────────────┬───────────────────────────────┘
               │
               │ (Direct Browser-to-Loopback via PNA / CORS)
               ▼
┌──────────────────────────────────────────────┐
│  Windows Local Helper (FastAPI + PyTorch)   │
│  • Runs on Windows 11 laptop (127.0.0.1:8000)│
│  • Loopback binding & token pairing          │
│  • Hardware & VRAM detection                 │
│  • Official Hugging Face WAN 2.1 models      │
│  • GPU Diffusers pipeline with CPU offload   │
└──────────────────────────────────────────────┘
```

---

## Repository File Inventory (Files That Actually Exist)

| Path | Purpose |
|---|---|
| `/windows-helper/install.bat` | Automated Windows installer (creates venv, installs CUDA PyTorch & Diffusers) |
| `/windows-helper/start.bat` | One-click service launcher binding to `127.0.0.1:8000` |
| `/windows-helper/stop.bat` | One-click service stopper (releases port 8000 and VRAM) |
| `/windows-helper/uninstall.bat` | Clean uninstaller that removes venv and caches safely |
| `/windows-helper/helper_server.py` | FastAPI server for loopback communication, token auth, model downloads, and video generation |
| `/windows-helper/requirements.txt` | Python dependencies (FastAPI, Uvicorn, PyTorch, Diffusers, Accelerate, HuggingFace Hub) |
| `/windows-helper/README.md` | Dedicated Windows helper reference manual |
| `/src/components/LocalEnginePage.tsx` | Full Web UI: Check PC, Download Installer, Model Manager, Test WAN, Queue Controls, Live Logs |
| `/src/utils/localHelperClient.ts` | Direct browser-to-loopback client with pairing token, PNA support, and proxy fallback |
| `/src/server/videoEngine.ts` | Server-side video engine controller and helper proxy |
| `/scripts/local_wan_server.py` | Standalone Python WAN server alternative |
| `/scripts/run_local_wan.bat` | Standalone Windows batch launcher |
| `/scripts/run_local_wan.sh` | Standalone Linux/macOS launcher |
| `/server.ts` | Express backend with `/api/download/windows-helper` dynamic zip bundling |
| `/src/App.tsx` | Main studio controller with mobile responsive tabs and queue execution |
| `/src/components/` | Navbar, MobileBottomNav, SceneList, CharacterConsistencyManager, VideoPreviewArea, ProjectsLibrary |

---

## Windows 11 Setup & Testing Guide (For Your Brother)

Follow these exact steps on your Windows 11 laptop equipped with an NVIDIA GPU (e.g. RTX 3060, RTX 4060, or higher):

### Step 1: Install Free Python 3.10 or 3.11
1. Download Python from the official site: [python.org/downloads](https://www.python.org/downloads/)
2. Run the installer. **CRITICAL:** Check the box at the bottom: **`☑ Add python.exe to PATH`** before clicking "Install Now".

### Step 2: Obtain the Windows Helper
Either:
- Click **"Download Windows Helper (.zip)"** directly from the **Local Engine** tab in StoryMotion AI.
- Or download/clone the `windows-helper/` folder from this GitHub repository.

### Step 3: Run `install.bat`
1. Open the `windows-helper` folder.
2. Double-click `install.bat`.
3. The script will:
   - Check your Python version.
   - Detect your NVIDIA GPU name and total VRAM via `nvidia-smi`.
   - Create an isolated virtual environment (`venv\`).
   - Install PyTorch with NVIDIA CUDA 12.4 acceleration.
   - Install Diffusers, Hugging Face Hub, FastAPI, and Uvicorn.
   - Generate a local pairing token in `.pairing_token`.
4. Press any key when installation finishes.

### Step 4: Run `start.bat`
1. Double-click `start.bat`.
2. A command prompt window will open showing:
   ```
   ======================================================================
     StoryMotion AI - Local Windows WAN 2.1 Helper
   ======================================================================
     Loopback URL:  http://127.0.0.1:8000
     Device Name:   NVIDIA GeForce RTX ...
     Total VRAM:    ... GB (Free: ... GB)
     Pairing Token: [16-character token displayed here]
   ======================================================================
   ```
3. Keep this window open while using StoryMotion AI.

### Step 5: Connect and Generate Real Videos
1. In the web app, navigate to the **Local Engine** tab.
2. Click **"Check Engine Status"** (or paste your pairing token if prompted).
3. Under **Download Compatible Model**, select **Wan2.1-T2V-1.4B (Recommended)** and click **Download Model Weights**.
   - Download is ~3.6 GB directly from official Hugging Face repository `Wan-AI/Wan2.1-T2V-1.4B-Diffusers`.
4. Click **"Start Engine"** to load the model into your GPU with automatic CPU offload.
5. Click **"Test WAN Engine (1s)"** to verify that your GPU produces an actual MP4 video clip.
6. Once verified, return to **Studio** and click **"Render Shot"** on any scene!

---

## Release & Deployment Checklist

### Website Deployment
- [x] Responsive layout tested for Android smartphones and Windows desktop displays.
- [x] Storyboard writer, scene duration controls, character consistency manager, and project save/load fully functional offline.
- [x] `compile_applet` build succeeded (`npm run build`).
- [x] `lint_applet` passed (`tsc --noEmit`) with zero errors.
- [x] Dynamic helper packaging enabled (`GET /api/download/windows-helper` produces `storymotion-windows-helper.zip`).
- [x] Private Network Access (PNA) and CORS headers configured on helper for deployed web origin pairing.

### Windows Testing Status (Honest Verification State)

| Component | Status | Details |
|---|---|---|
| **Website & UI** | ✅ Fully Implemented & Tested | Responsive design, tabs, project storage, scene editor, prompt generator. |
| **Local Engine Web Page** | ✅ Fully Implemented & Tested | Hardware diagnostics, model manager, pairing form, queue progress, log viewer. |
| **Windows Helper Code** | ✅ Fully Implemented (Untested on Windows) | Written in Python/FastAPI. Requires Windows machine with Python to test execution. |
| **Batch Scripts (`install.bat`, `start.bat`)** | ✅ Fully Implemented (Untested on Windows) | Written for Windows cmd/batch. Requires testing on Windows 11. |
| **Model Weight Inference** | ⏳ Awaiting Hardware Run | Depends on physical NVIDIA GPU and downloaded weights from Hugging Face. |

---

## Security & Local Communication Standards
- **Loopback Binding**: The helper binds strictly to `127.0.0.1:8000`. It is never exposed to the public internet.
- **Pairing Token**: Protected by a 16-byte cryptographic secret stored in `.pairing_token`.
- **No Arbitrary Commands**: The helper exposes explicit, parameter-validated endpoints (`/api/models/download`, `/api/engine/start`, `/api/video/generate`). It does not accept or execute arbitrary shell commands.
- **Zero Paid APIs**: Absolutely no OpenAI, Runway, Luma, Replicate, or other billing APIs are configured or required.
