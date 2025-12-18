import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getClientIP } from '@/lib/db';

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
    const { code, deviceId } = await req.json();

    if (!code || !deviceId) {
      return NextResponse.json(
        { error: '激活码和设备ID不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 获取数据库（在 Cloudflare Pages 中通过 getRequestContext 获取）
    const { env } = getRequestContext();
    const db = env.DB;

    // 查询激活码
    const activationCode = await db
      .prepare('SELECT * FROM activation_codes WHERE code = ?')
      .bind(code)
      .first() as any;

    if (!activationCode) {
      return NextResponse.json(
        { error: '激活码不存在' },
        { status: 404, headers: corsHeaders }
      );
    }

    // 检查是否已经激活过
    const existingActivation = await db
      .prepare('SELECT * FROM device_activations WHERE device_id = ? AND activation_code = ?')
      .bind(deviceId, code)
      .first();

    if (existingActivation) {
      // 已激活，返回当前剩余次数
      const usage = await db
        .prepare('SELECT remaining_count FROM device_activation_usage WHERE device_id = ? AND activation_code = ?')
        .bind(deviceId, code)
        .first() as any;

      return NextResponse.json({
        success: true,
        message: '激活码已激活',
        remainingCount: usage?.remaining_count || activationCode.initial_count,
      }, { headers: corsHeaders });
    }

    // 首次激活，创建记录
    await db.prepare(
      'INSERT INTO device_activations (device_id, activation_code, activated_at) VALUES (?, ?, ?)'
    ).bind(deviceId, code, Math.floor(Date.now() / 1000)).run();

    // 创建使用次数记录
    await db.prepare(
      'INSERT INTO device_activation_usage (device_id, activation_code, remaining_count, updated_at) VALUES (?, ?, ?, ?)'
    ).bind(deviceId, code, activationCode.initial_count, Math.floor(Date.now() / 1000)).run();

    return NextResponse.json({
      success: true,
      message: '激活成功',
      remainingCount: activationCode.initial_count,
      type: activationCode.type,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Activate error:', error);
    return NextResponse.json(
      { error: '激活失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
