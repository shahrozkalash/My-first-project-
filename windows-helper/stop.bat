@echo off
setlocal
echo ==============================================================================
echo   StoryMotion AI - Stopping Local WAN 2.1 Helper
echo ==============================================================================
echo.

echo Looking for processes listening on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Terminating PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Local helper service stopped.
pause
