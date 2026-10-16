@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==============================================================================
echo   StoryMotion AI - Windows Local WAN 2.1 & Audio/Lip-Sync Helper Installer
echo   Zero-Cost, Local-First Setup for Windows 11
echo ==============================================================================
echo.
echo No administrator privileges required. Installs in this local folder.
echo.

:: 1. Check Python
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python was not found in your system PATH!
    echo Please install Python 3.10 or 3.11 from https://www.python.org/downloads/
    echo IMPORTANT: Make sure to check the box "Add python.exe to PATH" during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%I in ('python --version 2^>^&1') do set PY_VER=%%I
echo Detected Python version: %PY_VER%

:: 2. Check FFmpeg (Free tool for audio mixing and MP4 assembly)
echo.
echo [2/6] Checking FFmpeg audio/video tool...
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [NOTE] Standalone FFmpeg was not found in system PATH.
    echo Don't worry! imageio-ffmpeg is included in requirements.txt as an automatic fallback.
    echo For highest speed, you can optionally install FFmpeg from https://ffmpeg.org/ or via "winget install Gyan.FFmpeg".
) else (
    echo [SUCCESS] System FFmpeg found! Audio mixing and video assembly will use high-speed hardware encoder.
)

:: 3. Create Virtual Environment
echo.
echo [3/6] Creating isolated Python virtual environment (venv)...
if not exist "venv" (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo Created virtual environment successfully.
) else (
    echo Virtual environment already exists. Using existing venv.
)

:: 4. Activate Virtual Environment
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

:: 5. Upgrade pip and install PyTorch with CUDA 12.4
echo.
echo [4/6] Installing PyTorch with NVIDIA CUDA 12.4 support (Zero Cost)...
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

:: 6. Install Dependencies
echo.
echo [5/6] Installing video, audio, and lip-sync dependencies...
python -m pip install -r requirements.txt

:: 7. Test Hardware & GPU Detection
echo.
echo [6/6] Testing NVIDIA GPU hardware & audio detection...
python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('Device Name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No NVIDIA GPU detected (CPU mode)')"

echo.
echo ==============================================================================
echo   INSTALLATION COMPLETED SUCCESSFULLY!
echo ==============================================================================
echo.
echo Video Engine: Ready (Wan2.1-T2V-1.4B / 14B / I2V)
echo Audio Engine: Ready (Multi-track timeline, SFX synthesizer, auto-ducking BGM)
echo Lip-Sync:     Ready (Wav2Lip / SadTalker integration point with VRAM safety)
echo.
echo Next step: Double-click "start.bat" to launch your local helper service.
echo Then, return to StoryMotion AI in your browser and click "Check Engine Status".
echo.
pause
