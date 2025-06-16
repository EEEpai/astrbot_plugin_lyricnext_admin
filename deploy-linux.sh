#!/bin/bash

# 歌词管理系统 Linux 部署脚本

echo "🚀 歌词管理系统 - Linux 部署"
echo "================================"

# 进入脚本所在目录
cd "$(dirname "$0")"

# 加载配置文件
if [ -f "config.conf" ]; then
    echo "📋 加载配置文件..."
    
    # 检查并转换Windows换行符
    if file config.conf | grep -q "CRLF"; then
        echo "🔧 检测到Windows换行符，正在转换..."
        sed 's/\r$//' config.conf > config.conf.tmp
        mv config.conf.tmp config.conf
    fi
    
    # 加载配置
    source config.conf
    
    # 清理可能残留的回车符
    PORT=$(echo "$PORT" | tr -d '\r' | xargs)
    ADMIN_PASSWORD=$(echo "$ADMIN_PASSWORD" | tr -d '\r' | xargs)
    NODE_ENV=$(echo "$NODE_ENV" | tr -d '\r' | xargs)
    SESSION_SECRET=$(echo "$SESSION_SECRET" | tr -d '\r' | xargs)
    PRODUCTION_LYRICS_PATH=$(echo "$PRODUCTION_LYRICS_PATH" | tr -d '\r' | xargs)
    
    echo "✅ 配置加载完成"
else
    echo "⚠️  配置文件 config.conf 不存在，使用默认配置"
    PORT=3000
    ADMIN_PASSWORD=admin
    NODE_ENV=production
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖包..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 显示配置信息
echo ""
echo "🔧 当前配置:"
echo "   - 端口: $PORT"
echo "   - 密码: $ADMIN_PASSWORD (长度: ${#ADMIN_PASSWORD})"
echo "   - 环境: $NODE_ENV"
echo ""


# 使用PM2启动（推荐）
if command -v pm2 &> /dev/null; then
    echo "🚀 使用PM2启动服务..."
    
    # 停止已存在的进程
    pm2 delete lyrics-admin 2>/dev/null || true
    
    # 直接使用环境变量启动
    NODE_ENV="$NODE_ENV" PORT="$PORT" ADMIN_PASSWORD="$ADMIN_PASSWORD" pm2 start server.js --name lyrics-admin
    
    echo "✅ 服务已通过PM2启动"
    echo ""
    echo "📋 PM2 管理命令:"
    echo "   查看状态: pm2 status"
    echo "   查看日志: pm2 logs lyrics-admin"
    echo "   重启服务: pm2 restart lyrics-admin"
    echo "   停止服务: pm2 stop lyrics-admin"
    
else
    echo "⚠️  PM2未安装，使用直接启动方式"
    echo "💡 建议安装PM2: npm install -g pm2"
    echo "🚀 启动服务..."
    
    NODE_ENV=$NODE_ENV PORT=$PORT ADMIN_PASSWORD=$ADMIN_PASSWORD npm start
fi

echo ""
echo "🎉 部署完成！"
echo "🌐 访问地址: http://localhost:$PORT"
