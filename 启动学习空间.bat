@echo off
chcp 936 >nul 2>&1
title Socratopia 启动器

echo.
echo ==========================================
echo       Socratopia 学习空间
echo ==========================================
echo.

cd /d "%~dp0"
start /min "" cmd /c "npm run dev"

echo 正在启动服务器，稍等片刻...
echo.

set /a count=0
:wait
timeout /t 1 /nobreak >nul
set /a count+=1
curl -s -o NUL http://localhost:3456 >nul 2>&1
if %errorlevel% == 0 goto ready
if %count% geq 15 goto timeout
goto wait

:ready
echo [OK] 服务已就绪，正在打开浏览器...
start "" http://localhost:3456
echo.
echo 浏览器已打开。用完点下面任务栏图标右键关闭即可。
pause
exit

:timeout
echo [!] 启动可能较慢，请手动打开浏览器访问 http://localhost:3456
echo    如果无法访问，请检查是否装了 Node.js，或重新运行初始化.bat
pause
exit
