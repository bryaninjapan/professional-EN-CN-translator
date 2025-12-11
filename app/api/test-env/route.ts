import { NextResponse } from 'next/server';

export async function GET() {
  // 检查环境变量是否被正确读取
  const apiKey = process.env.GEMINI_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPreview: apiKey 
      ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` 
      : '未设置',
    apiKeyHasSpaces: apiKey ? apiKey.trim() !== apiKey : false,
    nodeEnv: process.env.NODE_ENV,
    message: apiKey 
      ? '✅ API Key 已正确设置' 
      : '❌ API Key 未设置或无法读取'
  });
}

