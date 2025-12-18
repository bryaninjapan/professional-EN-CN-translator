import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { base64Encode } from '@/lib/admin';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: '密码不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 获取环境变量中的管理员密码
    const { env } = getRequestContext();
    const adminPassword = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: '管理员密码未配置' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 生成简单的token（实际应用中应该使用更安全的方式）
    const token = base64Encode(`admin:${Date.now()}`);

    return NextResponse.json({
      success: true,
      token,
      message: '登录成功',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: '登录失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
