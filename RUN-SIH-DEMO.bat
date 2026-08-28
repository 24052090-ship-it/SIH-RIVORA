@echo off
echo Starting AquaGuard SIH demo mode...
call npm install
if errorlevel 1 exit /b 1
call npm run demo
