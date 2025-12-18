import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getClientIP } from '@/lib/db';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const INVITE_REWARD_COUNT = 3; // 邀请奖励次数

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { code, deviceId } = await req.json();

    if (!code || !deviceId) {
      return NextResponse.json(
        { error: '邀请码和设备ID不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;
    const ip = getClientIP(req);

    // 查询邀请码
    const inviteCode = await db
      .prepare('SELECT * FROM invite_codes WHERE code = ?')
      .bind(code)
      .first() as any;

    if (!inviteCode) {
      return NextResponse.json(
        { error: '邀请码不存在' },
        { status: 404, headers: corsHeaders }
      );
    }

    // 防止自己使用自己的邀请码
    if (inviteCode.creator_device_id === deviceId) {
      return NextResponse.json(
        { error: '不能使用自己创建的邀请码' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 检查是否已经使用过这个邀请码
    const existingUsage = await db
      .prepare('SELECT * FROM device_invite_usage WHERE device_id = ? AND invite_code = ?')
      .bind(deviceId, code)
      .first() as any;

    if (existingUsage) {
      return NextResponse.json(
        { error: '您已经使用过此邀请码' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 记录使用
    await db.prepare(
      'INSERT INTO device_invite_usage (device_id, invite_code, used_at) VALUES (?, ?, ?)'
    ).bind(deviceId, code, Math.floor(Date.now() / 1000)).run();

    // 更新邀请码使用次数
    await db.prepare(
      'UPDATE invite_codes SET used_count = used_count + 1 WHERE code = ?'
    ).bind(code).run();

    // 给被邀请者增加免费次数
    const freeUsage = await db
      .prepare('SELECT * FROM device_free_usage WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;

    if (freeUsage) {
      await db.prepare(
        'UPDATE device_free_usage SET remaining_count = remaining_count + ?, updated_at = ? WHERE device_id = ?'
      ).bind(INVITE_REWARD_COUNT, Math.floor(Date.now() / 1000), deviceId).run();
    } else {
      await db.prepare(
        'INSERT INTO device_free_usage (device_id, remaining_count, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(deviceId, INVITE_REWARD_COUNT, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();
    }

    // 给邀请者增加免费次数
    const creatorFreeUsage = await db
      .prepare('SELECT * FROM device_free_usage WHERE device_id = ?')
      .bind(inviteCode.creator_device_id)
      .first() as any;

    if (creatorFreeUsage) {
      await db.prepare(
        'UPDATE device_free_usage SET remaining_count = remaining_count + ?, updated_at = ? WHERE device_id = ?'
      ).bind(INVITE_REWARD_COUNT, Math.floor(Date.now() / 1000), inviteCode.creator_device_id).run();
    } else {
      await db.prepare(
        'INSERT INTO device_free_usage (device_id, remaining_count, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(inviteCode.creator_device_id, INVITE_REWARD_COUNT, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();
    }

    return NextResponse.json({
      success: true,
      message: '邀请码使用成功，您和邀请者各获得3次免费使用次数',
      rewardCount: INVITE_REWARD_COUNT,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Use invite code error:', error);
    return NextResponse.json(
      { error: '使用邀请码失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
