# API 部署说明

由于 GitHub Pages 只支持静态文件，API Routes 无法在 GitHub Pages 上运行。您需要将 API 单独部署到支持 Node.js 运行时的平台（如 Vercel）。

## 方案 1：部署 API 到 Vercel（推荐）

### 步骤

1. **创建新的 Vercel 项目**
   - 访问 [Vercel](https://vercel.com)
   - 导入这个 GitHub 仓库
   - 在项目设置中，配置 **Root Directory** 为 `app/api`（或创建单独的 API 仓库）

2. **环境变量配置**
   - 在 Vercel 项目设置中添加环境变量：
     - `GEMINI_API_KEY`（可选，如果不设置，需要用户在界面输入）

3. **获取 API 地址**
   - 部署完成后，您会得到一个 URL，例如：`https://your-project.vercel.app`

4. **配置前端**
   - 在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：
     - `NEXT_PUBLIC_API_BASE_URL` = `https://your-project.vercel.app`
   - 或者在 `app/page.tsx` 中直接修改 `API_BASE_URL` 常量

## 方案 2：恢复 API Routes 文件

如果您想单独部署 API，可以从之前的提交中恢复这些文件：

```bash
git show d24cadb:app/api/translate/route.ts > app/api/translate/route.ts
git show d24cadb:app/api/test-key/route.ts > app/api/test-key/route.ts
```

然后创建单独的 API 项目部署到 Vercel。

## 方案 3：客户端直接调用 Gemini API（不推荐）

不推荐此方案，因为会暴露 API Key。但如果确实需要，可以修改前端代码直接调用 Gemini API（使用 `@google/generative-ai` 库）。

---

**注意**：当前代码已配置为支持外部 API URL，只需设置 `API_BASE_URL` 环境变量或在代码中修改即可。
