# StoryMotion AI - Windows Local WAN 2.1 Helper

**Zero-Cost, Local-First AI Video Generation on Your Own NVIDIA GPU.**

This helper runs 100% locally on your computer with official open-source WAN 2.1 weights.
- **Zero API Keys**
- **Zero Cloud GPU Costs**
- **Zero Subscriptions**
- **No Administrator Privileges Required**

---

## System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10/11 (64-bit) | Windows 11 (64-bit) |
| **GPU** | NVIDIA GPU with 8 GB VRAM (e.g. RTX 3060, RTX 4060) | NVIDIA GPU with 12 GB - 24 GB VRAM (RTX 3060 12GB, RTX 4070, RTX 3090, RTX 4090) |
| **Python** | Python 3.10 or 3.11 | Python 3.10 or 3.11 |
| **Disk Space** | 10 GB free SSD space | 35 GB free SSD space (if using 14B model) |

---

## Installation (3 Simple Steps)

### Step 1: Install Python (Free)
1. Download Python 3.10 or 3.11 from [python.org](https://www.python.org/downloads/).
2. During installation, **make sure to check the box "Add python.exe to PATH"**.

### Step 2: Run `install.bat`
1. Double-click `install.bat` in this folder.
2. The installer will automatically:
   - Create an isolated virtual environment (`venv`).
   - Install PyTorch with NVIDIA CUDA 12.4 acceleration.
   - Install Diffusers, FastAPI, and Hugging Face dependencies.
   - Detect your local GPU name and VRAM.

### Step 3: Run `start.bat`
1. Double-click `start.bat` to launch your helper on `http://127.0.0.1:8000`.
2. Return to the StoryMotion AI web studio and go to the **Local Engine** page.
3. Your web studio will automatically detect the local helper!

---

## Model Selection

* **Wan2.1-T2V-1.4B (Recommended)**:
  - Official repo: `Wan-AI/Wan2.1-T2V-1.4B-Diffusers`
  - Download size: ~3.6 GB
  - VRAM required: 8 GB – 12 GB (with CPU offload)
* **Wan2.1-T2V-14B**:
  - Official repo: `Wan-AI/Wan2.1-T2V-14B-Diffusers`
  - Download size: ~28.5 GB
  - VRAM required: 22 GB – 24 GB+
* **Wan2.1-I2V-14B (480P)**:
  - Official repo: `Wan-AI/Wan2.1-I2V-14B-480P-Diffusers`
  - Image-to-Video for consistent character keyframes

---

## Security & Privacy
- **Loopback Only**: The helper binds strictly to `127.0.0.1`. It does not expose ports to the public internet or your local network.
- **Pairing Token**: Protected by a unique local cryptographic token generated in `.pairing_token`.
- **CORS Protection**: Origin validation ensures only your StoryMotion AI studio can communicate with the helper.
- **No Command Execution**: The helper cannot execute arbitrary shell commands.

---

## Clean Uninstallation
Run `uninstall.bat` to completely remove the virtual environment and cached dependencies.
No registry modifications or system files are touched.
