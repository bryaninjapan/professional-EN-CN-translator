// 数据库工具函数
// 在 Cloudflare Pages 中，D1 数据库通过 env.DB 访问

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
  results?: T[];
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// 获取客户端 IP 地址
export function getClientIP(req: Request): string {
  // Cloudflare 提供的真实客户端 IP
  const cfIP = req.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;
  
  // 备用方案
  const forwarded = req.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

// 从环境变量获取数据库实例
// 在 Cloudflare Pages 中，需要通过 getRequestContext 获取
// 注意：此函数已废弃，请直接在 API 路由中使用 getRequestContext().env.DB
export function getDB(): D1Database {
  // 尝试从 getRequestContext 获取（@cloudflare/next-on-pages）
  try {
    // 使用动态导入避免构建时错误
    const { getRequestContext } = require('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    if (env && env.DB) {
      return env.DB as D1Database;
    }
  } catch (e) {
    // getRequestContext 可能不可用（开发环境或未导入）
  }
  
  throw new Error('Database not available. Please configure D1 database in Cloudflare Dashboard and ensure @cloudflare/next-on-pages is installed.');
}

// 在 Edge Runtime 中生成 UUID 的替代方案
export function generateUUID(): string {
  // 使用 crypto.randomUUID() 如果可用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 备用方案：生成类似 UUID 的字符串
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
