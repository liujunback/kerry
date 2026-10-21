const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('KEC WMS 打印中间件 - Windows 构建脚本');
console.log('========================================');
console.log('');

// 1. 清理旧构建
console.log('[1/4] 清理旧构建...');
if (fs.existsSync('build')) {
  fs.rmSync('build', { recursive: true });
  console.log('✓ 已清理旧构建目录');
}
fs.mkdirSync('build', { recursive: true });

// 2. TypeScript 编译
console.log('');
console.log('[2/4] 编译 TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✓ TypeScript 编译完成');
} catch (error) {
  console.error('✗ TypeScript 编译失败');
  process.exit(1);
}

// 3. 使用 pkg 打包
console.log('');
console.log('[3/4] 打包可执行文件...');
console.log('目标平台: Windows x64');
console.log('Node.js 版本: 18');
try {
  execSync('npx pkg . --targets node18-win-x64 --output build/kec-wms-print-agent.exe', {
    stdio: 'inherit'
  });
  const sumatraSource = path.join('node_modules', 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe');
  const sumatraTarget = path.join('build', 'SumatraPDF-3.4.6-32.exe');
  fs.copyFileSync(sumatraSource, sumatraTarget);
  console.log('✓ 可执行文件打包完成');
} catch (error) {
  console.error('✗ 打包失败');
  process.exit(1);
}

// 4. 创建安装脚本
console.log('');
console.log('[4/4] 创建安装脚本...');

// 创建安装批处理脚本
const installBat = `@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo KEC WMS 打印中间件 - 安装程序
echo ========================================
echo.

REM 检查管理员权限
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 建议以管理员身份运行以安装到 Program Files
    echo.
    set "INSTALL_DIR=%LOCALAPPDATA%\\KEC-WMS\\PrintAgent"
) else (
    set "INSTALL_DIR=%ProgramFiles%\\KEC-WMS\\PrintAgent"
)

echo [信息] 安装目录: %INSTALL_DIR%
echo.

REM 创建安装目录
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

REM 复制可执行文件
echo [信息] 正在复制文件...
copy /Y "kec-wms-print-agent.exe" "%INSTALL_DIR%\\kec-wms-print-agent.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 文件复制失败
    pause
    exit /b 1
)
copy /Y "SumatraPDF-3.4.6-32.exe" "%INSTALL_DIR%\\SumatraPDF-3.4.6-32.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] PDF 打印组件复制失败
    pause
    exit /b 1
)

REM 创建启动脚本
echo @echo off > "%INSTALL_DIR%\\启动打印中间件.bat"
echo chcp 65001 ^>nul >> "%INSTALL_DIR%\\启动打印中间件.bat"
echo echo 正在启动 KEC WMS 打印中间件... >> "%INSTALL_DIR%\\启动打印中间件.bat"
echo echo WebSocket 服务地址: ws://127.0.0.1:12212 >> "%INSTALL_DIR%\\启动打印中间件.bat"
echo echo. >> "%INSTALL_DIR%\\启动打印中间件.bat"
echo echo 请保持此窗口打开 >> "%INSTALL_DIR%\\启动打印中间件.bat"
echo echo 按 Ctrl+C 可停止服务 >> "%INSTALL_DIR%\\启动打印中间件.bat"
echo echo. >> "%INSTALL_DIR%\\启动打印中间件.bat"
echo "%INSTALL_DIR%\\kec-wms-print-agent.exe" >> "%INSTALL_DIR%\\启动打印中间件.bat"

REM 创建桌面快捷方式
echo [信息] 创建桌面快捷方式...
set "SHORTCUT=%USERPROFILE%\\Desktop\\KEC WMS 打印中间件.lnk"
powershell -Command "$WS = New-Object -ComObject WScript.Shell; $SC = $WS.CreateShortcut('%SHORTCUT%'); $SC.TargetPath = '%INSTALL_DIR%\\启动打印中间件.bat'; $SC.WorkingDirectory = '%INSTALL_DIR%'; $SC.Description = 'KEC WMS 打印中间件'; $SC.Save()"

echo.
echo ========================================
echo [成功] 安装完成！
echo ========================================
echo.
echo 安装位置: %INSTALL_DIR%
echo 桌面快捷方式: %SHORTCUT%
echo.
echo 使用方法:
echo   1. 双击桌面上的"KEC WMS 打印中间件"快捷方式
echo   2. 或运行: %INSTALL_DIR%\\启动打印中间件.bat
echo.
pause
`;

fs.writeFileSync('build/install.bat', installBat, 'utf8');
console.log('✓ 已创建 install.bat');

// 创建卸载脚本
const uninstallBat = `@echo off
chcp 65001 >nul

echo ========================================
echo KEC WMS 打印中间件 - 卸载程序
echo ========================================
echo.

REM 检查安装位置
set "INSTALL_DIR1=%ProgramFiles%\\KEC-WMS\\PrintAgent"
set "INSTALL_DIR2=%LOCALAPPDATA%\\KEC-WMS\\PrintAgent"

if exist "%INSTALL_DIR1%" (
    set "INSTALL_DIR=%INSTALL_DIR1%"
) else if exist "%INSTALL_DIR2%" (
    set "INSTALL_DIR=%INSTALL_DIR2%"
) else (
    echo [信息] 未找到安装文件
    pause
    exit /b 0
)

echo [信息] 找到安装目录: %INSTALL_DIR%
echo.

REM 停止运行中的进程
echo [信息] 正在停止运行中的服务...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":12212"') do (
    taskkill /PID %%a /F >nul 2>nul
)

REM 删除安装目录
echo [信息] 正在删除文件...
rmdir /S /Q "%INSTALL_DIR%" 2>nul

REM 删除桌面快捷方式
del "%USERPROFILE%\\Desktop\\KEC WMS 打印中间件.lnk" 2>nul

echo.
echo [成功] 卸载完成
echo.
pause
`;

fs.writeFileSync('build/uninstall.bat', uninstallBat, 'utf8');
console.log('✓ 已创建 uninstall.bat');

// 创建 README
const readme = `# KEC WMS 打印中间件 - Windows 安装包

## 安装步骤

1. 双击 \`install.bat\` 运行安装程序
2. 安装完成后，桌面会出现"KEC WMS 打印中间件"快捷方式
3. 双击快捷方式启动中间件服务

## 安装位置

- 管理员权限: \`C:\\Program Files\\KEC-WMS\\PrintAgent\`
- 普通用户: \`%LOCALAPPDATA%\\KEC-WMS\\PrintAgent\`

## 使用说明

1. 启动中间件后，保持窗口打开
2. 前端页面会自动连接到 ws://127.0.0.1:12212
3. 按 Ctrl+C 可停止服务

## 卸载

双击 \`uninstall.bat\` 运行卸载程序

## 文件说明

- \`kec-wms-print-agent.exe\` - 打印中间件可执行文件
- \`SumatraPDF-3.4.6-32.exe\` - PDF 静默打印组件
- \`install.bat\` - 安装脚本
- \`uninstall.bat\` - 卸载脚本
- \`README.txt\` - 本说明文件
`;

fs.writeFileSync('build/README.txt', readme, 'utf8');
console.log('✓ 已创建 README.txt');

console.log('');
console.log('========================================');
console.log('✓ 构建完成！');
console.log('========================================');
console.log('');
console.log('输出目录: build/');
console.log('');
console.log('文件列表:');
console.log('  - kec-wms-print-agent.exe  (可执行文件)');
console.log('  - SumatraPDF-3.4.6-32.exe (PDF 静默打印组件)');
console.log('  - install.bat              (安装脚本)');
console.log('  - uninstall.bat            (卸载脚本)');
console.log('  - README.txt               (说明文档)');
console.log('');
console.log('下一步:');
console.log('  1. 进入 build 目录');
console.log('  2. 双击 install.bat 安装');
console.log('  3. 双击桌面快捷方式启动服务');
console.log('');
