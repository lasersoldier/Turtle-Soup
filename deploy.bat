@echo off
:: 设置控制台编码为UTF-8以正确显示中文
chcp 65001 >nul
:: 启用延迟变量扩展以确保脚本正确执行
setlocal enabledelayedexpansion

cls
echo ====================================================
echo                海龟汤AI项目部署脚本
echo ====================================================
echo.

:: 步骤1: 环境检查
echo [步骤1/5] 环境检查
echo ====================================================
echo 当前工作目录: %CD%
echo.

:: 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: Node.js 未安装，请先安装Node.js再运行此脚本。
    pause
    exit /b 1
) else (
    echo ✓ Node.js 已安装
)

:: 检查npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: npm 未安装，请先安装npm再运行此脚本。
    pause
    exit /b 1
) else (
    echo ✓ npm 已安装
)

:: 显示版本信息
echo Node.js 版本:
for /f "delims=" %%i in ('node -v') do set node_version=%%i
echo !node_version!
echo npm 版本:
for /f "delims=" %%i in ('npm -v') do set npm_version=%%i
echo !npm_version!
echo.

:: 步骤2: 安装依赖
echo [步骤2/5] 安装项目依赖
echo ====================================================
echo 开始安装项目依赖...
echo 正在执行: npm install
call npm install

if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败，请检查网络连接或package.json文件。
    pause
    exit /b 1
) else (
    echo ✓ 依赖安装成功
    echo.
)

:: 步骤3: 构建项目
echo [步骤3/5] 构建项目
echo ====================================================
echo 开始构建项目...
echo 正在执行: npm run build
call npm run build

if %errorlevel% neq 0 (
    echo 错误: 项目构建失败，请查看上方的错误信息。
    pause
    exit /b 1
) else (
    echo ✓ 项目构建成功
    echo.
)

:: 步骤4: 验证构建结果
echo [步骤4/5] 验证构建结果
echo ====================================================
if exist ".\dist" (
    echo ✓ dist目录已成功生成
    
    :: 检查关键文件是否存在
    if exist ".\dist\index.html" (
        echo ✓ index.html文件已生成
    ) else (
        echo ✗ 警告: index.html文件不存在
    )
    
    :: 检查是否有JS文件
    dir ".\dist\*.js" >nul 2>nul
    if %errorlevel% equ 0 (
        echo ✓ JavaScript文件已生成
    ) else (
        echo ✗ 警告: 未找到JavaScript文件
    )
) else (
    echo ✗ 错误: dist目录未生成，构建可能失败。
    pause
    exit /b 1
)
echo.

:: 步骤5: 预览选项
echo [步骤5/5] 预览选项
echo ====================================================
echo 部署准备已完成！
echo 您可以选择预览构建结果或手动部署dist目录。
echo.

:preview_prompt
set "preview="
set /p "preview=是否使用Vite预览构建结果？(y/n): "
if /i "!preview!" equ "y" (
    echo 启动预览服务器...
    echo 预览服务器启动后，会显示访问地址（通常是 http://localhost:4173）
    echo 请在浏览器中打开该地址查看网站。
    echo 注意：按 Ctrl+C 可以停止预览服务器。
    echo.
    call npm run preview
) else if /i "%preview%" equ "n" (
    echo 构建输出目录: ./dist
    echo 如何手动预览网站：
    echo 1. 打开任意浏览器
    echo 2. 点击文件 > 打开文件
    echo 3. 浏览到 %CD%\dist 目录
    echo 4. 选择 index.html 文件打开
    echo 或者，您可以将dist目录部署到您的Web服务器。
    echo.
) else (
    echo 无效的选择，请输入 y 或 n。
    goto preview_prompt
)

echo ====================================================
echo 部署脚本执行完成！
echo 如果您选择了预览，网站应该已经在浏览器中打开。
echo 如果需要重新运行脚本，请直接双击 deploy.bat 文件。
echo ====================================================
pause