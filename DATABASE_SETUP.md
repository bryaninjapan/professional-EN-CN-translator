# 数据库配置指南

## 步骤 1: 在 Cloudflare Dashboard 创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择您的账户
3. 在左侧菜单找到 **Workers & Pages** → **D1**
4. 点击 **Create database**
5. 填写信息：
   - **Database name**: `en-translator-db`
   - **Region**: 选择离您最近的区域（推荐 `APAC` 或 `EEUR`）
6. 点击 **Create**
7. **重要**：创建成功后，复制 **Database ID**（格式类似：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

## 步骤 2: 更新 wrangler.toml 配置

1. 打开 `wrangler.toml` 文件
2. 找到 `database_id = ""` 这一行
3. 将复制的 Database ID 填入：
   ```toml
   database_id = "您的数据库ID"
   ```

## 步骤 3: 初始化数据库表结构

有两种方式初始化数据库：

### 方式 A: 使用 Wrangler CLI（推荐）

```bash
# 确保已安装 wrangler
npm install -D wrangler

# 执行 SQL 文件创建表
npx wrangler d1 execute en-translator-db --file=./schema.sql
```

### 方式 B: 在 Cloudflare Dashboard 中执行

1. 进入 D1 数据库页面
2. 点击您的数据库 `en-translator-db`
3. 切换到 **Console** 标签页
4. 复制 `schema.sql` 文件中的所有 SQL 语句
5. 粘贴到控制台并执行

### 方式 C: 使用 Wrangler 命令逐条执行

如果上述方式不可用，可以手动执行以下命令：

```bash
# 创建激活码表
npx wrangler d1 execute en-translator-db --command="CREATE TABLE IF NOT EXISTS activation_codes (code TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('free', 'paid')), initial_count INTEGER NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()), created_by TEXT NOT NULL);"

# 创建邀请码表
npx wrangler d1 execute en-translator-db --command="CREATE TABLE IF NOT EXISTS invite_codes (code TEXT PRIMARY KEY, creator_device_id TEXT NOT NULL, creator_ip TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()), used_count INTEGER NOT NULL DEFAULT 0);"

# 创建使用记录表
npx wrangler d1 execute en-translator-db --command="CREATE TABLE IF NOT EXISTS usage_records (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT NOT NULL, activation_code TEXT, invite_code TEXT, ip_address TEXT NOT NULL, text_length INTEGER NOT NULL, used_at INTEGER NOT NULL DEFAULT (unixepoch()));"

# 创建设备激活记录表
npx wrangler d1 execute en-translator-db --command="CREATE TABLE IF NOT EXISTS device_activations (device_id TEXT NOT NULL, activation_code TEXT NOT NULL, activated_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (device_id, activation_code));"

# 创建设备免费次数记录表
npx wrangler d1 execute en-translator-db --command="CREATE TABLE IF NOT EXISTS device_free_usage (device_id TEXT PRIMARY KEY, remaining_count INTEGER NOT NULL DEFAULT 3, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));"

# 创建设备激活码次数记录表
npx wrangler d1 execute en-translator-db --command="CREATE TABLE IF NOT EXISTS device_activation_usage (device_id TEXT NOT NULL, activation_code TEXT NOT NULL, remaining_count INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (device_id, activation_code));"

# 创建设备邀请码使用记录表
npx wrangler d1 execute en-translator-db --command="CREATE TABLE IF NOT EXISTS device_invite_usage (device_id TEXT NOT NULL, invite_code TEXT NOT NULL, used_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (device_id, invite_code));"

# 创建索引
npx wrangler d1 execute en-translator-db --command="CREATE INDEX IF NOT EXISTS idx_usage_device_id ON usage_records(device_id);"
npx wrangler d1 execute en-translator-db --command="CREATE INDEX IF NOT EXISTS idx_usage_activation_code ON usage_records(activation_code);"
npx wrangler d1 execute en-translator-db --command="CREATE INDEX IF NOT EXISTS idx_usage_invite_code ON usage_records(invite_code);"
npx wrangler d1 execute en-translator-db --command="CREATE INDEX IF NOT EXISTS idx_invite_creator_device ON invite_codes(creator_device_id);"
npx wrangler d1 execute en-translator-db --command="CREATE INDEX IF NOT EXISTS idx_device_activation_device ON device_activations(device_id);"
```

## 步骤 4: 配置 Cloudflare Pages 环境变量

1. 进入 Cloudflare Dashboard → **Workers & Pages** → **Pages**
2. 选择您的项目 `en-translator`
3. 进入 **Settings** → **Environment variables**
4. 添加以下环境变量：
   - `ADMIN_PASSWORD`: 您的后台管理密码（用于保护后台管理页面）

## 步骤 5: 绑定 D1 数据库到 Pages 项目

1. 在 Pages 项目设置页面
2. 找到 **Settings** → **Functions**
3. 在 **D1 Database bindings** 部分
4. 点击 **Add binding**
5. 填写：
   - **Variable name**: `DB`
   - **D1 Database**: 选择 `en-translator-db`
6. 保存

## 验证数据库配置

创建测试激活码来验证数据库是否正常工作：

```bash
# 在 Cloudflare Dashboard 的 D1 Console 中执行
INSERT INTO activation_codes (code, type, initial_count, created_at, created_by) 
VALUES ('TEST-12345678', 'free', 10, unixepoch(), 'admin');
```

## 注意事项

- 数据库创建后，需要等待几分钟才能完全可用
- 确保 `wrangler.toml` 中的 `database_id` 已正确填写
- 确保 Pages 项目已绑定 D1 数据库（变量名必须是 `DB`）
- 本地开发时，可以使用 `wrangler pages dev` 来测试数据库连接

## 故障排除

如果遇到问题：

1. **数据库连接失败**：
   - 检查 `wrangler.toml` 中的 `database_id` 是否正确
   - 确认 Pages 项目已绑定 D1 数据库

2. **表不存在错误**：
   - 确认已执行 `schema.sql` 中的所有 SQL 语句
   - 在 D1 Console 中检查表是否已创建

3. **权限错误**：
   - 确认已登录 Cloudflare 账户
   - 确认账户有权限访问 D1 数据库
