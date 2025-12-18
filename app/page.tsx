'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, ArrowRightLeft, Copy, Check, Download, Languages, Key, Users, Gift, ShoppingCart } from 'lucide-react';

// 支持的语言配置（UI界面语言）
const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '简体中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'vi', name: 'Tiếng Việt' },
];

// 翻译目标语言配置
const TRANSLATION_TARGET_LANGUAGES = [
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'vi', name: 'Tiếng Việt' },
];

// UI 文本翻译映射
const UI_TEXT: Record<string, Record<string, string>> = {
  zh: {
    sourceText: '📄 原文 (English)',
    placeholder: '在此粘贴需要翻译的英文文本...',
    translateButton: '开始全流程翻译',
    translating: '正在深度翻译...',
    resultTitle: '✨ 翻译结果',
    waitingInput: '等待输入...',
    translationTitle: '1. 原文翻译',
    termsTitle: '2. 专业术语表',
    analysisTitle: '3. 难点与语境解析',
    downloadMD: '下载 MD',
    translationFailed: '翻译失败',
    networkError: '网络请求失败，请重试',
    noContent: '无内容',
    none: '无',
    remainingCount: '剩余次数',
    activateCode: '激活码',
    enterActivateCode: '输入激活码',
    activate: '激活',
    inviteFriend: '邀请朋友',
    myInviteCode: '我的邀请码',
    enterInviteCode: '输入邀请码',
    useInviteCode: '使用邀请码',
    generateInviteCode: '生成邀请码',
    noRemainingCount: '使用次数不足',
    activateCodeSuccess: '激活成功',
    inviteCodeSuccess: '邀请码使用成功',
    copyInviteCode: '复制邀请码',
    copied: '已复制',
    activating: '激活中...',
    using: '使用中...',
    enterLicenseKey: '请输入激活码',
    licenseKey: '激活码',
    activateSuccess: '激活成功',
    invalidLicenseKey: '激活码无效',
    creditsDepleted: '使用次数已用完',
    creditsDepletedMessage: '使用次数已用完，请购买新的激活码',
    pleaseActivate: '请输入激活码激活',
    creditsRemaining: '剩余次数',
    tableHeaderOriginal: '英文原文',
    tableHeaderTranslation: '翻译',
    tableHeaderNote: '解释/备注',
    purchaseLicense: '购买激活码',
    purchaseDescription: '购买激活码可获得 100 次翻译使用次数',
    goToGumroad: '前往 Gumroad 购买',
    purchaseNote: '购买后，激活码将通过邮件发送给您',
    close: '关闭',
    shareInviteCode: '分享此邀请码给朋友，双方各获得3次免费使用次数',
    inviteCodeReward: '您和邀请者各获得 {count} 次使用次数',
    enterInviteCodePrompt: '请输入邀请码',
    invalidInviteCodeFormat: '邀请码格式不正确，应以 INV- 开头',
    useInviteCodeFailed: '使用邀请码失败',
    receivedCredits: '获得 {count} 次使用次数',
    invalidActivateCodeFormat: '激活码格式不正确',
    activateFailed: '激活失败',
    enterTextToTranslate: '请输入需要翻译的文本',
    pleaseActivateOrUseInvite: '，请激活激活码或使用邀请码',
    unknownError: '未知错误',
    generateInviteCodeFailed: '生成邀请码失败',
    textTooLong: '文本过长，请分段翻译（最大50000字符）',
  },
  ja: {
    sourceText: '📄 原文 (English)',
    placeholder: '翻訳する英文をここに貼り付けてください...',
    translateButton: '全プロセス翻訳を開始',
    translating: '詳細翻訳中...',
    resultTitle: '✨ 翻訳結果',
    waitingInput: '入力を待っています...',
    translationTitle: '1. 原文翻訳',
    termsTitle: '2. 専門用語表',
    analysisTitle: '3. 難点と文脈解析',
    downloadMD: 'MDをダウンロード',
    translationFailed: '翻訳に失敗しました',
    networkError: 'ネットワークリクエストに失敗しました。再試行してください',
    noContent: 'コンテンツなし',
    none: 'なし',
    remainingCount: '残り回数',
    activateCode: 'アクティベーションコード',
    enterActivateCode: 'アクティベーションコードを入力',
    activate: 'アクティベート',
    inviteFriend: '友達を招待',
    myInviteCode: '私の招待コード',
    enterInviteCode: '招待コードを入力',
    useInviteCode: '招待コードを使用',
    generateInviteCode: '招待コードを生成',
    noRemainingCount: '使用回数が不足しています',
    activateCodeSuccess: 'アクティベーション成功',
    inviteCodeSuccess: '招待コード使用成功',
    copyInviteCode: '招待コードをコピー',
    copied: 'コピーしました',
    activating: 'アクティベーション中...',
    using: '使用中...',
    enterLicenseKey: 'ライセンスキーを入力してください',
    licenseKey: 'ライセンスキー',
    activateSuccess: '認証成功',
    invalidLicenseKey: '無効なキー',
    creditsDepleted: '使用回数終了',
    creditsDepletedMessage: '使用回数が終了しました。新しいライセンスキーを購入してください',
    pleaseActivate: 'ライセンスキーを入力して認証してください',
    creditsRemaining: '残り回数',
    tableHeaderOriginal: '英文原文',
    tableHeaderTranslation: '翻訳',
    tableHeaderNote: '説明/備考',
    purchaseLicense: 'アクティベーションコードを購入',
    purchaseDescription: 'アクティベーションコードを購入すると、100回の翻訳使用回数を獲得できます',
    goToGumroad: 'Gumroadで購入する',
    purchaseNote: '購入後、アクティベーションコードはメールで送信されます',
    close: '閉じる',
    shareInviteCode: 'この招待コードを友達にシェアすると、双方が3回の無料使用回数を獲得できます',
    inviteCodeReward: 'あなたと招待者がそれぞれ {count} 回の使用回数を獲得しました',
    enterInviteCodePrompt: '招待コードを入力してください',
    invalidInviteCodeFormat: '招待コードの形式が正しくありません。INV- で始まる必要があります',
    useInviteCodeFailed: '招待コードの使用に失敗しました',
    receivedCredits: '{count} 回の使用回数を獲得しました',
    invalidActivateCodeFormat: 'アクティベーションコードの形式が正しくありません',
    activateFailed: 'アクティベーションに失敗しました',
    enterTextToTranslate: '翻訳するテキストを入力してください',
    pleaseActivateOrUseInvite: '、アクティベーションコードをアクティベートするか、招待コードを使用してください',
    unknownError: '不明なエラー',
    generateInviteCodeFailed: '招待コードの生成に失敗しました',
    textTooLong: 'テキストが長すぎます。分割して翻訳してください（最大50000文字）',
  },
  ko: {
    sourceText: '📄 원문 (English)',
    placeholder: '번역할 영어 텍스트를 여기에 붙여넣으세요...',
    translateButton: '전체 프로세스 번역 시작',
    translating: '심층 번역 중...',
    resultTitle: '✨ 번역 결과',
    waitingInput: '입력 대기 중...',
    translationTitle: '1. 원문 번역',
    termsTitle: '2. 전문 용어표',
    analysisTitle: '3. 난점 및 맥락 분석',
    downloadMD: 'MD 다운로드',
    translationFailed: '번역 실패',
    networkError: '네트워크 요청 실패, 다시 시도해주세요',
    noContent: '내용 없음',
    none: '없음',
    remainingCount: '남은 횟수',
    activateCode: '활성화 코드',
    enterActivateCode: '활성화 코드 입력',
    activate: '활성화',
    inviteFriend: '친구 초대',
    myInviteCode: '내 초대 코드',
    enterInviteCode: '초대 코드 입력',
    useInviteCode: '초대 코드 사용',
    generateInviteCode: '초대 코드 생성',
    noRemainingCount: '사용 횟수가 부족합니다',
    activateCodeSuccess: '활성화 성공',
    inviteCodeSuccess: '초대 코드 사용 성공',
    copyInviteCode: '초대 코드 복사',
    copied: '복사됨',
    activating: '활성화 중...',
    using: '사용 중...',
    enterLicenseKey: '라이선스 키를 입력하세요',
    licenseKey: '라이선스 키',
    activateSuccess: '활성화 성공',
    invalidLicenseKey: '유효하지 않은 키',
    creditsDepleted: '사용 횟수 소진',
    creditsDepletedMessage: '사용 횟수가 소진되었습니다. 새로운 라이선스 키를 구매하세요',
    pleaseActivate: '라이선스 키를 입력하여 활성화하세요',
    creditsRemaining: '남은 횟수',
    tableHeaderOriginal: '영문 원문',
    tableHeaderTranslation: '번역',
    tableHeaderNote: '설명/비고',
    purchaseLicense: '활성화 코드 구매',
    purchaseDescription: '활성화 코드를 구매하면 100회의 번역 사용 횟수를 획득할 수 있습니다',
    goToGumroad: 'Gumroad에서 구매하기',
    purchaseNote: '구매 후, 활성화 코드는 이메일로 발송됩니다',
    close: '닫기',
    shareInviteCode: '이 초대 코드를 친구에게 공유하면, 양쪽 모두 3회의 무료 사용 횟수를 획득할 수 있습니다',
    inviteCodeReward: '당신과 초대자가 각각 {count}회의 사용 횟수를 획득했습니다',
    enterInviteCodePrompt: '초대 코드를 입력하세요',
    invalidInviteCodeFormat: '초대 코드 형식이 올바르지 않습니다. INV- 로 시작해야 합니다',
    useInviteCodeFailed: '초대 코드 사용 실패',
    receivedCredits: '{count}회의 사용 횟수를 획득했습니다',
    invalidActivateCodeFormat: '활성화 코드 형식이 올바르지 않습니다',
    activateFailed: '활성화 실패',
    enterTextToTranslate: '번역할 텍스트를 입력하세요',
    pleaseActivateOrUseInvite: ', 활성화 코드를 활성화하거나 초대 코드를 사용하세요',
    unknownError: '알 수 없는 오류',
    generateInviteCodeFailed: '초대 코드 생성 실패',
    textTooLong: '텍스트가 너무 깁니다. 분할하여 번역하세요 (최대 50000자)',
  },
  vi: {
    sourceText: '📄 Văn bản gốc (English)',
    placeholder: 'Dán văn bản tiếng Anh cần dịch vào đây...',
    translateButton: 'Bắt đầu dịch toàn bộ quy trình',
    translating: 'Đang dịch chi tiết...',
    resultTitle: '✨ Kết quả dịch',
    waitingInput: 'Đang chờ nhập liệu...',
    translationTitle: '1. Bản dịch văn bản gốc',
    termsTitle: '2. Bảng thuật ngữ chuyên ngành',
    analysisTitle: '3. Phân tích điểm khó và ngữ cảnh',
    downloadMD: 'Tải xuống MD',
    translationFailed: 'Dịch thất bại',
    networkError: 'Yêu cầu mạng thất bại, vui lòng thử lại',
    noContent: 'Không có nội dung',
    none: 'Không có',
    remainingCount: 'Số lần còn lại',
    activateCode: 'Mã kích hoạt',
    enterActivateCode: 'Nhập mã kích hoạt',
    activate: 'Kích hoạt',
    inviteFriend: 'Mời bạn bè',
    myInviteCode: 'Mã mời của tôi',
    enterInviteCode: 'Nhập mã mời',
    useInviteCode: 'Sử dụng mã mời',
    generateInviteCode: 'Tạo mã mời',
    noRemainingCount: 'Số lần sử dụng không đủ',
    activateCodeSuccess: 'Kích hoạt thành công',
    inviteCodeSuccess: 'Sử dụng mã mời thành công',
    copyInviteCode: 'Sao chép mã mời',
    copied: 'Đã sao chép',
    activating: 'Đang kích hoạt...',
    using: 'Đang sử dụng...',
    enterLicenseKey: 'Vui lòng nhập mã kích hoạt',
    licenseKey: 'Mã kích hoạt',
    activateSuccess: 'Kích hoạt thành công',
    invalidLicenseKey: 'Mã kích hoạt không hợp lệ',
    creditsDepleted: 'Số lần sử dụng đã hết',
    creditsDepletedMessage: 'Số lần sử dụng đã hết, vui lòng mua mã kích hoạt mới',
    pleaseActivate: 'Vui lòng nhập mã kích hoạt để kích hoạt',
    creditsRemaining: 'Số lần còn lại',
    tableHeaderOriginal: 'Văn bản gốc tiếng Anh',
    tableHeaderTranslation: 'Bản dịch',
    tableHeaderNote: 'Giải thích/Ghi chú',
    purchaseLicense: 'Mua mã kích hoạt',
    purchaseDescription: 'Mua mã kích hoạt để nhận 100 lần sử dụng dịch',
    goToGumroad: 'Đến Gumroad để mua',
    purchaseNote: 'Sau khi mua, mã kích hoạt sẽ được gửi qua email cho bạn',
    close: 'Đóng',
    shareInviteCode: 'Chia sẻ mã mời này cho bạn bè, cả hai bên sẽ nhận được 3 lần sử dụng miễn phí',
    inviteCodeReward: 'Bạn và người mời mỗi người nhận được {count} lần sử dụng',
    enterInviteCodePrompt: 'Vui lòng nhập mã mời',
    invalidInviteCodeFormat: 'Định dạng mã mời không đúng, phải bắt đầu bằng INV-',
    useInviteCodeFailed: 'Sử dụng mã mời thất bại',
    receivedCredits: 'Nhận được {count} lần sử dụng',
    invalidActivateCodeFormat: 'Định dạng mã kích hoạt không đúng',
    activateFailed: 'Kích hoạt thất bại',
    enterTextToTranslate: 'Vui lòng nhập văn bản cần dịch',
    pleaseActivateOrUseInvite: ', vui lòng kích hoạt mã kích hoạt hoặc sử dụng mã mời',
    unknownError: 'Lỗi không xác định',
    generateInviteCodeFailed: 'Tạo mã mời thất bại',
    textTooLong: 'Văn bản quá dài, vui lòng dịch từng phần (tối đa 50000 ký tự)',
  },
};

// API 基础 URL 配置（用于 GitHub Pages 静态部署时指向外部 API）
// GitHub Pages 部署时会自动使用 Vercel API
// 本地开发时使用相对路径（空字符串）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('github.io') 
    ? 'https://professional-en-cn-translator.vercel.app' 
    : '');

// 类型定义
type TranslationSections = {
  translation: string;
  terms: string;
  analysis: string;
};

// 生成设备ID
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    // 使用 crypto.randomUUID() 生成设备ID
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

// 工具函数：替换表格表头
const replaceTableHeaders = (text: string, uiLang: string, targetLang: string): string => {
  const t = UI_TEXT[uiLang] || UI_TEXT['zh'];
  const langNames: Record<string, string> = {
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    vi: 'Tiếng Việt',
  };
  const targetLangName = langNames[targetLang] || '中文';
  
  let result = text;
  
  // 匹配表格表头行，替换为当前UI语言
  // 匹配格式：| 英文原文 | 目标语言翻译 | 解释/备注 |
  // 需要匹配各种可能的表头格式，包括中文、日文、韩文、越南语
  
  // 匹配第一列：英文原文
  result = result.replace(/\|\s*英文原文\s*\|/g, `| ${t.tableHeaderOriginal} |`);
  
  // 匹配第二列：目标语言翻译（可能包含语言名称，如"越南语翻译"、"日本語翻译"等）
  const langPatterns = ['中文', '日本語', '한국어', 'Tiếng Việt', '越南语', '日语', '韩语'];
  langPatterns.forEach(lang => {
    result = result.replace(new RegExp(`\\|\\s*${lang}\\s*翻译\\s*\\|`, 'g'), `| ${targetLangName}${t.tableHeaderTranslation} |`);
  });
  // 也匹配没有语言名称的"翻译"
  result = result.replace(/\|\s*翻译\s*\|/g, `| ${targetLangName}${t.tableHeaderTranslation} |`);
  
  // 匹配第三列：解释/备注
  result = result.replace(/\|\s*解释\s*\/\s*备注\s*\|/g, `| ${t.tableHeaderNote} |`);
  result = result.replace(/\|\s*解释\/备注\s*\|/g, `| ${t.tableHeaderNote} |`);
  
  return result;
};

// 工具函数：下载文件
const downloadMarkdown = (sections: TranslationSections, sourceText: string, uiLang: string) => {
  const t = UI_TEXT[uiLang] || UI_TEXT['zh'];
  const content = `# ${t.resultTitle}

## ${t.sourceText}
${sourceText}

---

## ${t.translationTitle}
${sections.translation}

---

## ${t.termsTitle}
${sections.terms}

---

## ${t.analysisTitle}
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
  const [inputText, setInputText] = useState('');
  const [targetLang, setTargetLang] = useState('zh'); // 翻译目标语言
  const [uiLang, setUiLang] = useState('zh'); // UI界面语言
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const [isCheckingCount, setIsCheckingCount] = useState(false);
  
  // 激活码和邀请码相关状态
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activateCodeInput, setActivateCodeInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [myInviteCode, setMyInviteCode] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isUsingInvite, setIsUsingInvite] = useState(false);
  
  const [sections, setSections] = useState<TranslationSections>({
    translation: '',
    terms: '',
    analysis: ''
  });

  // 复制状态
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});

  // 获取UI文本（使用UI语言）
  const t = UI_TEXT[uiLang] || UI_TEXT['zh'];

  // 初始化设备ID和检查使用次数
  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    checkUsageCount(id);

    // 定期刷新使用次数（每30秒）
    const interval = setInterval(() => {
      if (id) {
        checkUsageCount(id);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 检查使用次数
  const checkUsageCount = async (deviceIdToCheck?: string) => {
    const id = deviceIdToCheck || deviceId;
    if (!id) return;

    setIsCheckingCount(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/usage/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setRemainingCount(data.totalCount);
      } else {
        // 如果检查失败，可能是首次使用，设置为0让用户知道需要激活
        if (data.error?.includes('设备ID')) {
          setRemainingCount(0);
        }
      }
    } catch (error) {
      console.error('检查使用次数失败:', error);
      // 网络错误时不更新，保持当前值
    } finally {
      setIsCheckingCount(false);
    }
  };

  // 激活码处理（使用服务器端系统）
  const handleActivate = async () => {
    const code = activateCodeInput.trim();
    if (!code || !deviceId) {
      alert(t.enterActivateCode);
      return;
    }

    // 验证激活码格式（至少4个字符）
    if (code.length < 4) {
      alert(t.invalidActivateCodeFormat);
      return;
    }

    setIsActivating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceId }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`${t.activateCodeSuccess}！${t.receivedCredits.replace('{count}', data.remainingCount.toString())}`);
        setActivateCodeInput('');
        setShowActivateModal(false);
        await checkUsageCount();
      } else {
        alert(data.error || t.activateFailed);
      }
    } catch (error) {
      console.error('激活失败:', error);
      alert(t.networkError);
    } finally {
      setIsActivating(false);
    }
  };

  // 生成邀请码
  const handleGenerateInviteCode = async () => {
    if (!deviceId) return;

    setIsGeneratingInvite(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/invite/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });

      const data = await res.json();
      if (data.success) {
        setMyInviteCode(data.code);
        setShowInviteModal(true);
      } else {
        alert(data.error || t.generateInviteCodeFailed);
      }
    } catch (error) {
      console.error('生成邀请码失败:', error);
      alert(t.networkError);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // 使用邀请码
  const handleUseInviteCode = async () => {
    const code = inviteCodeInput.trim();
    if (!code || !deviceId) {
      alert(t.enterInviteCodePrompt);
      return;
    }

    // 验证邀请码格式（以 INV- 开头）
    if (!code.startsWith('INV-')) {
      alert(t.invalidInviteCodeFormat);
      return;
    }

    setIsUsingInvite(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/invite/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceId }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`${t.inviteCodeSuccess}！${t.inviteCodeReward.replace('{count}', data.rewardCount.toString())}`);
        setInviteCodeInput('');
        await checkUsageCount();
      } else {
        alert(data.error || t.useInviteCodeFailed);
      }
    } catch (error) {
      console.error('使用邀请码失败:', error);
      alert(t.networkError);
    } finally {
      setIsUsingInvite(false);
    }
  };

  // 翻译处理
  const handleTranslate = async () => {
    if (!inputText.trim()) {
      alert(t.enterTextToTranslate);
      return;
    }

    // 验证文本长度（避免过长文本）
    if (inputText.length > 50000) {
      alert(t.textTooLong);
      return;
    }

    // 检查使用次数
    if (remainingCount === null) {
      await checkUsageCount();
      return;
    }

    if (remainingCount <= 0) {
      alert(t.noRemainingCount + t.pleaseActivateOrUseInvite);
      setShowActivateModal(true);
      return;
    }

    setIsLoading(true);
    // 清空之前的结果
    setSections({ translation: '', terms: '', analysis: '' });

    let consumeData: any = null;
    let usedFrom: string | null = null;
    let usedActivationCode: string | null = null;

    try {
      // 先消耗使用次数
      const consumeRes = await fetch(`${API_BASE_URL}/api/usage/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceId, 
          textLength: inputText.length
        }),
      });

      consumeData = await consumeRes.json();
      if (!consumeData.success) {
        alert(consumeData.error || t.noRemainingCount);
        setIsLoading(false);
        await checkUsageCount();
        return;
      }

      // 更新剩余次数
      setRemainingCount(consumeData.remainingCount);
      usedFrom = consumeData.usedFrom;
      usedActivationCode = consumeData.usedActivationCode;

      // 执行翻译
      const formData = new FormData();
      formData.append('text', inputText);
      formData.append('targetLang', targetLang);

      const res = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.result) {
        // 解析结果
        const parts = data.result.split('---SECTION_SEPARATOR---');
        // 替换术语表中的表格表头为当前UI语言
        const termsWithReplacedHeaders = parts[1]?.trim() 
          ? replaceTableHeaders(parts[1].trim(), uiLang, targetLang)
          : t.none;
        setSections({
          translation: parts[0]?.trim() || t.noContent,
          terms: termsWithReplacedHeaders,
          analysis: parts[2]?.trim() || t.none
        });
      } else {
        // 翻译失败，恢复使用次数
        try {
          await fetch(`${API_BASE_URL}/api/usage/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId,
              usedFrom,
              activationCode: usedActivationCode,
            }),
          });
          await checkUsageCount();
        } catch (restoreError) {
          console.error('恢复使用次数失败:', restoreError);
        }
        
        alert(`${t.translationFailed}: ${data.error || t.unknownError} \n ${data.details || ''}`);
      }
    } catch (error) {
      console.error("请求错误:", error);
      
      // 如果消耗了次数但翻译失败，尝试恢复
      if (consumeData?.success && usedFrom) {
        try {
          await fetch(`${API_BASE_URL}/api/usage/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId,
              usedFrom,
              activationCode: usedActivationCode,
            }),
          });
          await checkUsageCount();
        } catch (restoreError) {
          console.error('恢复使用次数失败:', restoreError);
        }
      }
      
      alert(t.networkError);
      await checkUsageCount();
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
      
      {/* 顶部栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm flex-wrap gap-3">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-blue-600 bg-blue-50 p-1 rounded">EN</span> Translator
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 使用次数显示 */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs font-medium text-blue-700">{t.remainingCount}:</span>
            {isCheckingCount ? (
              <Loader2 size={14} className="animate-spin text-blue-600" />
            ) : (
              <span className="text-sm font-bold text-blue-600">
                {remainingCount !== null ? remainingCount : '...'}
              </span>
            )}
          </div>

          {/* 购买按钮 */}
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
            disabled={isLoading}
          >
            <ShoppingCart size={16} />
            <span>{t.purchaseLicense}</span>
          </button>

          {/* 激活码按钮 */}
          <button
            onClick={() => setShowActivateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
            disabled={isLoading}
          >
            <Key size={16} />
            <span>{t.activateCode}</span>
          </button>

          {/* 邀请朋友按钮 */}
          <button
            onClick={handleGenerateInviteCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-lg transition-colors"
            disabled={isLoading || isGeneratingInvite}
          >
            {isGeneratingInvite ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Users size={16} />
            )}
            <span>{t.inviteFriend}</span>
          </button>

          {/* UI界面语言选择器 */}
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-gray-500" />
            <select
              value={uiLang}
              onChange={(e) => setUiLang(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
              disabled={isLoading}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* 翻译目标语言选择器 */}
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-gray-500" />
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
              disabled={isLoading}
            >
              {TRANSLATION_TARGET_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 主体内容：双栏布局 */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* 左侧：输入区域 */}
        <div className="w-full md:w-2/5 flex flex-col border-r border-gray-200 bg-white md:h-full">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              {t.sourceText}
            </span>
            <span className="text-xs text-gray-400">{inputText.length} chars</span>
          </div>
          <textarea
            className="flex-1 w-full p-6 resize-none focus:outline-none text-lg leading-relaxed text-gray-700 font-mono"
            placeholder={t.placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <button
              onClick={handleTranslate}
              disabled={isLoading || !inputText || (remainingCount !== null && remainingCount <= 0)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t.translating}
                </>
              ) : (
                <>
                  <ArrowRightLeft size={20} />
                  {t.translateButton}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 右侧：结果区域 (三段式) */}
        <div className="w-full md:w-3/5 flex flex-col bg-gray-50 md:h-full overflow-hidden relative">
          
          {/* 工具栏 */}
          <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              {t.resultTitle}
            </span>
            {sections.translation && (
              <button 
                onClick={() => downloadMarkdown(sections, inputText, uiLang)}
                className="flex items-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition-colors shadow-sm"
              >
                <Download size={14} />
                {t.downloadMD}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {!sections.translation && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <ArrowRightLeft size={32} className="opacity-20" />
                </div>
                <p className="text-sm">{t.waitingInput}</p>
              </div>
            ) : null}

            {/* 卡片 1: 原文翻译 */}
            {(sections.translation || isLoading) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
                  <h3 className="font-bold text-blue-800 text-sm">{t.translationTitle}</h3>
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
                  <h3 className="font-bold text-amber-800 text-sm">{t.termsTitle}</h3>
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
                  <h3 className="font-bold text-purple-800 text-sm">{t.analysisTitle}</h3>
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

      {/* 购买激活码模态框 */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ShoppingCart size={20} />
              {t.purchaseLicense}
            </h2>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                {t.purchaseDescription}
              </p>
              <div className="flex justify-center mb-3">
                <a
                  href="https://642285287159.gumroad.com/l/entranslator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-md"
                >
                  <ShoppingCart size={18} />
                  {t.goToGumroad}
                </a>
              </div>
              <p className="text-xs text-gray-600 text-center">
                {t.purchaseNote}
              </p>
            </div>
            
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* 激活码输入模态框 */}
      {showActivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Key size={20} />
              {t.licenseKey || t.activateCode}
            </h2>
            
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{t.enterActivateCode}</p>
              <p className="text-xs text-gray-500">购买后，激活码将通过邮件发送给您</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.enterActivateCode}
              </label>
              <input
                type="text"
                value={activateCodeInput}
                onChange={(e) => setActivateCodeInput(e.target.value)}
                placeholder="输入激活码"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleActivate()}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleActivate}
                disabled={isActivating || !activateCodeInput.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isActivating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t.activating || '激活中...'}
                  </>
                ) : (
                  t.activate
                )}
              </button>
              <button
                onClick={() => {
                  setShowActivateModal(false);
                  setActivateCodeInput('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 邀请码模态框 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Gift size={20} />
              {t.inviteFriend}
            </h2>

            {/* 我的邀请码 */}
            {myInviteCode && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.myInviteCode}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={myInviteCode}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(myInviteCode);
                      setCopyStatus(prev => ({ ...prev, invite: true }));
                      setTimeout(() => setCopyStatus(prev => ({ ...prev, invite: false })), 2000);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copyStatus['invite'] ? <Check size={16} /> : <Copy size={16} />}
                    {copyStatus['invite'] ? t.copied : t.copyInviteCode}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t.shareInviteCode}
                </p>
              </div>
            )}

            {/* 使用邀请码 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.enterInviteCode}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder={t.enterInviteCode}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleUseInviteCode()}
                />
                <button
                  onClick={handleUseInviteCode}
                  disabled={isUsingInvite || !inviteCodeInput.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUsingInvite ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t.using || '使用中...'}
                    </>
                  ) : (
                    t.useInviteCode
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setShowInviteModal(false);
                setInviteCodeInput('');
                setMyInviteCode('');
              }}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
