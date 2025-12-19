# 数据库迁移指南

## 执行迁移脚本

### 方法 1：使用相对路径（推荐）

**重要**：确保您在项目根目录（`en-translator`）下执行命令：

```bash
# 1. 进入项目目录
cd "/Users/iruka/Desktop/EN translate/en-translator"

# 2. 执行迁移脚本
npx wrangler d1 execute en-translator-db --remote --file=./migrations/add_enhanced_features.sql
```

### 方法 2：使用绝对路径

如果相对路径不工作，可以使用绝对路径：

```bash
npx wrangler d1 execute en-translator-db --remote --file="/Users/iruka/Desktop/EN translate/en-translator/migrations/add_enhanced_features.sql"
```

### 方法 3：直接执行 SQL 语句

如果文件路径仍有问题，可以直接复制 SQL 内容到 Cloudflare Dashboard 的 D1 Console 中执行。

## 验证迁移

迁移完成后，验证新表是否已创建：

```bash
npx wrangler d1 execute en-translator-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user_credits', 'device_fingerprints', 'activation_details');"
```

应该看到三个表名。

## 常见错误

### 错误：Unable to read SQL text file

**原因**：当前工作目录不正确

**解决方案**：
1. 确认您在 `en-translator` 目录下
2. 使用 `pwd` 命令检查当前目录
3. 使用绝对路径执行命令

### 错误：no such table

**原因**：表已存在或迁移脚本已部分执行

**解决方案**：
- 迁移脚本使用了 `IF NOT EXISTS` 和 `OR IGNORE`，可以安全地重复执行
- 如果某些表已存在，脚本会跳过创建

## 迁移内容

此迁移脚本会：
1. 为 `device_invite_usage` 表添加 `device_fingerprint` 和 `ip_address` 字段
2. 创建 `user_credits` 表（服务端缓存）
3. 创建 `device_fingerprints` 表（设备指纹）
4. 创建 `activation_details` 表（激活详情）
5. 创建必要的索引
6. 迁移现有数据到新表

## 回滚

如果需要回滚，可以删除新创建的表（注意：这会丢失数据）：

```sql
DROP TABLE IF EXISTS activation_details;
DROP TABLE IF EXISTS device_fingerprints;
DROP TABLE IF EXISTS user_credits;
```

注意：`device_invite_usage` 表的新字段无法直接删除（SQLite 限制），但可以忽略它们。
