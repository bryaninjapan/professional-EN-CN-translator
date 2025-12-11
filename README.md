# Professional EN-CN Translator

一个专业的英文翻译工具，支持分段翻译、专业术语提取和语境解析。

## 功能特性

- 🔑 **API Key 管理**：安全的本地存储和测试功能
- 📝 **三段式翻译结果**：
  1. 原文翻译
  2. 专业术语表
  3. 难点与语境解析
- 📋 **独立复制功能**：每个部分都有独立的复制按钮
- 💾 **Markdown 导出**：一键导出完整的翻译结果

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看结果。

## 部署到 GitHub Pages

本项目已配置 GitHub Actions 自动部署到 GitHub Pages。

### 前置要求

1. 在 GitHub 仓库设置中启用 GitHub Pages：
   - 进入 Settings → Pages
   - Source 选择 "GitHub Actions"

2. **重要**：由于 GitHub Pages 只支持静态文件，API Routes 无法在 GitHub Pages 上运行。您需要：

   **方案 A：将 API 单独部署到 Vercel（推荐）**
   - 将 `app/api` 目录部署到 Vercel
   - 在 Vercel 环境变量中设置 `GEMINI_API_KEY`（可选，用于默认值）
   - 在 Next.js 配置或环境变量中设置 `NEXT_PUBLIC_API_BASE_URL` 指向您的 Vercel API

   **方案 B：修改前端配置**
   - 如果 API 部署在其他地址，修改 `app/page.tsx` 中的 `API_BASE_URL`
   - 或设置环境变量 `NEXT_PUBLIC_API_BASE_URL`

### 自动部署

推送代码到 `main` 分支后，GitHub Actions 会自动：
1. 构建 Next.js 静态文件
2. 部署到 GitHub Pages

### 本地构建测试

```bash
npm run build
```

构建产物在 `out` 目录。

## 技术栈

- [Next.js](https://nextjs.org) 16.0.8
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Google Gemini API](https://ai.google.dev)
- [React Markdown](https://github.com/remarkjs/react-markdown)

## 许可证

MIT
