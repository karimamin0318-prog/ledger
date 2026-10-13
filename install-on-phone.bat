@echo off
cd /d "%~dp0"
echo Building the production version...
call npm run build
echo.
echo Starting the server your phone will connect to (only needed for this one-time install)...
call npm run preview
