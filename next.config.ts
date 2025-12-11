import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 默认使用 Turbopack
  // pdf-parse 的导入问题已通过运行时包装函数解决，无需 webpack 配置
  
  // GitHub Pages 部署配置
  // 只有在特定环境变量存在时才启用静态导出
  output: process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  // GitHub Pages 子路径配置（只在 GitHub Pages 构建时启用）
  basePath: process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? '/professional-EN-CN-translator' : '',
  assetPrefix: process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? '/professional-EN-CN-translator' : '',
};

export default nextConfig;
