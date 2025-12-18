import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getClientIP, generateUUID } from '@/lib/db';

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
    const { deviceId } = await req.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: '设备ID不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const ip = getClientIP(req);

    // 生成邀请码（格式：INV-8位随机字符）
    const code = `INV-${generateUUID().substring(0, 8).replace(/-/g, '').toUpperCase()}`;

    // 插入邀请码
    await db.prepare(
      'INSERT INTO invite_codes (code, creator_device_id, creator_ip, created_at, used_count) VALUES (?, ?, ?, ?, ?)'
    ).bind(code, deviceId, ip, Math.floor(Date.now() / 1000), 0).run();

    return NextResponse.json({
      success: true,
      code,
      message: '邀请码生成成功',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Generate invite code error:', error);
    return NextResponse.json(
      { error: '生成邀请码失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
