-- 数据库迁移脚本：添加增强功能支持
-- 执行此脚本以添加新表和字段

-- 1. 添加设备指纹字段到 device_invite_usage 表
ALTER TABLE device_invite_usage ADD COLUMN device_fingerprint TEXT;
ALTER TABLE device_invite_usage ADD COLUMN ip_address TEXT;

-- 2. 创建用户积分表（服务端缓存）
CREATE TABLE IF NOT EXISTS user_credits (
  device_id TEXT PRIMARY KEY,
  total_credits INTEGER NOT NULL DEFAULT 0,
  free_credits INTEGER NOT NULL DEFAULT 0,
  activation_credits INTEGER NOT NULL DEFAULT 0,
  last_verified_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 3. 创建设备指纹表
CREATE TABLE IF NOT EXISTS device_fingerprints (
  device_id TEXT PRIMARY KEY,
  fingerprint_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  first_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 4. 创建激活详情表
CREATE TABLE IF NOT EXISTS activation_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  activation_code TEXT NOT NULL,
  credits_added INTEGER NOT NULL,
  activated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (activation_code) REFERENCES activation_codes(code)
);

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_credits_device ON user_credits(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprint_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_activation_details_device ON activation_details(device_id);
CREATE INDEX IF NOT EXISTS idx_activation_details_code ON activation_details(activation_code);

-- 6. 迁移现有数据到 user_credits 表
INSERT OR IGNORE INTO user_credits (device_id, free_credits, activation_credits, total_credits, last_verified_at, created_at, updated_at)
SELECT 
  dfu.device_id,
  COALESCE(dfu.remaining_count, 0) as free_credits,
  COALESCE(SUM(dau.remaining_count), 0) as activation_credits,
  COALESCE(dfu.remaining_count, 0) + COALESCE(SUM(dau.remaining_count), 0) as total_credits,
  unixepoch() as last_verified_at,
  COALESCE(dfu.created_at, unixepoch()) as created_at,
  unixepoch() as updated_at
FROM device_free_usage dfu
LEFT JOIN device_activation_usage dau ON dfu.device_id = dau.device_id
GROUP BY dfu.device_id;

-- 7. 为没有免费使用记录但有激活记录的设备创建 user_credits
INSERT OR IGNORE INTO user_credits (device_id, free_credits, activation_credits, total_credits, last_verified_at, created_at, updated_at)
SELECT 
  dau.device_id,
  0 as free_credits,
  SUM(dau.remaining_count) as activation_credits,
  SUM(dau.remaining_count) as total_credits,
  unixepoch() as last_verified_at,
  MIN(dau.updated_at) as created_at,
  unixepoch() as updated_at
FROM device_activation_usage dau
WHERE dau.device_id NOT IN (SELECT device_id FROM user_credits)
GROUP BY dau.device_id;
