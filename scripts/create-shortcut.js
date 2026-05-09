const { writeFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { execSync } = require("child_process");

function getDesktopPath() {
  try {
    const raw = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders" /v Desktop',
      { encoding: "utf-8" }
    );
    const match = raw.match(/REG_EXPAND_SZ\s+(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return join(require("os").homedir(), "Desktop");
}

const DESKTOP = getDesktopPath();
const SHORTCUT_NAME = "Socratopia 学习空间.url";
const BAT_NAME = "启动学习空间.bat";

// 1. URL shortcut
const urlContent = `[InternetShortcut]
URL=http://localhost:3456
IconFile=%SystemRoot%\\system32\\SHELL32.dll
IconIndex=13
`;

try {
  if (!existsSync(DESKTOP)) mkdirSync(DESKTOP, { recursive: true });
  writeFileSync(join(DESKTOP, SHORTCUT_NAME), urlContent, "utf-8");
  console.log("桌面快捷方式已创建：%s\\%s", DESKTOP, SHORTCUT_NAME);
} catch (e) {
  console.log("桌面快捷方式创建失败：" + e.message);
  console.log("请手动把 http://localhost:3456 添加到浏览器收藏夹。");
}

// 2. Generate one-click startup .bat on desktop (with absolute project path)
const batDest = join(DESKTOP, BAT_NAME);
const projectRoot = join(__dirname, "..");

const batContent = `@echo off
chcp 936 >nul 2>&1
title Socratopia 启动器

echo.
echo ==========================================
echo       Socratopia 学习空间
echo ==========================================
echo.

cd /d "${projectRoot}"
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
`;

try {
  if (!existsSync(DESKTOP)) mkdirSync(DESKTOP, { recursive: true });
  execSync(`py "${join(__dirname, '_write_bat.py')}"`, { stdio: 'inherit' });
} catch (e) {
  // Fallback: write directly
  try {
    writeFileSync(batDest, '﻿' + batContent, 'utf16le');
    console.log("启动脚本已生成到桌面：%s", batDest);
  } catch (e2) {
    console.log("启动脚本生成失败：" + e2.message);
  }
}
