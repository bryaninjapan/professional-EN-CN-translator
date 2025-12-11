import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 默认使用 Turbopack
  // pdf-parse 的导入问题已通过运行时包装函数解决，无需 webpack 配置
  
  // GitHub Pages 部署配置
  output: 'export',
  images: {
    unoptimized: true,
  },
  // 如果部署在子路径，需要设置 basePath
  // basePath: '/professional-EN-CN-translator',
  // assetPrefix: '/professional-EN-CN-translator',
};

export default nextConfig;
