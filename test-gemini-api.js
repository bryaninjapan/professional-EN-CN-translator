const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// 读取 .env.local 文件（处理文件名可能有空格的情况）
function loadEnvFile() {
  // 尝试多个可能的文件名
  const possiblePaths = [
    path.join(__dirname, '.env.local'),
    path.join(__dirname, ' .env.local'), // 文件名前可能有空格
  ];
  
  let envPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }
  
  if (!envPath) {
    console.error('❌ 找不到 .env.local 文件');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

// 使用 HTTP 请求列出可用模型
async function listAvailableModels(apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    throw new Error(`获取模型列表失败: ${error.message}`);
  }
}

async function testGeminiAPI() {
  console.log('🔍 开始测试 Gemini API Key...\n');
  
  // 加载环境变量
  const envVars = loadEnvFile();
  const apiKey = envVars.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ 在 .env.local 中未找到 GEMINI_API_KEY');
    process.exit(1);
  }
  
  console.log(`📝 API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}\n`);
  
  try {
    // 初始化 Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 测试 1: 列出可用的模型
    console.log('📋 正在获取可用的 Gemini 模型列表...\n');
    let availableModels = [];
    
    try {
      const models = await listAvailableModels(apiKey);
      
      if (models.length === 0) {
        console.log('⚠️  未找到可用模型');
      } else {
        console.log(`✅ 找到 ${models.length} 个可用模型：\n`);
        
        // 过滤出支持 generateContent 的模型
        const generateContentModels = models.filter(model => 
          model.supportedGenerationMethods && 
          model.supportedGenerationMethods.includes('generateContent')
        );
        
        console.log('📝 支持 generateContent 的模型：\n');
        generateContentModels.forEach(model => {
          const modelName = model.name.replace('models/', '');
          availableModels.push(modelName);
          
          console.log(`   ✅ ${modelName}`);
          if (model.displayName) {
            console.log(`      显示名称: ${model.displayName}`);
          }
          if (model.description) {
            console.log(`      描述: ${model.description.substring(0, 80)}...`);
          }
          if (model.inputTokenLimit) {
            console.log(`      输入 Token 限制: ${model.inputTokenLimit.toLocaleString()}`);
          }
          if (model.outputTokenLimit) {
            console.log(`      输出 Token 限制: ${model.outputTokenLimit.toLocaleString()}`);
          }
          console.log('');
        });
        
        console.log(`\n📊 模型统计：`);
        console.log(`   总模型数: ${models.length}`);
        console.log(`   支持 generateContent: ${generateContentModels.length}`);
      }
      
    } catch (error) {
      console.error(`\n❌ 获取模型列表时出错: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('403')) {
        console.error(`\n⚠️  API Key 可能无效或没有权限`);
        process.exit(1);
      }
    }
    
    // 测试 2: 使用实际可用的模型进行测试
    console.log(`\n\n🧪 测试模型实际功能...\n`);
    
    // 优先测试项目使用的模型，如果不可用则测试第一个可用模型
    const testModelName = availableModels.includes('gemini-1.5-pro') 
      ? 'gemini-1.5-pro' 
      : (availableModels.length > 0 ? availableModels[0] : null);
    
    if (!testModelName) {
      console.error(`❌ 没有可用的模型进行测试`);
      process.exit(1);
    }
    
    console.log(`📝 测试模型: ${testModelName}\n`);
    
    try {
      const model = genAI.getGenerativeModel({ 
        model: testModelName
      });
      
      const testPrompt = '请用中文回答：1+1等于几？';
      console.log(`📤 发送测试消息: "${testPrompt}"`);
      
      const result = await model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`📥 收到回复: "${text}"`);
      console.log(`\n✅ API Key 验证成功！${testModelName} 模型工作正常。`);
      
      // 显示使用统计
      if (response.usageMetadata) {
        console.log(`\n📈 使用统计:`);
        console.log(`   Prompt Tokens: ${response.usageMetadata.promptTokenCount || 'N/A'}`);
        console.log(`   Completion Tokens: ${response.usageMetadata.candidatesTokenCount || 'N/A'}`);
        console.log(`   Total Tokens: ${response.usageMetadata.totalTokenCount || 'N/A'}`);
      }
      
      // 如果项目使用的模型不可用，给出建议
      if (testModelName !== 'gemini-1.5-pro' && availableModels.includes('gemini-1.5-pro') === false) {
        console.log(`\n⚠️  注意：项目代码中使用的模型 "gemini-1.5-pro" 不可用。`);
        console.log(`   建议使用以下可用模型之一：`);
        availableModels.slice(0, 3).forEach(model => {
          console.log(`   - ${model}`);
        });
      }
      
    } catch (error) {
      console.error(`\n❌ 测试 ${testModelName} 时出错:`);
      console.error(`   错误信息: ${error.message}`);
      
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
        console.error(`\n⚠️  API Key 可能无效或已过期`);
      } else if (error.message.includes('404')) {
        console.error(`\n⚠️  模型 ${testModelName} 可能不存在或不可用`);
      } else if (error.message.includes('quota') || error.message.includes('429')) {
        console.error(`\n⚠️  API 配额可能已用完或请求过于频繁`);
      }
      
      throw error;
    }
    
    console.log(`\n\n✅ 所有测试完成！`);
    
  } catch (error) {
    console.error(`\n\n❌ 测试失败:`);
    console.error(`   错误类型: ${error.constructor.name}`);
    console.error(`   错误信息: ${error.message}`);
    
    if (error.stack) {
      console.error(`\n   堆栈跟踪:`);
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// 运行测试
testGeminiAPI().catch(console.error);










