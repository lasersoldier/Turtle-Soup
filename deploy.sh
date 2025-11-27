#!/bin/bash

# 清屏
echo -e "\033c"

# 显示标题
echo "===================================================="
echo "                海龟汤AI项目部署脚本                "
echo "===================================================="
echo

# 步骤1: 环境检查
echo "[步骤1/5] 环境检查"
echo "===================================================="
echo "当前工作目录: $(pwd)"
echo

# 检查Node.js
if command -v node &> /dev/null; then
    echo "✓ Node.js 已安装"
    echo "Node.js 版本:"
    node -v
else
    echo "错误: Node.js 未安装，请先安装Node.js再运行此脚本。"
    exit 1
fi

# 检查npm
if command -v npm &> /dev/null; then
    echo "✓ npm 已安装"
    echo "npm 版本:"
    npm -v
else
    echo "错误: npm 未安装，请先安装npm再运行此脚本。"
    exit 1
fi
echo

# 步骤2: 安装依赖
echo "[步骤2/5] 安装项目依赖"
echo "===================================================="
echo "开始安装项目依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ 依赖安装成功"
    echo
else
    echo "✗ 错误: 依赖安装失败，请检查网络连接或package.json文件。"
    exit 1
fi

# 步骤3: 构建项目
echo "[步骤3/5] 构建项目"
echo "===================================================="
echo "开始构建项目..."
npm run build

if [ $? -eq 0 ]; then
    echo "✓ 项目构建成功"
    echo
else
    echo "✗ 错误: 项目构建失败，请查看上方的错误信息。"
    exit 1
fi

# 步骤4: 验证构建结果
echo "[步骤4/5] 验证构建结果"
echo "===================================================="
if [ -d "./dist" ]; then
    echo "✓ dist目录已成功生成"
    
    # 检查关键文件是否存在
    if [ -f "./dist/index.html" ]; then
        echo "✓ index.html文件已生成"
    else
        echo "✗ 警告: index.html文件不存在"
    fi
    
    # 检查是否有JS文件
    if ls ./dist/*.js 1> /dev/null 2>&1; then
        echo "✓ JavaScript文件已生成"
    else
        echo "✗ 警告: 未找到JavaScript文件"
    fi
else
    echo "✗ 错误: dist目录未生成，构建可能失败。"
    exit 1
fi
echo

# 步骤5: 预览选项
echo "[步骤5/5] 预览选项"
echo "===================================================="
echo "部署准备已完成！"
echo "您可以选择预览构建结果或手动部署dist目录。"
echo

# 预览提示
read -p "是否使用Vite预览构建结果？(y/n): " preview

if [ "$preview" = "y" ] || [ "$preview" = "Y" ]; then
    echo "启动预览服务器..."
    echo "预览服务器启动后，会显示访问地址（通常是 http://localhost:4173）"
    echo "请在浏览器中打开该地址查看网站。"
    echo "注意：按 Ctrl+C 可以停止预览服务器。"
    echo
    npm run preview
elif [ "$preview" = "n" ] || [ "$preview" = "N" ]; then
    echo "构建输出目录: ./dist"
    echo "如何手动预览网站："
    echo "1. 打开任意浏览器"
    echo "2. 点击文件 > 打开文件"
    echo "3. 浏览到 $(pwd)/dist 目录"
    echo "4. 选择 index.html 文件打开"
    echo "或者，您可以将dist目录部署到您的Web服务器。"
    echo
else
    echo "无效的选择，将默认不预览。"
    echo "构建输出目录: ./dist"
    echo "如何手动预览网站："
    echo "1. 打开任意浏览器"
    echo "2. 点击文件 > 打开文件"
    echo "3. 浏览到 $(pwd)/dist 目录"
    echo "4. 选择 index.html 文件打开"
    echo
fi

echo "===================================================="
echo "部署脚本执行完成！"
echo "如果您选择了预览，网站应该已经在浏览器中打开。"
echo "如果需要重新运行脚本，请使用命令: bash deploy.sh"
echo "===================================================="
