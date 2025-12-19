import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getClientIP, generateDeviceFingerprint, getDeviceInfo } from '@/lib/db';

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
    const deviceInfo = getDeviceInfo(req);

    // 生成设备指纹
    const fingerprint = await generateDeviceFingerprint(req, deviceId);

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

    // 防止自己使用自己的邀请码（自邀请检测）
    if (inviteCode.creator_device_id === deviceId) {
      return NextResponse.json(
        { error: '不能使用自己创建的邀请码' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 设备指纹验证：检查是否有相同指纹的设备使用过此邀请码
    const fingerprintCheck = await db
      .prepare('SELECT * FROM device_invite_usage WHERE invite_code = ? AND device_fingerprint = ?')
      .bind(code, fingerprint)
      .first() as any;

    if (fingerprintCheck) {
      return NextResponse.json(
        { error: '检测到相同设备指纹，无法重复使用邀请码' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 检查是否已经使用过这个邀请码（设备ID检查）
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

    // 检查邀请码是否已被使用（唯一性检查）
    // 注意：这里我们允许一个邀请码被多个不同设备使用，但每个设备只能使用一次

    const now = Math.floor(Date.now() / 1000);

    // 记录使用（包含设备指纹和IP）
    await db.prepare(
      'INSERT INTO device_invite_usage (device_id, invite_code, used_at, device_fingerprint, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(deviceId, code, now, fingerprint, ip).run();

    // 更新或创建设备指纹记录
    const existingFingerprint = await db
      .prepare('SELECT * FROM device_fingerprints WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;

    if (existingFingerprint) {
      await db.prepare(
        'UPDATE device_fingerprints SET fingerprint_hash = ?, user_agent = ?, ip_address = ?, last_seen_at = ? WHERE device_id = ?'
      ).bind(fingerprint, deviceInfo.userAgent, ip, now, deviceId).run();
    } else {
      await db.prepare(
        'INSERT INTO device_fingerprints (device_id, fingerprint_hash, user_agent, ip_address, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(deviceId, fingerprint, deviceInfo.userAgent, ip, now, now).run();
    }

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
      ).bind(INVITE_REWARD_COUNT, now, deviceId).run();
    } else {
      await db.prepare(
        'INSERT INTO device_free_usage (device_id, remaining_count, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(deviceId, INVITE_REWARD_COUNT, now, now).run();
    }

    // 更新被邀请者的 user_credits 缓存
    const inviteeCredits = await db
      .prepare('SELECT * FROM user_credits WHERE device_id = ?')
      .bind(deviceId)
      .first() as any;

    if (inviteeCredits) {
      const newFreeCredits = (inviteeCredits.free_credits || 0) + INVITE_REWARD_COUNT;
      const newTotalCredits = newFreeCredits + (inviteeCredits.activation_credits || 0);
      await db.prepare(
        'UPDATE user_credits SET free_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
      ).bind(newFreeCredits, newTotalCredits, now, now, deviceId).run();
    } else {
      await db.prepare(
        'INSERT INTO user_credits (device_id, free_credits, total_credits, last_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(deviceId, INVITE_REWARD_COUNT, INVITE_REWARD_COUNT, now, now, now).run();
    }

    // 给邀请者增加免费次数
    const creatorFreeUsage = await db
      .prepare('SELECT * FROM device_free_usage WHERE device_id = ?')
      .bind(inviteCode.creator_device_id)
      .first() as any;

    if (creatorFreeUsage) {
      await db.prepare(
        'UPDATE device_free_usage SET remaining_count = remaining_count + ?, updated_at = ? WHERE device_id = ?'
      ).bind(INVITE_REWARD_COUNT, now, inviteCode.creator_device_id).run();
    } else {
      await db.prepare(
        'INSERT INTO device_free_usage (device_id, remaining_count, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(inviteCode.creator_device_id, INVITE_REWARD_COUNT, now, now).run();
    }

    // 更新邀请者的 user_credits 缓存
    const creatorCredits = await db
      .prepare('SELECT * FROM user_credits WHERE device_id = ?')
      .bind(inviteCode.creator_device_id)
      .first() as any;

    if (creatorCredits) {
      const newFreeCredits = (creatorCredits.free_credits || 0) + INVITE_REWARD_COUNT;
      const newTotalCredits = newFreeCredits + (creatorCredits.activation_credits || 0);
      await db.prepare(
        'UPDATE user_credits SET free_credits = ?, total_credits = ?, last_verified_at = ?, updated_at = ? WHERE device_id = ?'
      ).bind(newFreeCredits, newTotalCredits, now, now, inviteCode.creator_device_id).run();
    } else {
      await db.prepare(
        'INSERT INTO user_credits (device_id, free_credits, total_credits, last_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(inviteCode.creator_device_id, INVITE_REWARD_COUNT, INVITE_REWARD_COUNT, now, now, now).run();
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
