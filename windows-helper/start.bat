@echo off
setlocal
cd /d "%~dp0"

echo ==============================================================================
echo   StoryMotion AI - Starting Local WAN 2.1 Helper Service
echo ==============================================================================
echo.

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Please run "install.bat" first!
    echo.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat
python helper_server.py
pause
