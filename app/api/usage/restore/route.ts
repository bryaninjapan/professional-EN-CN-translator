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

// 恢复使用次数（翻译失败时调用）
export async function POST(req: Request) {
  try {
    const { deviceId, usedFrom, activationCode } = await req.json();

    if (!deviceId || !usedFrom) {
      return NextResponse.json(
        { error: '设备ID和使用来源不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    if (usedFrom === 'free') {
      // 恢复免费次数
      const freeUsage = await db
        .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
        .bind(deviceId)
        .first();

      if (freeUsage) {
        const currentCount = (freeUsage as any).remaining_count || 0;
        await db.prepare(
          'UPDATE device_free_usage SET remaining_count = ?, updated_at = ? WHERE device_id = ?'
        ).bind(currentCount + 1, Math.floor(Date.now() / 1000), deviceId).run();
      }
    } else if (usedFrom === 'activation' && activationCode) {
      // 恢复激活码次数
      const activationUsage = await db
        .prepare('SELECT remaining_count FROM device_activation_usage WHERE device_id = ? AND activation_code = ?')
        .bind(deviceId, activationCode)
        .first();

      if (activationUsage) {
        const currentCount = (activationUsage as any).remaining_count || 0;
        await db.prepare(
          'UPDATE device_activation_usage SET remaining_count = ?, updated_at = ? WHERE device_id = ? AND activation_code = ?'
        ).bind(currentCount + 1, Math.floor(Date.now() / 1000), deviceId, activationCode).run();
      }
    }

    // 重新计算总次数
    const freeUsage = await db
      .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
      .bind(deviceId)
      .first();
    const freeCount = freeUsage ? (freeUsage as any).remaining_count || 0 : 0;

    const allActivationUsages = await db
      .prepare('SELECT remaining_count FROM device_activation_usage WHERE device_id = ?')
      .bind(deviceId)
      .all();

    let totalActivationCount = 0;
    if (allActivationUsages.results) {
      totalActivationCount = (allActivationUsages.results as any[]).reduce(
        (sum, item) => sum + (item.remaining_count || 0),
        0
      );
    }

    const totalRemaining = freeCount + totalActivationCount;

    return NextResponse.json({
      success: true,
      remainingCount: totalRemaining,
      freeCount,
      activationCount: totalActivationCount,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Restore usage error:', error);
    return NextResponse.json(
      { error: '恢复使用次数失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
