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

// Prompt: 明确要求不输出标题行，只输出内容，以便前端自定义标题
const SYSTEM_PROMPT = `
你是一位精通英语和中文的专业翻译专家及语言学家。你的任务是处理用户的英文输入。

重要：
1. 不要输出任何前置句子、问候语或解释性文字。
2. 不要输出 "## 1. 精准翻译" 这样的 Markdown 标题，直接输出内容即可。
3. 请严格使用 "---SECTION_SEPARATOR---" 作为三个部分的分隔符。

请严格按照以下顺序输出三部分内容：

[Part 1: 精准翻译]
在此处提供流畅、信达雅的中文全篇翻译。如果是长文档，请分段落翻译。

---SECTION_SEPARATOR---

[Part 2: 专业术语表]
使用 Markdown 表格列出文中的专业术语、行业黑话或特定搭配。如果没有则写"无"。
格式：
| 英文原文 | 中文翻译 | 解释/备注 |
| :--- | :--- | :--- |

---SECTION_SEPARATOR---

[Part 3: 难点与语境解析]
指出文中难以理解的长难句、文化背景或隐含的双关语，并解释翻译时的考量。
`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const text = formData.get('text') as string;
    
    // 优先从 Header 获取 Key，否则使用环境变量
    const apiKey = req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: "未提供 API Key",
        details: "请在设置中输入您的 Gemini API Key"
      }, { status: 401, headers: corsHeaders });
    }

    if (!text) {
      return NextResponse.json({ error: "请输入需要翻译的文本" }, { status: 400, headers: corsHeaders });
    }

    // 获取模型实例
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      systemInstruction: SYSTEM_PROMPT
    });

    console.log("正在调用 Gemini API 进行文本翻译...");
    
    const result = await model.generateContent(text);
    const response = await result.response;
    const reply = response.text();
    
    console.log("Gemini API 调用成功，响应长度:", reply.length);

    return NextResponse.json({ 
      result: reply
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("API Error:", error);
    
    let errorMessage = "翻译处理失败";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      if (error.message.includes('API_KEY')) {
        errorMessage = "API Key 无效";
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        errorMessage = "API 配额已用完";
      }
    } else {
      errorDetails = String(error);
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500, headers: corsHeaders });
  }
}
