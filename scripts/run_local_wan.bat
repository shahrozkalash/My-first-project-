@echo off
echo ===================================================================
echo   StoryMotion AI - Zero-Cost Local WAN 2.1 Video Server (Windows 11)
echo ===================================================================
echo.
echo 1. Checking Python installation...
python --version
if errorlevel 1 (
    echo [ERROR] Python 3.10 or 3.11 was not found in PATH.
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo 2. Installing / Verifying free local requirements...
pip install -r requirements.txt

echo.
echo 3. Launching local WAN inference server on http://127.0.0.1:8000...
echo Model: Wan-AI/Wan2.1-T2V-1.4B (Free open-weights, consumer GPU optimized)
echo.
python local_wan_server.py --port 8000 --model wan-2.1-t2v-1.4b --device cuda
pause
