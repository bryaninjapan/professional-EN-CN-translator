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
    const now = Math.floor(Date.now() / 1000);

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
      .first() as any;

    let creditsAdded = activationCode.initial_count;
    let isNewActivation = false;

    if (existingActivation) {
      // 已激活，支持叠加：再次激活可累加次数
      const existingUsage = await db
        .prepare('SELECT remaining_count FROM device_activation_usage WHERE device_id = ? AND activation_code = ?')
        .bind(deviceId, code)
        .first() as any;

      const currentCount = existingUsage?.remaining_count || 0;
      const newCount = currentCount + activationCode.initial_count;

      // 更新剩余次数（叠加）
      await db.prepare(
        'UPDATE device_activation_usage SET remaining_count = ?, updated_at = ? WHERE device_id = ? AND activation_code = ?'
      ).bind(newCount, now, deviceId, code).run();

      // 记录激活详情（如果表存在，忽略外键约束错误）
      try {
        await db.prepare(
          'INSERT INTO activation_details (device_id, activation_code, credits_added, activated_at) VALUES (?, ?, ?, ?)'
        ).bind(deviceId, code, activationCode.initial_count, now).run();
      } catch (e: any) {
        // 如果表不存在或外键约束失败，忽略错误（向后兼容）
        const errorMsg = e?.message || String(e);
        if (!errorMsg.includes('no such table') && !errorMsg.includes('FOREIGN KEY')) {
          console.error('activation_details insert error:', e);
        }
      }

      // 更新 user_credits 缓存（如果表存在）
      let userCredits: any = null;
      try {
        userCredits = await db
          .prepare('SELECT * FROM user_credits WHERE device_id = ?')
          .bind(deviceId)
          .first() as any;

        if (userCredits) {
          const newActivationCredits = (userCredits.activation_credits || 0) + activationCode.initial_count;
          const newTotalCredits = (userCredits.free_credits || 0) + newActivationCredits;
          await db.prepare(
            'UPDATE user_credits SET activation_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
          ).bind(newActivationCredits, newTotalCredits, now, now, deviceId).run();
        }
      } catch (e) {
        // 如果表不存在，忽略错误（向后兼容）
        console.warn('user_credits table may not exist:', e);
      }

      // 获取免费次数用于计算总数
      const freeUsage = await db
        .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
        .bind(deviceId)
        .first() as any;
      const freeCount = freeUsage?.remaining_count || 0;

      return NextResponse.json({
        success: true,
        message: '激活码已叠加，次数已累加',
        creditsAdded: activationCode.initial_count,
        remainingCount: newCount,
        totalRemainingCount: newCount + freeCount,
        type: activationCode.type,
      }, { headers: corsHeaders });
    }

    // 首次激活，创建记录
    isNewActivation = true;
    await db.prepare(
      'INSERT INTO device_activations (device_id, activation_code, activated_at) VALUES (?, ?, ?)'
    ).bind(deviceId, code, now).run();

    // 创建使用次数记录
    await db.prepare(
      'INSERT INTO device_activation_usage (device_id, activation_code, remaining_count, updated_at) VALUES (?, ?, ?, ?)'
    ).bind(deviceId, code, activationCode.initial_count, now).run();

    // 记录激活详情（如果表存在，忽略外键约束错误）
    try {
      await db.prepare(
        'INSERT INTO activation_details (device_id, activation_code, credits_added, activated_at) VALUES (?, ?, ?, ?)'
      ).bind(deviceId, code, activationCode.initial_count, now).run();
    } catch (e: any) {
      // 如果表不存在或外键约束失败，忽略错误（向后兼容）
      const errorMsg = e?.message || String(e);
      if (!errorMsg.includes('no such table') && !errorMsg.includes('FOREIGN KEY')) {
        console.error('activation_details insert error:', e);
      }
    }

    // 更新或创建 user_credits 缓存（如果表存在）
    let userCredits: any = null;
    try {
      userCredits = await db
        .prepare('SELECT * FROM user_credits WHERE device_id = ?')
        .bind(deviceId)
        .first() as any;

      if (userCredits) {
        const newActivationCredits = (userCredits.activation_credits || 0) + activationCode.initial_count;
        const newTotalCredits = (userCredits.free_credits || 0) + newActivationCredits;
        await db.prepare(
          'UPDATE user_credits SET activation_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
        ).bind(newActivationCredits, newTotalCredits, now, now, deviceId).run();
      } else {
        // 如果 user_credits 不存在，创建它
        const freeUsage = await db
          .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
          .bind(deviceId)
          .first() as any;
        const freeCount = freeUsage?.remaining_count || 3;
        await db.prepare(
          'INSERT INTO user_credits (device_id, free_credits, activation_credits, total_credits, last_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(deviceId, freeCount, activationCode.initial_count, freeCount + activationCode.initial_count, now, now, now).run();
      }
    } catch (e) {
      // 如果表不存在，忽略错误（向后兼容）
      console.warn('user_credits table may not exist:', e);
    }

    // 获取免费次数用于计算总数
    const freeUsage = await db
      .prepare('SELECT remaining_count FROM device_free_usage WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;
    const freeCount = freeUsage?.remaining_count || 0;

    return NextResponse.json({
      success: true,
      message: '激活成功',
      creditsAdded: activationCode.initial_count,
      remainingCount: activationCode.initial_count,
      totalRemainingCount: activationCode.initial_count + freeCount,
      type: activationCode.type,
      isNewActivation,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Activate error:', error);
    return NextResponse.json(
      { error: '激活失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
