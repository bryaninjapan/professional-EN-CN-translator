import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { verifyAdmin } from '@/lib/admin';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // 总使用次数
    const totalUsage = await db
      .prepare('SELECT COUNT(*) as count FROM usage_records')
      .first();

    // 总设备数
    const totalDevices = await db
      .prepare('SELECT COUNT(DISTINCT device_id) as count FROM usage_records')
      .first();

    // 激活码统计
    const activationCodeStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN type = 'free' THEN 1 ELSE 0 END) as free_count,
          SUM(CASE WHEN type = 'paid' THEN 1 ELSE 0 END) as paid_count
        FROM activation_codes
      `)
      .first();

    // 邀请码统计
    const inviteCodeStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(used_count) as total_used
        FROM invite_codes
      `)
      .first();

    // 最近7天的使用统计
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const recentUsage = await db
      .prepare('SELECT COUNT(*) as count FROM usage_records WHERE used_at >= ?')
      .bind(sevenDaysAgo)
      .first();

    // 按激活码统计使用情况（TOP 10）
    const topActivationCodes = await db
      .prepare(`
        SELECT 
          activation_code,
          COUNT(*) as usage_count,
          COUNT(DISTINCT device_id) as device_count
        FROM usage_records
        WHERE activation_code IS NOT NULL
        GROUP BY activation_code
        ORDER BY usage_count DESC
        LIMIT 10
      `)
      .all();

    // 按邀请码统计使用情况（TOP 10）
    const topInviteCodes = await db
      .prepare(`
        SELECT 
          invite_code,
          COUNT(*) as usage_count,
          COUNT(DISTINCT device_id) as device_count
        FROM usage_records
        WHERE invite_code IS NOT NULL
        GROUP BY invite_code
        ORDER BY usage_count DESC
        LIMIT 10
      `)
      .all();

    return NextResponse.json({
      success: true,
      stats: {
        totalUsage: (totalUsage as any)?.count || 0,
        totalDevices: (totalDevices as any)?.count || 0,
        activationCodes: {
          total: (activationCodeStats as any)?.total || 0,
          free: (activationCodeStats as any)?.free_count || 0,
          paid: (activationCodeStats as any)?.paid_count || 0,
        },
        inviteCodes: {
          total: (inviteCodeStats as any)?.total || 0,
          totalUsed: (inviteCodeStats as any)?.total_used || 0,
        },
        recentUsage: {
          last7Days: (recentUsage as any)?.count || 0,
        },
        topActivationCodes: (topActivationCodes.results || []).map((item: any) => ({
          code: item.activation_code,
          usageCount: item.usage_count,
          deviceCount: item.device_count,
        })),
        topInviteCodes: (topInviteCodes.results || []).map((item: any) => ({
          code: item.invite_code,
          usageCount: item.usage_count,
          deviceCount: item.device_count,
        })),
      },
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: '获取统计信息失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
