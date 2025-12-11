import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 为空" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // 使用轻量模型测试

    // 发送一个极简请求来验证 Key
    await model.generateContent("Test");

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("API Key 测试失败:", error);
    return NextResponse.json({ 
      error: "API Key 无效或无法访问",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 400 });
  }
}
