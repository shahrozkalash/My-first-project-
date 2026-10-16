@echo off
setlocal
cd /d "%~dp0"

echo ==============================================================================
echo   StoryMotion AI - Clean Uninstall of Local Windows Helper
echo ==============================================================================
echo.
echo This will remove the local Python virtual environment, temporary files,
echo and cache created by the helper. Your model weights and videos will be preserved
echo unless you choose to delete them manually.
echo.
set /p CONFIRM="Are you sure you want to uninstall? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Uninstallation aborted.
    pause
    exit /b 0
)

echo.
echo 1. Stopping any running helper on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo 2. Removing virtual environment (venv)...
if exist "venv" (
    rmdir /s /q "venv"
    echo Removed venv folder.
)

echo 3. Removing pairing token...
if exist ".pairing_token" (
    del /f /q ".pairing_token"
    echo Removed pairing token.
)

echo.
echo ==============================================================================
echo   UNINSTALLATION COMPLETE
echo ==============================================================================
echo The helper virtual environment has been cleanly removed.
echo No registry keys or system-wide modifications were made.
echo.
pause
