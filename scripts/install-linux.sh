#!/bin/bash

# Element Explorer Kids - Linux One-Click Install Script

echo "正在检查环境..."

# 1. 检查 Node.js 版本
if ! command -v node >/dev/null 2>&1; then
    echo "错误: 未找到 Node.js。请先安装 Node.js (建议 v18 或更高版本)。"
    echo "安装参考: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误: Node.js 版本过低。请更新至 v18 或更高版本 (当前版本: $(node -v))。"
    exit 1
fi

# 2. 安装依赖
echo "正在安装项目依赖..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败。"
    exit 1
fi

# 3. 验证构建与部署
echo "正在验证部署环境..."
npm run deploy:local -- --smoke-test

if [ $? -ne 0 ]; then
    echo "错误: 部署验证失败。请检查上述错误信息。"
    exit 1
fi

echo "============================================"
echo "安装成功！"
echo "您可以使用 'npm run dev' 启动开发服务，"
echo "或者使用 'npm run preview' 预览生产构建。"
echo "============================================"
