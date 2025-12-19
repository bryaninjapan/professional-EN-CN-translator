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
    const { deviceId, textLength, clientCount } = await req.json();

    if (!deviceId || textLength === undefined) {
      return NextResponse.json(
        { error: '设备ID和文本长度不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const ip = getClientIP(req);
    const now = Math.floor(Date.now() / 1000);

    // 混合存储策略：验证客户端缓存
    if (clientCount !== undefined) {
      // 获取服务端真实次数
      const serverCheck = await db
        .prepare('SELECT total_credits FROM user_credits WHERE device_id = ?')
        .bind(deviceId)
        .first() as any;

      const serverCount = serverCheck?.total_credits;
      
      // 如果客户端和服务端差异过大（超过1次），拒绝请求并要求同步
      if (serverCount !== undefined && Math.abs(clientCount - serverCount) > 1) {
        return NextResponse.json(
          { 
            error: '客户端缓存与服务端不一致，请刷新页面',
            needsSync: true,
            serverCount: serverCount,
            clientCount: clientCount,
          },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // 先检查免费次数
    const freeUsage = await db
      .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;

    let freeCount = 0;
    if (freeUsage) {
      freeCount = freeUsage.remaining_count || 0;
    } else {
      // 首次使用，创建记录
      await db.prepare(
        'INSERT INTO device_free_usage (device_id, remaining_count, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(deviceId, 3, now, now).run();
      freeCount = 3;
      
      // 同时创建 user_credits 记录
      await db.prepare(
        'INSERT INTO user_credits (device_id, free_credits, total_credits, last_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(deviceId, 3, 3, now, now, now).run();
    }

    let usedFrom = 'free';
    let remainingCount = 0;
    let usedActivationCode: string | null = null;

    if (freeCount > 0) {
      // 使用免费次数
      const newCount = freeCount - 1;
      await db.prepare(
        'UPDATE device_free_usage SET remaining_count = ?, updated_at = ? WHERE device_id = ?'
      ).bind(newCount, now, deviceId).run();
      remainingCount = newCount;
      
      // 更新 user_credits 缓存
      const userCredits = await db
        .prepare('SELECT * FROM user_credits WHERE device_id = ?')
        .bind(deviceId)
        .first() as any;
      
      if (userCredits) {
        const newTotalCredits = newCount + (userCredits.activation_credits || 0);
        await db.prepare(
          'UPDATE user_credits SET free_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
        ).bind(newCount, newTotalCredits, now, now, deviceId).run();
      }
    } else {
      // 查找有剩余次数的激活码
      const activationUsages = await db
        .prepare('SELECT activation_code, remaining_count FROM device_activation_usage WHERE device_id = ? AND remaining_count > 0 ORDER BY updated_at ASC LIMIT 1')
        .bind(deviceId)
        .first() as any;

      if (activationUsages) {
        const actCode = activationUsages.activation_code;
        const actCount = activationUsages.remaining_count;
        const newCount = actCount - 1;
        
        await db.prepare(
          'UPDATE device_activation_usage SET remaining_count = ?, updated_at = ? WHERE device_id = ? AND activation_code = ?'
        ).bind(newCount, now, deviceId, actCode).run();
        
        remainingCount = newCount;
        usedFrom = 'activation';
        usedActivationCode = actCode;
        
        // 更新 user_credits 缓存
        const userCredits = await db
          .prepare('SELECT * FROM user_credits WHERE device_id = ?')
          .bind(deviceId)
          .first() as any;
        
        if (userCredits) {
          const newActivationCredits = (userCredits.activation_credits || 0) - 1;
          const newTotalCredits = (userCredits.free_credits || 0) + newActivationCredits;
          await db.prepare(
            'UPDATE user_credits SET activation_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
          ).bind(newActivationCredits, newTotalCredits, now, now, deviceId).run();
        }
      } else {
        return NextResponse.json(
          { error: '使用次数不足，请激活激活码或使用邀请码' },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // 记录使用（防止篡改）
    await db.prepare(
      'INSERT INTO usage_records (device_id, activation_code, ip_address, text_length, used_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(deviceId, usedActivationCode || null, ip, textLength, now).run();

    // 重新计算总次数（从源表计算，确保准确性）
    const updatedFreeUsage = await db
      .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;
    const updatedFreeCount = updatedFreeUsage ? updatedFreeUsage.remaining_count || 0 : 0;

    // 计算总激活码次数
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

    const totalRemaining = updatedFreeCount + totalActivationCount;
    
    // 确保 user_credits 缓存同步
    await db.prepare(
      'UPDATE user_credits SET free_credits = ?, activation_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
    ).bind(updatedFreeCount, totalActivationCount, totalRemaining, now, now, deviceId).run();

    return NextResponse.json({
      success: true,
      usedFrom,
      remainingCount: totalRemaining,
      freeCount: updatedFreeCount,
      activationCount: totalActivationCount,
      usedActivationCode: usedActivationCode, // 返回使用的激活码，用于失败时恢复
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Consume usage error:', error);
    return NextResponse.json(
      { error: '消耗使用次数失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
