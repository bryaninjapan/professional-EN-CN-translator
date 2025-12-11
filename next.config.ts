import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 默认使用 Turbopack
  // pdf-parse 的导入问题已通过运行时包装函数解决，无需 webpack 配置
};

export default nextConfig;
