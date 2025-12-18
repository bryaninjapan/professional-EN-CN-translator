'use client';

import { useState, useEffect } from 'react';
import { Loader2, Key, BarChart3, Plus, Trash2, Copy, Check, LogOut, Shield } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<'codes' | 'stats'>('codes');

  // 激活码相关状态
  const [activationCodes, setActivationCodes] = useState<any[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [newCodeType, setNewCodeType] = useState<'free' | 'paid'>('free');
  const [newCodeCount, setNewCodeCount] = useState(10);
  const [newCodeInitialCount, setNewCodeInitialCount] = useState(100);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});

  // 统计相关状态
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 检查是否已登录
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    }
  }, []);

  // 验证token
  const verifyToken = async (tokenToVerify: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        if (activeTab === 'codes') {
          loadActivationCodes();
        } else {
          loadStats();
        }
      } else {
        localStorage.removeItem('admin_token');
        setToken('');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('admin_token');
      setToken('');
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!password.trim()) return;

    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
        setPassword('');
        loadActivationCodes();
      } else {
        alert(data.error || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('登录失败，请重试');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 登出
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setIsAuthenticated(false);
    setActivationCodes([]);
    setStats(null);
  };

  // 加载激活码列表
  const loadActivationCodes = async () => {
    if (!token) return;

    setIsLoadingCodes(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/activation-codes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setActivationCodes(data.codes || []);
      } else {
        if (data.error === '未授权访问') {
          handleLogout();
        } else {
          alert(data.error || '加载激活码列表失败');
        }
      }
    } catch (error) {
      console.error('Load codes error:', error);
      alert('加载激活码列表失败');
    } finally {
      setIsLoadingCodes(false);
    }
  };

  // 创建激活码
  const handleCreateCode = async () => {
    if (!token || newCodeInitialCount <= 0) return;

    setIsCreatingCode(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/activation-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: newCodeType,
          initialCount: newCodeInitialCount,
          count: newCodeCount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`成功创建 ${data.codes.length} 个激活码`);
        setNewCodeCount(10);
        setNewCodeInitialCount(100);
        await loadActivationCodes();
      } else {
        if (data.error === '未授权访问') {
          handleLogout();
        } else {
          alert(data.error || '创建激活码失败');
        }
      }
    } catch (error) {
      console.error('Create code error:', error);
      alert('创建激活码失败');
    } finally {
      setIsCreatingCode(false);
    }
  };

  // 删除激活码
  const handleDeleteCode = async (code: string) => {
    if (!token || !confirm(`确定要删除激活码 ${code} 吗？`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/activation-codes?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        alert('激活码已删除');
        await loadActivationCodes();
      } else {
        if (data.error === '未授权访问') {
          handleLogout();
        } else {
          alert(data.error || '删除激活码失败');
        }
      }
    } catch (error) {
      console.error('Delete code error:', error);
      alert('删除激活码失败');
    }
  };

  // 复制激活码
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopyStatus(prev => ({ ...prev, [code]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [code]: false }));
    }, 2000);
  };

  // 加载统计信息
  const loadStats = async () => {
    if (!token) return;

    setIsLoadingStats(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        if (data.error === '未授权访问') {
          handleLogout();
        } else {
          alert(data.error || '加载统计信息失败');
        }
      }
    } catch (error) {
      console.error('Load stats error:', error);
      alert('加载统计信息失败');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 切换标签页时加载数据
  useEffect(() => {
    if (isAuthenticated && token) {
      if (activeTab === 'codes') {
        loadActivationCodes();
      } else {
        loadStats();
      }
    }
  }, [activeTab, isAuthenticated, token]);

  // 登录页面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
          <div className="flex items-center justify-center mb-6">
            <Shield size={48} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">后台管理系统</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">管理员密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="请输入管理员密码"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={isLoggingIn}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={isLoggingIn || !password.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 管理主页面
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={24} className="text-blue-600" />
            后台管理系统
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            登出
          </button>
        </div>

        {/* 标签页 */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 border-t border-gray-200">
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'codes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Key size={18} />
            激活码管理
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <BarChart3 size={18} />
            数据统计
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* 创建激活码卡片 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={20} />
                创建激活码
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
                  <select
                    value={newCodeType}
                    onChange={(e) => setNewCodeType(e.target.value as 'free' | 'paid')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="free">免费版</option>
                    <option value="paid">付费版</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">初始次数</label>
                  <input
                    type="number"
                    value={newCodeInitialCount}
                    onChange={(e) => setNewCodeInitialCount(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">创建数量</label>
                  <input
                    type="number"
                    value={newCodeCount}
                    onChange={(e) => setNewCodeCount(parseInt(e.target.value) || 1)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreateCode}
                    disabled={isCreatingCode || newCodeInitialCount <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isCreatingCode ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        创建
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 激活码列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">激活码列表</h2>
              {isLoadingCodes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : activationCodes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  暂无激活码
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">激活码</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">类型</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">初始次数</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">剩余次数</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">激活设备数</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">使用次数</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">创建时间</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activationCodes.map((code: any) => (
                        <tr key={code.code} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{code.code}</span>
                              <button
                                onClick={() => copyCode(code.code)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="复制"
                              >
                                {copyStatus[code.code] ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              code.type === 'free' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {code.type === 'free' ? '免费版' : '付费版'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">{code.initial_count}</td>
                          <td className="py-3 px-4 text-sm font-medium">{code.remainingCount}</td>
                          <td className="py-3 px-4 text-sm">{code.deviceCount}</td>
                          <td className="py-3 px-4 text-sm">{code.usageCount}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {new Date(code.created_at * 1000).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteCode(code.code)}
                              className="text-red-600 hover:text-red-700 transition-colors"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : stats ? (
              <>
                {/* 总体统计 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-1">总使用次数</div>
                    <div className="text-3xl font-bold text-gray-800">{stats.totalUsage.toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-1">总设备数</div>
                    <div className="text-3xl font-bold text-gray-800">{stats.totalDevices.toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-1">激活码总数</div>
                    <div className="text-3xl font-bold text-gray-800">{stats.activationCodes.total.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      免费: {stats.activationCodes.free} | 付费: {stats.activationCodes.paid}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-1">邀请码总数</div>
                    <div className="text-3xl font-bold text-gray-800">{stats.inviteCodes.total.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      已使用: {stats.inviteCodes.totalUsed}
                    </div>
                  </div>
                </div>

                {/* 最近7天使用 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">最近7天使用情况</h3>
                  <div className="text-2xl font-bold text-blue-600">{stats.recentUsage.last7Days.toLocaleString()} 次</div>
                </div>

                {/* TOP激活码 */}
                {stats.topActivationCodes.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">使用最多的激活码 (TOP 10)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">激活码</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">使用次数</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">设备数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topActivationCodes.map((item: any, index: number) => (
                            <tr key={item.code} className="border-b border-gray-100">
                              <td className="py-2 px-4 font-mono text-sm">{item.code}</td>
                              <td className="py-2 px-4 text-sm">{item.usageCount}</td>
                              <td className="py-2 px-4 text-sm">{item.deviceCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TOP邀请码 */}
                {stats.topInviteCodes.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">使用最多的邀请码 (TOP 10)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">邀请码</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">使用次数</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">设备数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topInviteCodes.map((item: any, index: number) => (
                            <tr key={item.code} className="border-b border-gray-100">
                              <td className="py-2 px-4 font-mono text-sm">{item.code}</td>
                              <td className="py-2 px-4 text-sm">{item.usageCount}</td>
                              <td className="py-2 px-4 text-sm">{item.deviceCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                暂无统计数据
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
