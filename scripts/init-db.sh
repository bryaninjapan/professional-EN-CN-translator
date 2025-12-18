#!/bin/bash

# 数据库初始化脚本
# 使用方法: ./scripts/init-db.sh

echo "🚀 开始初始化 D1 数据库..."

# 检查 wrangler 是否安装
if ! command -v npx &> /dev/null; then
    echo "❌ 错误: 未找到 npx，请先安装 Node.js"
    exit 1
fi

# 检查 schema.sql 文件是否存在
if [ ! -f "schema.sql" ]; then
    echo "❌ 错误: 找不到 schema.sql 文件"
    exit 1
fi

# 读取数据库名称（从 wrangler.toml）
DB_NAME=$(grep "database_name" wrangler.toml | head -1 | sed 's/.*= *"\(.*\)".*/\1/')

if [ -z "$DB_NAME" ]; then
    # 如果无法读取，使用默认值
    DB_NAME="en-translator-db"
    echo "⚠️  警告: 无法从 wrangler.toml 读取数据库名称，使用默认值: $DB_NAME"
else
    echo "📦 数据库名称: $DB_NAME"
fi

echo "📄 执行 schema.sql..."
echo ""

# 询问是否执行到远程数据库
read -p "是否执行到远程数据库？(y/n，默认y): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
    REMOTE_FLAG=""
    echo "执行到本地数据库..."
else
    REMOTE_FLAG="--remote"
    echo "执行到远程数据库..."
fi

# 执行 SQL 文件
npx wrangler d1 execute "$DB_NAME" --file=./schema.sql $REMOTE_FLAG

if [ $? -eq 0 ]; then
    echo "✅ 数据库初始化成功！"
    echo ""
    echo "下一步："
    echo "1. 在 Cloudflare Dashboard 中绑定 D1 数据库到 Pages 项目"
    echo "2. 设置环境变量 ADMIN_PASSWORD"
    echo "3. 重新部署应用"
else
    echo "❌ 数据库初始化失败，请检查错误信息"
    exit 1
fi
