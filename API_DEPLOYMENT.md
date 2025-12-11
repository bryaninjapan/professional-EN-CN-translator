# 双部署架构指南 (GitHub Pages + Vercel)

本项目采用双部署架构：
- **前端 (GitHub Pages)**: 托管静态页面，负责 UI 和用户交互。
- **API 服务 (Vercel)**: 托管 API Routes，负责调用 Gemini API。

## 1. 为什么需要双部署？

- **GitHub Pages** 只支持静态文件，无法运行 API Routes (Node.js 代码)。
- **Gemini API** 存在 CORS 限制，无法直接从浏览器调用，必须通过服务器代理。
- **解决方案**：前端部署在 GitHub Pages，API 部署在 Vercel，前端通过 API 调用 Vercel 上的服务。

## 2. 部署步骤

### 步骤 A: 部署 API 到 Vercel

1.  将本项目导入 Vercel。
2.  在 Vercel 项目设置中：
    *   保留默认的 Build Command (`next build`)。
    *   **不要**设置 `NEXT_PUBLIC_DEPLOY_TARGET` 环境变量 (这样就不会触发静态导出，API 路由会被保留)。
3.  部署完成后，获取分配的域名 (例如 `https://your-project.vercel.app`)。
4.  (可选) 在 Vercel 中设置环境变量 `GEMINI_API_KEY` 作为默认 Key (如果不设置，用户必须在前端手动输入)。

### 步骤 B: 部署前端到 GitHub Pages

1.  在 GitHub 仓库设置中：
    *   进入 **Settings** -> **Secrets and variables** -> **Actions**。
    *   点击 **New repository secret**。
    *   Name: `NEXT_PUBLIC_API_BASE_URL`
    *   Value: `https://your-project.vercel.app` (填入步骤 A 中获取的 Vercel 域名)。
2.  推送代码到 `main` 分支。
3.  GitHub Actions 会自动触发：
    *   它会识别环境变量 `NEXT_PUBLIC_DEPLOY_TARGET=github-pages`。
    *   它会在构建前移除 API 目录 (避免静态导出错误)。
    *   它会将 `NEXT_PUBLIC_API_BASE_URL` 注入到前端代码中。
    *   最后部署到 GitHub Pages。

## 3. 本地开发

本地开发时，前端和 API 都在同一个服务中运行：

```bash
npm run dev
```

访问 `http://localhost:3000` 即可，无需配置 `API_BASE_URL` (默认为相对路径)。

## 4. 常见问题

**Q: 为什么测试 Key 时提示 404？**
A: 请检查 GitHub Pages 部署的前端是否正确配置了 `API_BASE_URL`。打开浏览器控制台 (F12) -> Network，查看请求的 URL 是否指向了 Vercel 的域名，而不是 GitHub Pages 的域名。

**Q: Vercel 部署失败？**
A: 确保 Vercel 上没有设置 `NEXT_PUBLIC_DEPLOY_TARGET=github-pages`。Vercel 应该执行标准的 Next.js 构建。
