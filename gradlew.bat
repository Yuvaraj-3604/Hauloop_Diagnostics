@echo off
cd /d "%~dp0android"
call gradlew.bat %*
cd /d "%~dp0"
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "hauloop-fmc650-diagnostics.apk" >nul 2>&1
)
