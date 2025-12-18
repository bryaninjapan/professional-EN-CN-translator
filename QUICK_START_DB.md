# 数据库快速配置指南

## 🚀 快速开始（5分钟完成）

### 步骤 1: 创建 D1 数据库（2分钟）

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单：**Workers & Pages** → **D1**
3. 点击 **Create database**
4. 填写：
   - Name: `en-translator-db`
   - Region: `APAC`（或选择离您最近的）
5. 点击 **Create**
6. **复制 Database ID**（创建后显示在页面上）

### 步骤 2: 更新配置文件（30秒）

编辑 `wrangler.toml`，将 Database ID 填入：

```toml
database_id = "粘贴您的数据库ID"
```

### 步骤 3: 初始化数据库表（1分钟）

在终端执行：

```bash
npm run db:init
```

或者手动执行：

```bash
npx wrangler d1 execute en-translator-db --file=./schema.sql
```

### 步骤 4: 绑定数据库到 Pages 项目（1分钟）

1. Cloudflare Dashboard → **Workers & Pages** → **Pages**
2. 选择项目 `en-translator`
3. **Settings** → **Functions**
4. **D1 Database bindings** → **Add binding**
5. 填写：
   - Variable name: `DB`
   - D1 Database: 选择 `en-translator-db`
6. 保存

### 步骤 5: 设置环境变量（30秒）

1. 在 Pages 项目设置中
2. **Settings** → **Environment variables**
3. 添加：
   - Name: `ADMIN_PASSWORD`
   - Value: 您的后台管理密码
4. 保存

### 步骤 6: 验证配置（30秒）

```bash
npm run db:test
```

应该看到所有表都已创建。

## ✅ 完成！

现在数据库已配置完成，可以继续第二阶段开发了。

## 📝 注意事项

- 数据库创建后可能需要等待几分钟才能完全可用
- 确保 `wrangler.toml` 中的 `database_id` 已正确填写
- 确保 Pages 项目已绑定 D1 数据库（变量名必须是 `DB`）

## 🆘 遇到问题？

查看详细文档：`DATABASE_SETUP.md`
