@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==============================================================================
echo   StoryMotion AI - Windows Local WAN 2.1 Helper Installer (Zero-Cost Setup)
echo ==============================================================================
echo.
echo No administrator privileges required. Installs in this local folder.
echo.

:: 1. Check Python
echo [1/5] Checking Python installation...
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

:: 2. Create Virtual Environment
echo.
echo [2/5] Creating isolated Python virtual environment (venv)...
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

:: 3. Activate Virtual Environment
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

:: 4. Upgrade pip and install PyTorch with CUDA 12.4
echo.
echo [3/5] Installing PyTorch with NVIDIA CUDA 12.4 support (Zero Cost)...
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

:: 5. Install Dependencies
echo.
echo [4/5] Installing helper dependencies (Diffusers, FastAPI, HuggingFace Hub)...
python -m pip install -r requirements.txt

:: 6. Test Hardware & GPU Detection
echo.
echo [5/5] Testing NVIDIA GPU hardware detection...
python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('Device Name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No NVIDIA GPU detected')"

echo.
echo ==============================================================================
echo   INSTALLATION COMPLETED SUCCESSFULLY!
echo ==============================================================================
echo.
echo Next step: Double-click "start.bat" to launch your local WAN helper service.
echo Then, return to StoryMotion AI in your browser and click "Check Engine Status".
echo.
pause
