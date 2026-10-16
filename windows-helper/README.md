# StoryMotion AI - Windows Local WAN 2.1 & Audio/Lip-Sync Helper

**Zero-Cost, Local-First AI Video, Dialogue, Sound Effects, and Lip-Sync Engine for Windows 11.**

This helper runs 100% locally on your computer using official open-source weights and local tools:
- **Zero API Keys & Zero Subscriptions**
- **Zero Cloud GPU Costs**
- **Zero Data Sent to Third-Party Paid Servers**
- **Full Offline Capability on Loopback (127.0.0.1:8000)**
- **No Administrator Privileges Required**

---

## Capabilities & Architecture

1. **WAN 2.1 Video Generation (Text-to-Video & Image-to-Video)**
   - Official open-source `Wan2.1-T2V-1.4B` (8GB–12GB VRAM consumer GPUs with CPU offloading)
   - Official open-source `Wan2.1-T2V-14B` & `Wan2.1-I2V-14B` (for 24GB+ workstations)

2. **Automatic Neural Dialogue & Voice Acting (TTS)**
   - **Piper TTS (ONNX)**: Extremely fast, lightweight, runs 100% on CPU (0 GB VRAM needed). High naturalness across multiple character voices.
   - **Kokoro-82M**: 82M parameter natural voice model with human-grade breathing, pacing, and emotional cadence.
   - **In-Browser Web Audio & Speech**: Instant zero-install fallback directly in any modern browser.

3. **Accurate Audio-Driven Lip Synchronization**
   - **Wav2Lip-HQ / SadTalker**: Synchronizes mouth and facial phonemes to generated character speech audio.
   - Uses character reference images or generated WAN video frames.
   - VRAM requirement: ~3.5 GB (can be run in staged pipeline after video generation).

4. **Story-Aware Sound Effects & Procedural SFX**
   - Automated timeline synchronization for footsteps, rain, thunder, wind, doors, impacts, magic, and ambient environments.
   - Royalty-free / CC0 procedural generation and zero-cost local mixing.

5. **Cinematic Background Music with Auto-Ducking**
   - Mood-matched suites (Suspense, Sadness, Adventure, Fantasy, Calm, Action).
   - Dynamic auto-ducking (volume drops by 75% during spoken dialogue so voices remain crystal clear).

6. **FFmpeg Multi-Track MP4 Assembly**
   - Bundled via `imageio[ffmpeg]` with auto-detection of system FFmpeg.
   - Multiplexes video frames, speech dialogue stem, sound effects, and ducked background music into a final broadcast-ready MP4.

---

## Hardware & System Requirements

| Component | Minimum (Basic / Audio) | Recommended (WAN 1.4B + Lip-Sync) | High-End (WAN 14B) |
|---|---|---|---|
| **OS** | Windows 10/11 (64-bit) | Windows 11 (64-bit) | Windows 11 (64-bit) |
| **GPU** | CPU Only (Audio/TTS/Mixing) | NVIDIA RTX 3060 / 4060 (8GB - 12GB VRAM) | NVIDIA RTX 3090 / 4090 (24GB VRAM) |
| **CUDA** | N/A (CPU) | CUDA 12.1 / 12.4 | CUDA 12.4 |
| **System RAM** | 8 GB RAM | 16 GB - 32 GB RAM | 32 GB - 64 GB RAM |
| **Disk Space** | 2 GB free SSD | 15 GB free SSD | 45 GB free SSD |

---

## VRAM Staging for 8GB – 12GB Consumer GPUs

Consumer graphics cards (such as RTX 3060 12GB or RTX 4060 8GB) have limited VRAM. To avoid Out-of-Memory (CUDA OOM) crashes when combining video models and lip-sync models, StoryMotion AI uses a **Staged Pipeline**:

1. **Stage 1 (Video)**: Load WAN 2.1 model into VRAM $\rightarrow$ render scene shots $\rightarrow$ save raw video.
2. **Stage 2 (Offload)**: Click **"Stop Engine (Free VRAM)"** or use automatic staging to release the 6GB–10GB VRAM.
3. **Stage 3 (Dialogue & Audio)**: Synthesize character dialogue using Piper TTS (CPU) or Kokoro-82M.
4. **Stage 4 (Lip-Sync)**: Load Wav2Lip into freed VRAM (takes ~3.5GB) $\rightarrow$ align character mouth phonemes with speech.
5. **Stage 5 (Mix & Export)**: FFmpeg muxes dialogue, sound effects, and ducked music with zero VRAM into final MP4.

---

## Installation (3 Simple Steps)

### Step 1: Install Python (Free)
1. Download Python 3.10 or 3.11 from [python.org](https://www.python.org/downloads/).
2. During installation, make sure to check the box **"Add python.exe to PATH"**.

### Step 2: Run `install.bat`
1. Double-click `install.bat` in this folder.
2. The installer will automatically:
   - Create an isolated virtual environment (`venv`).
   - Install PyTorch with NVIDIA CUDA 12.4 acceleration.
   - Install Diffusers, Hugging Face Hub, FastAPI, and Uvicorn.
   - Install SoundFile, NumPy, SciPy, and FFmpeg via ImageIO.
   - Check local GPU name, VRAM, and verify loopback pairing.

### Step 3: Run `start.bat`
1. Double-click `start.bat` to launch your helper on `http://127.0.0.1:8000`.
2. Return to the StoryMotion AI web studio and click the **Local Engine** or **Audio & Lip-Sync** tab.
3. The web studio automatically pairs securely over loopback!

---

## Model Selection & Storage Locations

All weights are downloaded into isolated local folders inside `windows-helper/models/`:

- **WAN 2.1 1.4B**: `models/wan-2.1-t2v-1.4b` (~3.6 GB, Apache 2.0 / Wan License)
- **Wav2Lip-HQ**: `models/audio/wav2lip-hq` (~435 MB, Open-Source)
- **Piper TTS**: `models/audio/piper` (~65 MB, MIT / Open License)
- **Kokoro-82M**: `models/audio/kokoro` (~310 MB, Apache 2.0)

---

## Security, Privacy & Integrity

- **Loopback Only**: The helper server binds exclusively to `127.0.0.1`. It never listens on public interfaces (`0.0.0.0`) or local networks.
- **Cryptographic Pairing Token**: Protected by a 256-bit pairing token saved in `.pairing_token`. Only your local browser tab can invoke inference.
- **Zero Arbitrary Execution**: Strict API endpoint schemas with Pydantic validation prevent arbitrary command or shell execution.
- **Clean Uninstallation**: Run `uninstall.bat` to completely wipe `venv` and cached dependencies without touching your Windows Registry.
