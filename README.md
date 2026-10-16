# StoryMotion AI — Zero-Cost Local WAN 2.1 Video Generation & Story Studio

**StoryMotion AI** is a local-first, zero-cost AI video generation and storyboard-planning studio with strict character consistency, sequential scene direction, a dedicated Fight Scene Planner, user-selectable video quality (480p, 720p HD, 1080p Full HD), and a local NVIDIA GPU inference pipeline.

> **Zero-Cost & Local-First Guarantee**: 100% free of paid APIs, cloud GPU subscriptions, credit cards, or hidden fees. All video rendering executes directly on your own NVIDIA GPU using open-source WAN 2.1 weights and the local Windows helper.

---

## Architecture & Hosting Model

```
┌───────────────────────────────────────────────────────────────────┐
│                      FRONTEND WEB APPLICATION                     │
│  Hosted on GitHub Pages: https://<username>.github.io/storymontionai/ │
│                                                                   │
│  • Story planning & sequential scene direction                    │
│  • Fight Scene Planner (DeepSeek-R1 / NVIDIA Nemotron models)     │
│  • Cinematic transition studio (Hard Cut, Dissolve, Wipe, etc.)   │
│  • Multi-track audio mixer (dialogue, SFX, background music)      │
│  • Quality Selector: 480p, 720p (Native WAN), 1080p (Upscaled)    │
│  • Client-side offline fallback engine & project storage          │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  │ (Private Network Access / Loopback)
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│             LOCAL WINDOWS HELPER (On Your Windows PC)             │
│  Runs locally at http://127.0.0.1:8000 with NVIDIA CUDA GPU       │
│                                                                   │
│  • 100% Zero-cost local execution on your own hardware            │
│  • Real WAN 2.1 Diffusers pipeline with CPU offload               │
│  • High-fidelity Lanczos 1080p upscaler via local FFmpeg          │
│  • Local LLM inference (DeepSeek-R1-Distill-Qwen-1.5B / Nemotron) │
│  • Multi-track FFmpeg MP4 audio and video movie assembly          │
│  • Automatic ffprobe dimension and playback verification          │
└───────────────────────────────────────────────────────────────────┘
```

### GitHub Pages vs. Local Helper Responsibilities

| Component | GitHub Pages (`storymontionai`) | Local Windows Helper (`127.0.0.1:8000`) |
|---|---|---|
| **Hosting Type** | Static Web Hosting (HTML/CSS/JS) | Native Windows Python Service (`FastAPI` + `PyTorch`) |
| **Capabilities** | Story planning, UI, timeline, scene editing, audio cue design, project import/export, client choreography | Real GPU video diffusion (WAN 2.1), model downloads, FFmpeg video assembly & upscaling, local neural inference |
| **Limitations** | **Cannot run Python servers, execute GPU diffusion, or store gigabyte model weights** | Requires physical Windows PC with NVIDIA GPU |
| **Privacy** | Zero private credentials or keys committed to GitHub | All videos, audio files, and model checkpoints remain 100% private on local disk |

---

## Key Features

### 1. Fight Scene Planner (Zero-Cost Local AI)
- **Cinematic Choreography**: Plans multi-shot, non-graphic combat sequences (Martial Arts, Cyberpunk Augmented, Swashbuckling, Medieval Duels, etc.).
- **Local Model Support**: Designed for free, open-weight models:
  - `DeepSeek-R1-Distill-Qwen-1.5B` (MIT License, ~2GB VRAM or CPU friendly)
  - `NVIDIA Nemotron-Nano-4B-Instruct` (NVIDIA Open Model License / Apache 2.0, ~3.5GB VRAM)
- **Continuity Anchors**: Automatically inserts character names, physical descriptions, attire, weaponry, and environment landmarks into every shot's visual prompt to ensure WAN diffusion consistency across angles.
- **Direct Pipeline Handoff**: Converts fight choreography beats directly into sequential storyboard scenes with sound effects, dialogue cues, and camera directions ready for WAN video generation.
- **Honest Status Reporting**: Never fakes local neural execution. If local weights are not installed on disk, the UI provides clear instructions and downloads without breaking the storyboard workflow.

### 2. User-Selectable Video Quality & Resolution
- **User-Controlled Output Options**:
  - **480p (854 × 480 landscape / 480 × 854 portrait)**: Lower resource requirement (~6GB VRAM), rapid iteration.
  - **720p HD (1280 × 720 landscape / 720 × 1280 portrait)**: **Default**. Native WAN 2.1 diffusion resolution, sharp details (~8GB-12GB VRAM).
  - **1080p Full HD (1920 × 1080 landscape / 1080 × 1920 portrait)**: Native 720p diffusion + high-fidelity local Lanczos upscaling with unsharp filter via FFmpeg.
- **Honest Differentiation**: Clearly labels native generation vs. upscaled output in the UI.
- **Actual Dimension Verification**: The local helper inspects assembled MP4 files with `ffprobe` to verify real output dimensions (`1920x1080`, `1280x720`, `854x480`) before confirming completion.

### 3. Cinematic Transitions
- Full support for transitions between scenes: **Hard Cut (0s)**, **Cross Dissolve (0.2s–3.0s)**, **Fade to Black (0.3s–3.0s)**, **Fade to White (0.2s–2.0s)**, **Wipe Left**, **Wipe Right**, **Whip Pan**, and **Zoom / Push**.
- Visual connector badges between scene cards and one-click "Apply to All Shots" action.

### 4. Audio & Lip-Sync Studio
- Multi-track timeline for spoken dialogue, voice profiles, sound effects (SFX), and adaptive background music moods.
- In-browser Web Audio preview and local FFmpeg master mixdown.

---

## Local Development & Setup

### Prerequisites
- Node.js 18+ or 20+
- npm (or bun)

### 1. Clone & Install
```bash
git clone https://github.com/<your-username>/storymontionai.git
cd storymontionai
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
The dev server starts on `http://localhost:3000` (or `http://localhost:8080`).

### 3. Run Automated Tests
```bash
npm test
```
Runs both the Fight Scene Planner test suite (70 tests) and the Audio Pipeline verification test suite.

### 4. Build for Production
```bash
# Standard build (relative base)
npm run build

# Build specifically for GitHub Pages under /storymontionai/
npm run build:gh-pages
```
Output files are written cleanly to `./dist`.

---

## GitHub Pages Deployment

The repository is configured for automated deployment to GitHub Pages via GitHub Actions.

### Deployment Steps:
1. Push this repository to GitHub under the name **`storymontionai`**.
2. On GitHub, navigate to:
   - **Repository Settings** ➔ **Pages**
   - Under **Build and deployment**:
     - **Source**: Select **GitHub Actions**
3. The included workflow `.github/workflows/deploy.yml` will automatically:
   - Install dependencies with lockfile verification.
   - Run linter and verification test suites.
   - Build the static frontend with `--base=/storymontionai/`.
   - Publish the artifact to GitHub Pages.
4. Your site will be live at:
   ```
   https://<your-username>.github.io/storymontionai/
   ```

---

## Windows Helper Guide (Local GPU Inference)

To generate actual videos using your own NVIDIA GPU with zero cloud costs:

1. Open the `windows-helper/` directory on your Windows 11 PC.
2. Double-click **`install.bat`** (creates `venv`, installs PyTorch with CUDA 12.4 and Diffusers).
3. Double-click **`start.bat`** to start the local helper service on `http://127.0.0.1:8000`.
4. In the StoryMotion AI web app, navigate to the **Local Engine** tab:
   - Click **Check Engine Status**.
   - Download the free open-source `Wan2.1-T2V-1.4B` model weights (~3.6 GB).
   - Click **Start Engine** and test video generation.
5. All shots rendered in the web app are processed directly on your GPU and saved locally.

---

## Repository Hygiene & Security
- **No Private Keys in Frontend**: Client code never requires or stores cloud API keys.
- **Weights Excluded from Git**: `.gitignore` strictly ignores `.safetensors`, `.pt`, `.onnx`, `.bin`, `.gguf`, and `.mp4` video outputs.
- **Loopback-Only Binding**: The helper server binds strictly to `127.0.0.1:8000` with CORS restricted to local origins and deployed project URLs.
