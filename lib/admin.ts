// 管理员工具函数

// Base64 解码（Edge Runtime 兼容）
function base64Decode(str: string): string {
  try {
    // 在 Edge Runtime 中使用 atob
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
    // 备用方案：使用 Buffer（Node.js 环境）
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8');
    }
    return '';
  } catch {
    return '';
  }
}

// Base64 编码（Edge Runtime 兼容）
export function base64Encode(str: string): string {
  try {
    // 在 Edge Runtime 中使用 btoa
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    // 备用方案：使用 Buffer（Node.js 环境）
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    return '';
  } catch {
    return '';
  }
}

// 验证管理员token
export function verifyAdmin(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = base64Decode(token);
    // 简单验证，实际应用中应该使用更安全的方式
    return decoded.startsWith('admin:');
  } catch {
    return false;
  }
}
