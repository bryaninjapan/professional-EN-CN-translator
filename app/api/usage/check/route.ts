import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

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

    // 获取免费次数
    const freeUsage = await db
      .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
      .bind(deviceId)
      .first();

    let freeCount = 0;
    if (freeUsage) {
      freeCount = (freeUsage as any).remaining_count || 0;
    } else {
      // 首次使用，创建记录（初始3次）
      await db.prepare(
        'INSERT INTO device_free_usage (device_id, remaining_count, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(deviceId, 3, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();
      freeCount = 3;
    }

    // 获取激活码次数（所有激活码的总和）
    const activationUsages = await db
      .prepare('SELECT remaining_count FROM device_activation_usage WHERE device_id = ?')
      .bind(deviceId)
      .all();

    let activationCount = 0;
    if (activationUsages.results) {
      activationCount = (activationUsages.results as any[]).reduce(
        (sum, item) => sum + (item.remaining_count || 0),
        0
      );
    }

    const totalCount = freeCount + activationCount;

    return NextResponse.json({
      success: true,
      freeCount,
      activationCount,
      totalCount,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Check usage error:', error);
    return NextResponse.json(
      { error: '查询使用次数失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
