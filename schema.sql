-- 激活码表
CREATE TABLE IF NOT EXISTS activation_codes (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('free', 'paid')),
  initial_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by TEXT NOT NULL
);

-- 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  creator_device_id TEXT NOT NULL,
  creator_ip TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  used_count INTEGER NOT NULL DEFAULT 0
);

-- 使用记录表
CREATE TABLE IF NOT EXISTS usage_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  activation_code TEXT,
  invite_code TEXT,
  ip_address TEXT NOT NULL,
  text_length INTEGER NOT NULL,
  used_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 设备激活记录表（防止重复激活）
CREATE TABLE IF NOT EXISTS device_activations (
  device_id TEXT NOT NULL,
  activation_code TEXT NOT NULL,
  activated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (device_id, activation_code)
);

-- 设备免费次数记录表
CREATE TABLE IF NOT EXISTS device_free_usage (
  device_id TEXT PRIMARY KEY,
  remaining_count INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 设备激活码次数记录表（存储每个设备通过激活码获得的剩余次数）
CREATE TABLE IF NOT EXISTS device_activation_usage (
  device_id TEXT NOT NULL,
  activation_code TEXT NOT NULL,
  remaining_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (device_id, activation_code)
);

-- 设备邀请码使用记录表（防止同一设备重复使用同一邀请码）
CREATE TABLE IF NOT EXISTS device_invite_usage (
  device_id TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  used_at INTEGER NOT NULL DEFAULT (unixepoch()),
  device_fingerprint TEXT,
  ip_address TEXT,
  PRIMARY KEY (device_id, invite_code)
);

-- 用户积分表（服务端缓存，用于快速查询和防篡改验证）
CREATE TABLE IF NOT EXISTS user_credits (
  device_id TEXT PRIMARY KEY,
  total_credits INTEGER NOT NULL DEFAULT 0,
  free_credits INTEGER NOT NULL DEFAULT 0,
  activation_credits INTEGER NOT NULL DEFAULT 0,
  last_verified_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 设备指纹表（用于防刷机制）
CREATE TABLE IF NOT EXISTS device_fingerprints (
  device_id TEXT PRIMARY KEY,
  fingerprint_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  first_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 激活码使用详情表（记录每次激活的详细信息）
CREATE TABLE IF NOT EXISTS activation_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  activation_code TEXT NOT NULL,
  credits_added INTEGER NOT NULL,
  activated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (activation_code) REFERENCES activation_codes(code)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_usage_device_id ON usage_records(device_id);
CREATE INDEX IF NOT EXISTS idx_usage_activation_code ON usage_records(activation_code);
CREATE INDEX IF NOT EXISTS idx_usage_invite_code ON usage_records(invite_code);
CREATE INDEX IF NOT EXISTS idx_invite_creator_device ON invite_codes(creator_device_id);
CREATE INDEX IF NOT EXISTS idx_device_activation_device ON device_activations(device_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_device ON user_credits(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprint_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_activation_details_device ON activation_details(device_id);
CREATE INDEX IF NOT EXISTS idx_activation_details_code ON activation_details(activation_code);
