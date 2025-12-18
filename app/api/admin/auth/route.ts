import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: '验证成功',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Auth verify error:', error);
    return NextResponse.json(
      { error: '验证失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
