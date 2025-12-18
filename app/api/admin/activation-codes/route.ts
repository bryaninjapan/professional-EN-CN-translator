import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { verifyAdmin } from '@/lib/admin';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// 生成激活码
function generateActivationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET: 获取所有激活码列表
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

    // 获取所有激活码
    const codes = await db
      .prepare('SELECT * FROM activation_codes ORDER BY created_at DESC')
      .all();

    // 获取每个激活码的使用统计
    const codesWithStats = await Promise.all(
      (codes.results || []).map(async (code: any) => {
        // 统计激活的设备数
        const deviceCount = await db
          .prepare('SELECT COUNT(*) as count FROM device_activations WHERE activation_code = ?')
          .bind(code.code)
          .first();

        // 统计总使用次数
        const usageCount = await db
          .prepare('SELECT COUNT(*) as count FROM usage_records WHERE activation_code = ?')
          .bind(code.code)
          .first();

        // 统计剩余次数总和
        const remainingCount = await db
          .prepare('SELECT SUM(remaining_count) as total FROM device_activation_usage WHERE activation_code = ?')
          .bind(code.code)
          .first();

        return {
          ...code,
          deviceCount: (deviceCount as any)?.count || 0,
          usageCount: (usageCount as any)?.count || 0,
          remainingCount: (remainingCount as any)?.total || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      codes: codesWithStats,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Get activation codes error:', error);
    return NextResponse.json(
      { error: '获取激活码列表失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: 创建新激活码
export async function POST(req: Request) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { type, initialCount, count = 1 } = await req.json();

    if (!type || !initialCount || initialCount <= 0) {
      return NextResponse.json(
        { error: '类型和初始次数不能为空，且次数必须大于0' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (type !== 'free' && type !== 'paid') {
      return NextResponse.json(
        { error: '类型必须是 free 或 paid' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const createdCodes = [];
    const createCount = Math.min(count || 1, 100); // 最多一次创建100个

    for (let i = 0; i < createCount; i++) {
      let code = generateActivationCode();
      let exists = true;
      let attempts = 0;

      // 确保激活码唯一
      while (exists && attempts < 10) {
        const existing = await db
          .prepare('SELECT code FROM activation_codes WHERE code = ?')
          .bind(code)
          .first();
        
        if (!existing) {
          exists = false;
        } else {
          code = generateActivationCode();
          attempts++;
        }
      }

      if (exists) {
        return NextResponse.json(
          { error: '无法生成唯一激活码，请重试' },
          { status: 500, headers: corsHeaders }
        );
      }

      await db.prepare(
        'INSERT INTO activation_codes (code, type, initial_count, created_at, created_by) VALUES (?, ?, ?, ?, ?)'
      ).bind(code, type, initialCount, Math.floor(Date.now() / 1000), 'admin').run();

      createdCodes.push(code);
    }

    return NextResponse.json({
      success: true,
      codes: createdCodes,
      message: `成功创建 ${createdCodes.length} 个激活码`,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Create activation code error:', error);
    return NextResponse.json(
      { error: '创建激活码失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE: 删除激活码
export async function DELETE(req: Request) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: '激活码不能为空' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // 删除激活码
    const result = await db
      .prepare('DELETE FROM activation_codes WHERE code = ?')
      .bind(code)
      .run();

    if (result.meta.changes === 0) {
      return NextResponse.json(
        { error: '激活码不存在' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: '激活码已删除',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Delete activation code error:', error);
    return NextResponse.json(
      { error: '删除激活码失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
