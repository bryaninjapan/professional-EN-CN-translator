import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key',
};

// 处理 preflight 请求
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 为空" }, { status: 400, headers: corsHeaders });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // 使用轻量模型测试

    // 发送一个极简请求来验证 Key
    await model.generateContent("Test");

    return NextResponse.json({ success: true }, { headers: corsHeaders });

  } catch (error) {
    console.error("API Key 测试失败:", error);
    return NextResponse.json({ 
      error: "API Key 无效或无法访问",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 400, headers: corsHeaders });
  }
}
