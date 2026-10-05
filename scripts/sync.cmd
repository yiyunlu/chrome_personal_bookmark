@echo off
REM Double-click or run from cmd: pulls current branch, npm ci if needed, builds TabHub.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync.ps1" %*
exit /b %ERRORLEVEL%
