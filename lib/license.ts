/**
 * 激活码系统工具函数
 * 使用 localStorage 存储（MVP版本）
 */

// 激活码格式：ENTL-XXXX-XXXX-XXXX
const LICENSE_PREFIX = 'ENTL';
const LICENSE_GROUPS = 4;
const LICENSE_GROUP_LENGTH = 4;

// 字符集：大写字母A-Z + 数字0-9（排除易混淆的O/0, I/1）
const LICENSE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// 存储键名
const STORAGE_KEY_ADMIN = 'en_translator_license_codes'; // 管理员端：所有激活码
const STORAGE_KEY_USER = 'en_translator_user_license'; // 用户端：当前激活信息

/**
 * 生成单个激活码
 */
export function generateLicenseCode(): string {
  const groups: string[] = [];
  
  for (let i = 0; i < LICENSE_GROUPS; i++) {
    let group = '';
    for (let j = 0; j < LICENSE_GROUP_LENGTH; j++) {
      const randomIndex = Math.floor(Math.random() * LICENSE_CHARS.length);
      group += LICENSE_CHARS[randomIndex];
    }
    groups.push(group);
  }
  
  return `${LICENSE_PREFIX}-${groups.join('-')}`;
}

/**
 * 验证激活码格式
 */
export function validateLicenseFormat(code: string): boolean {
  const pattern = new RegExp(`^${LICENSE_PREFIX}-[${LICENSE_CHARS}]{${LICENSE_GROUP_LENGTH}}-[${LICENSE_CHARS}]{${LICENSE_GROUP_LENGTH}}-[${LICENSE_CHARS}]{${LICENSE_GROUP_LENGTH}}$`);
  return pattern.test(code.toUpperCase());
}

/**
 * 标准化激活码（转大写、去除空格）
 */
export function normalizeLicenseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * 获取所有激活码（管理员端）
 */
export function getAllLicenseCodes(): Record<string, LicenseCodeData> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ADMIN);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load license codes:', error);
    return {};
  }
}

/**
 * 保存所有激活码（管理员端）
 */
export function saveAllLicenseCodes(codes: Record<string, LicenseCodeData>): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(codes));
  } catch (error) {
    console.error('Failed to save license codes:', error);
  }
}

/**
 * 创建新激活码（管理员端）
 */
export function createLicenseCode(): LicenseCodeData {
  let code = generateLicenseCode();
  const allCodes = getAllLicenseCodes();
  
  // 确保唯一性（最多尝试10次）
  let attempts = 0;
  while (allCodes[code] && attempts < 10) {
    code = generateLicenseCode();
    attempts++;
  }
  
  if (allCodes[code]) {
    throw new Error('无法生成唯一激活码，请重试');
  }
  
  const licenseData: LicenseCodeData = {
    code,
    created_at: new Date().toISOString(),
    status: 'unused', // unused/active/depleted
    total_credits: 100,
    credits_used: 0,
    activated_at: null,
  };
  
  allCodes[code] = licenseData;
  saveAllLicenseCodes(allCodes);
  
  return licenseData;
}

/**
 * 删除激活码（管理员端）
 */
export function deleteLicenseCode(code: string): boolean {
  const allCodes = getAllLicenseCodes();
  if (!allCodes[code]) {
    return false;
  }
  
  delete allCodes[code];
  saveAllLicenseCodes(allCodes);
  return true;
}

/**
 * 获取用户激活信息（用户端）
 */
export function getUserLicense(): UserLicenseData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load user license:', error);
    return null;
  }
}

/**
 * 保存用户激活信息（用户端）
 */
export function saveUserLicense(licenseData: UserLicenseData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(licenseData));
  } catch (error) {
    console.error('Failed to save user license:', error);
  }
}

/**
 * 激活激活码（用户端）
 */
export function activateLicense(code: string): { success: boolean; message: string; data?: UserLicenseData } {
  // 验证格式
  const normalizedCode = normalizeLicenseCode(code);
  if (!validateLicenseFormat(normalizedCode)) {
    return {
      success: false,
      message: '激活码格式不正确，应为 ENTL-XXXX-XXXX-XXXX 格式',
    };
  }
  
  // 检查是否已激活
  const existingLicense = getUserLicense();
  if (existingLicense && existingLicense.license_key === normalizedCode) {
    return {
      success: false,
      message: '该激活码已在此设备激活',
    };
  }
  
  // 检查激活码是否存在（管理员端数据）
  const allCodes = getAllLicenseCodes();
  const licenseData = allCodes[normalizedCode];
  
  if (!licenseData) {
    return {
      success: false,
      message: '激活码不存在',
    };
  }
  
  // 检查激活码状态
  if (licenseData.status === 'depleted') {
    return {
      success: false,
      message: '激活码已用完',
    };
  }
  
  // 如果已激活但状态不是 active，更新状态
  if (licenseData.status === 'unused') {
    licenseData.status = 'active';
    licenseData.activated_at = new Date().toISOString();
    saveAllLicenseCodes(allCodes);
  }
  
  // 保存用户激活信息
  const userLicense: UserLicenseData = {
    license_key: normalizedCode,
    credits_remaining: licenseData.total_credits - licenseData.credits_used,
    activated_at: licenseData.activated_at || new Date().toISOString(),
  };
  
  saveUserLicense(userLicense);
  
  return {
    success: true,
    message: '激活成功！',
    data: userLicense,
  };
}

/**
 * 使用一次翻译次数（用户端）
 */
export function consumeCredit(): { success: boolean; remaining: number; message?: string } {
  const userLicense = getUserLicense();
  
  if (!userLicense) {
    return {
      success: false,
      remaining: 0,
      message: '未激活，请先激活激活码',
    };
  }
  
  if (userLicense.credits_remaining <= 0) {
    return {
      success: false,
      remaining: 0,
      message: '使用次数已用完，请购买新的激活码',
    };
  }
  
  // 减少次数
  userLicense.credits_remaining -= 1;
  saveUserLicense(userLicense);
  
  // 同步更新管理员端数据
  const allCodes = getAllLicenseCodes();
  const licenseData = allCodes[userLicense.license_key];
  if (licenseData) {
    licenseData.credits_used += 1;
    if (licenseData.credits_used >= licenseData.total_credits) {
      licenseData.status = 'depleted';
    }
    saveAllLicenseCodes(allCodes);
  }
  
  return {
    success: true,
    remaining: userLicense.credits_remaining,
  };
}

/**
 * 恢复一次翻译次数（用于翻译失败时回滚）
 */
export function restoreCredit(): { success: boolean; remaining: number } {
  const userLicense = getUserLicense();
  
  if (!userLicense) {
    return {
      success: false,
      remaining: 0,
    };
  }
  
  // 增加次数（但不能超过初始值）
  if (userLicense.credits_remaining < 100) {
    userLicense.credits_remaining += 1;
    saveUserLicense(userLicense);
    
    // 同步更新管理员端数据
    const allCodes = getAllLicenseCodes();
    const licenseData = allCodes[userLicense.license_key];
    if (licenseData && licenseData.credits_used > 0) {
      licenseData.credits_used -= 1;
      if (licenseData.status === 'depleted' && licenseData.credits_used < licenseData.total_credits) {
        licenseData.status = 'active';
      }
      saveAllLicenseCodes(allCodes);
    }
  }
  
  return {
    success: true,
    remaining: userLicense.credits_remaining,
  };
}

/**
 * 获取剩余次数（用户端）
 */
export function getRemainingCredits(): number {
  const userLicense = getUserLicense();
  return userLicense ? userLicense.credits_remaining : 0;
}

// 类型定义
export interface LicenseCodeData {
  code: string;
  created_at: string;
  status: 'unused' | 'active' | 'depleted';
  total_credits: number;
  credits_used: number;
  activated_at: string | null;
}

export interface UserLicenseData {
  license_key: string;
  credits_remaining: number;
  activated_at: string;
}

