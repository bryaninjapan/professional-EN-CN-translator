#!/bin/bash

# 数据库测试脚本
# 使用方法: ./scripts/test-db.sh

echo "🧪 测试 D1 数据库连接..."

# 读取数据库名称
DB_NAME=$(grep -A 1 "\[\[d1_databases\]\]" wrangler.toml | grep "database_name" | cut -d '"' -f 2)

if [ -z "$DB_NAME" ]; then
    echo "❌ 错误: 无法从 wrangler.toml 读取数据库名称"
    exit 1
fi

echo "📦 数据库名称: $DB_NAME"
echo ""

# 测试 1: 列出所有表
echo "📋 测试 1: 列出所有表..."
npx wrangler d1 execute "$DB_NAME" --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

if [ $? -eq 0 ]; then
    echo "✅ 表查询成功"
else
    echo "❌ 表查询失败"
    exit 1
fi

echo ""
echo "📊 测试 2: 检查表结构..."
echo ""

# 检查关键表是否存在
TABLES=("activation_codes" "invite_codes" "usage_records" "device_activations" "device_free_usage" "device_activation_usage" "device_invite_usage")

for table in "${TABLES[@]}"; do
    echo "检查表: $table"
    npx wrangler d1 execute "$DB_NAME" --command="SELECT COUNT(*) as count FROM $table;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "  ✅ $table 存在"
    else
        echo "  ❌ $table 不存在或查询失败"
    fi
done

echo ""
echo "✅ 数据库测试完成！"
