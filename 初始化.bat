@echo off
chcp 936 >nul 2>&1
title Socratopia 初始化

echo.
echo ==========================================
echo       Socratopia 学习空间 - 一键初始化
echo ==========================================
echo.
echo [1/2] 正在安装依赖，第一次大约需要两三分钟...
echo.

cd /d "%~dp0"
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [X] 依赖安装失败，请检查 Node.js 是否已正确安装
    echo     打开浏览器访问 https://nodejs.org 下载安装
    pause
    exit /b 1
)

echo.
echo [2/2] 正在初始化数据库...
echo.

call npx drizzle-kit push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [X] 数据库初始化失败，请重新运行本程序
    pause
    exit /b 1
)

echo.
echo ==========================================
echo       初始化完成，享受学习之旅吧！
echo ==========================================
echo.
echo 现在双击"启动学习空间.bat"就可以开始使用了！
echo.
pause
