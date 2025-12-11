'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, ArrowRightLeft, Copy, Check, Settings, Save, Download, PlayCircle } from 'lucide-react';

// 类型定义
type TranslationSections = {
  translation: string;
  terms: string;
  analysis: string;
};

// 工具函数：下载文件
const downloadMarkdown = (sections: TranslationSections, sourceText: string) => {
  const content = `# 翻译结果

## 原文
${sourceText}

---

## 1. 原文翻译
${sections.translation}

---

## 2. 专业术语表
${sections.terms}

---

## 3. 难点与语境解析
${sections.analysis}
`;
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `translation_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function Home() {
  // 状态管理
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [sections, setSections] = useState<TranslationSections>({
    translation: '',
    terms: '',
    analysis: ''
  });

  // 复制状态
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});

  // 初始化加载 API Key
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySaved(true);
    }
  }, []);

  // 保存 API Key
  const saveKey = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setIsKeySaved(true);
    alert('API Key 已保存');
  };

  // 测试 API Key
  const testKey = async () => {
    if (!apiKey.trim()) return;
    setIsTestingKey(true);
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (res.ok) {
        alert('✅ API Key 测试通过！');
      } else {
        const data = await res.json();
        alert(`❌ 测试失败: ${data.error}`);
      }
    } catch (e) {
      alert('❌ 网络请求失败');
    } finally {
      setIsTestingKey(false);
    }
  };

  // 翻译处理
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    if (!apiKey) {
      alert('请先设置 Gemini API Key');
      return;
    }

    setIsLoading(true);
    // 清空之前的结果
    setSections({ translation: '', terms: '', analysis: '' });

    const formData = new FormData();
    formData.append('text', inputText);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'x-gemini-api-key': apiKey // 通过 Header 传递 Key
        },
        body: formData,
      });

      const data = await res.json();

      if (data.result) {
        // 解析结果
        const parts = data.result.split('---SECTION_SEPARATOR---');
        setSections({
          translation: parts[0]?.trim() || '无内容',
          terms: parts[1]?.trim() || '无',
          analysis: parts[2]?.trim() || '无'
        });
      } else {
        alert(`翻译失败: ${data.error || '未知错误'} \n ${data.details || ''}`);
      }
    } catch (error) {
      console.error("请求错误:", error);
      alert("网络请求失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 复制功能
  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* 顶部栏：API Key 设置 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm flex-wrap gap-4">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-blue-600 bg-blue-50 p-1 rounded">EN</span> Translator
        </h1>
        
        <div className="flex items-center gap-2 flex-1 max-w-2xl justify-end">
          <div className="relative flex-1 max-w-md flex items-center">
            <Settings size={16} className="absolute left-3 text-gray-400" />
            <input 
              type="password" 
              placeholder="Enter Gemini API Key..."
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setIsKeySaved(false); }}
              className={`w-full pl-9 pr-2 py-2 border rounded-l-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isKeySaved ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
            />
          </div>
          <div className="flex -ml-2 rounded-r-lg overflow-hidden border border-l-0 border-gray-300">
            <button 
              onClick={saveKey}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 text-sm font-medium border-r border-gray-300 transition-colors flex items-center gap-1"
              title="保存 API Key"
            >
              <Save size={16} /> 保存
            </button>
            <button 
              onClick={testKey}
              disabled={isTestingKey || !apiKey}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
              title="测试 API Key"
            >
              {isTestingKey ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />} 测试
            </button>
          </div>
        </div>
      </div>

      {/* 主体内容：双栏布局 */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* 左侧：输入区域 */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white h-1/2 md:h-full min-w-[350px]">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              📄 原文 (English)
            </span>
            <span className="text-xs text-gray-400">{inputText.length} chars</span>
          </div>
          <textarea
            className="flex-1 w-full p-6 resize-none focus:outline-none text-lg leading-relaxed text-gray-700 font-mono"
            placeholder="在此粘贴需要翻译的英文文本..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <button
              onClick={handleTranslate}
              disabled={isLoading || !inputText || !apiKey}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  正在深度翻译...
                </>
              ) : (
                <>
                  <ArrowRightLeft size={20} />
                  开始全流程翻译
                </>
              )}
            </button>
          </div>
        </div>

        {/* 右侧：结果区域 (三段式) */}
        <div className="flex-[1.5] flex flex-col bg-gray-50 h-1/2 md:h-full overflow-hidden relative">
          
          {/* 工具栏 */}
          <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              ✨ 翻译结果
            </span>
            {sections.translation && (
              <button 
                onClick={() => downloadMarkdown(sections, inputText)}
                className="flex items-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition-colors shadow-sm"
              >
                <Download size={14} />
                下载 MD
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {!sections.translation && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <ArrowRightLeft size={32} className="opacity-20" />
                </div>
                <p className="text-sm">等待输入...</p>
              </div>
            ) : null}

            {/* 卡片 1: 原文翻译 */}
            {(sections.translation || isLoading) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
                  <h3 className="font-bold text-blue-800 text-sm">1. 原文翻译</h3>
                  <button 
                    onClick={() => copyToClipboard(sections.translation, 'trans')}
                    className="text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-100 transition-colors"
                  >
                    {copyStatus['trans'] ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="p-5 prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  {isLoading && !sections.translation ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                      <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                    </div>
                  ) : (
                    <ReactMarkdown>{sections.translation}</ReactMarkdown>
                  )}
                </div>
              </div>
            )}

            {/* 卡片 2: 专业术语 */}
            {(sections.terms || isLoading) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex justify-between items-center">
                  <h3 className="font-bold text-amber-800 text-sm">2. 专业术语表</h3>
                  <button 
                    onClick={() => copyToClipboard(sections.terms, 'terms')}
                    className="text-amber-400 hover:text-amber-600 p-1 rounded hover:bg-amber-100 transition-colors"
                  >
                    {copyStatus['terms'] ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="p-5 prose prose-sm max-w-none">
                  {isLoading && !sections.terms ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-8 bg-gray-100 rounded w-full"></div>
                      <div className="h-8 bg-gray-100 rounded w-full"></div>
                    </div>
                  ) : (
                    <ReactMarkdown>{sections.terms}</ReactMarkdown>
                  )}
                </div>
              </div>
            )}

            {/* 卡片 3: 解析 */}
            {(sections.analysis || isLoading) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-10">
                <div className="bg-purple-50 px-4 py-2 border-b border-purple-100 flex justify-between items-center">
                  <h3 className="font-bold text-purple-800 text-sm">3. 难点与语境解析</h3>
                  <button 
                    onClick={() => copyToClipboard(sections.analysis, 'analysis')}
                    className="text-purple-400 hover:text-purple-600 p-1 rounded hover:bg-purple-100 transition-colors"
                  >
                    {copyStatus['analysis'] ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="p-5 prose prose-sm max-w-none text-gray-700">
                  {isLoading && !sections.analysis ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                      <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                    </div>
                  ) : (
                    <ReactMarkdown>{sections.analysis}</ReactMarkdown>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
