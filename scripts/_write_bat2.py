import os

INIT_CONTENT = """@echo off
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
"""

CLEAN_CONTENT = """@echo off
chcp 936 >nul 2>&1
title 清理缓存

echo.
echo 正在清理编译缓存 .next ...
rmdir /s /q "%~dp0.next" 2>nul && echo [OK] .next 已删除 || echo .next 不存在，跳过
echo.
echo 清理完成！下次启动会自动重建。
echo.
pause
"""

for path, content in [
    ("D:/socratopia-web/初始化.bat", INIT_CONTENT),
    ("D:/socratopia-web/清理缓存.bat", CLEAN_CONTENT),
    ("E:/socratopia-web/初始化.bat", INIT_CONTENT),
    ("E:/socratopia-web/清理缓存.bat", CLEAN_CONTENT),
]:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='gbk') as f:
        f.write(content)
    print(f"OK: {path}")
