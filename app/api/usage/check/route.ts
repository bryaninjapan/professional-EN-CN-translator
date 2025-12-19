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
    const { deviceId, clientCount } = await req.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: '设备ID不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // 获取或创建 user_credits 记录（服务端缓存）
    let userCredits = await db
      .prepare('SELECT * FROM user_credits WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;

    const now = Math.floor(Date.now() / 1000);

    if (!userCredits) {
      // 首次使用，初始化记录
      await db.prepare(
        'INSERT INTO user_credits (device_id, free_credits, total_credits, last_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(deviceId, 3, 3, now, now, now).run();
      
      // 同时创建 device_free_usage 记录（兼容旧系统）
      await db.prepare(
        'INSERT INTO device_free_usage (device_id, remaining_count, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(deviceId, 3, now, now).run();
      
      userCredits = {
        free_credits: 3,
        activation_credits: 0,
        total_credits: 3,
        last_verified_at: now,
      };
    }

    // 重新计算真实次数（从源表计算，防止缓存不一致）
    const freeUsage = await db
      .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;

    const freeCount = freeUsage?.remaining_count || 0;

    // 获取所有激活码次数详情
    const activationUsages = await db
      .prepare('SELECT activation_code, remaining_count FROM device_activation_usage WHERE device_id = ? AND remaining_count > 0')
      .bind(deviceId)
      .all() as any;

    let activationCount = 0;
    const activationDetails: Array<{code: string, count: number}> = [];
    
    if (activationUsages.results) {
      activationUsages.results.forEach((item: any) => {
        const count = item.remaining_count || 0;
        activationCount += count;
        activationDetails.push({
          code: item.activation_code,
          count: count,
        });
      });
    }

    const totalCount = freeCount + activationCount;

    // 验证客户端缓存（混合存储策略）
    const clientCountValid = clientCount !== undefined && Math.abs(clientCount - totalCount) <= 1; // 允许1次误差（并发情况）
    const needsSync = !clientCountValid && clientCount !== undefined;

    // 更新 user_credits 缓存
    if (userCredits.total_credits !== totalCount || userCredits.free_credits !== freeCount || userCredits.activation_credits !== activationCount) {
      await db.prepare(
        'UPDATE user_credits SET free_credits = ?, activation_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
      ).bind(freeCount, activationCount, totalCount, now, now, deviceId).run();
    }

    return NextResponse.json({
      success: true,
      freeCount,
      activationCount,
      totalCount,
      activationDetails, // 返回激活码详情
      clientCountValid, // 客户端缓存是否有效
      needsSync, // 是否需要同步
      lastVerified: userCredits.last_verified_at,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Check usage error:', error);
    return NextResponse.json(
      { error: '查询使用次数失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
