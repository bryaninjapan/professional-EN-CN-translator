'use client';

import { useState, useEffect } from 'react';
import { Loader2, Key, BarChart3, Plus, Trash2, Copy, Check, LogOut, Shield, ShoppingCart, Mail, User, DollarSign, Calendar } from 'lucide-react';
import {
  getAllOrders,
  createOrder,
  processOrder,
  deleteOrder,
  getOrdersByStatus,
  getPendingOrdersCount,
  type GumroadOrder,
  type OrderStatus,
} from '@/lib/orders';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<'codes' | 'stats' | 'orders'>('codes');

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


  // 订单管理状态
  const [orders, setOrders] = useState<Record<string, GumroadOrder>>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    gumroad_order_id: '',
    customer_email: '',
    customer_name: '',
    product_name: 'EN Translator License (100 uses)',
    amount: '',
    currency: 'USD',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

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

  // 加载订单
  const loadOrders = () => {
    const allOrders = getAllOrders();
    setOrders(allOrders);
  };

  // 创建订单
  const handleCreateOrder = () => {
    if (!newOrder.gumroad_order_id || !newOrder.customer_email) {
      alert('请填写 Gumroad 订单号和客户邮箱');
      return;
    }

    try {
      const order = createOrder({
        gumroad_order_id: newOrder.gumroad_order_id,
        customer_email: newOrder.customer_email,
        customer_name: newOrder.customer_name || undefined,
        product_name: newOrder.product_name,
        amount: parseFloat(newOrder.amount) || 0,
        currency: newOrder.currency,
        purchase_date: newOrder.purchase_date,
        notes: newOrder.notes || undefined,
      });

      loadOrders();
      setShowCreateOrderModal(false);
      setNewOrder({
        gumroad_order_id: '',
        customer_email: '',
        customer_name: '',
        product_name: 'EN Translator License (100 uses)',
        amount: '',
        currency: 'USD',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      alert('订单已创建');
    } catch (error) {
      console.error('创建订单失败:', error);
      alert(error instanceof Error ? error.message : '创建失败');
    }
  };

  // 处理订单（生成服务器端激活码）
  const handleProcessOrder = async (orderId: string) => {
    if (!confirm('确定要为此订单生成激活码吗？')) {
      return;
    }

    if (!token) {
      alert('请先登录');
      return;
    }

    setProcessingOrderId(orderId);
    try {
      // 调用服务器端 API 生成激活码
      const res = await fetch(`${API_BASE_URL}/api/admin/activation-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'paid',
          initialCount: 100,
          count: 1,
        }),
      });

      const data = await res.json();
      if (data.success && data.codes && data.codes.length > 0) {
        const licenseCode = data.codes[0];
        
        // 关联激活码到订单
        if (processOrder(orderId, licenseCode)) {
          loadOrders();
          
          navigator.clipboard.writeText(licenseCode);
          alert(`激活码已生成并复制到剪贴板：${licenseCode}\n\n请发送给客户：${orders[orderId]?.customer_email}`);
        } else {
          alert('关联激活码到订单失败');
        }
      } else {
        alert(data.error || '生成激活码失败');
      }
    } catch (error) {
      console.error('处理订单失败:', error);
      alert(error instanceof Error ? error.message : '处理失败');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // 切换标签页时加载数据（所有功能都需要登录）
  useEffect(() => {
    if (isAuthenticated && token) {
      if (activeTab === 'codes') {
        loadActivationCodes();
      } else if (activeTab === 'stats') {
        loadStats();
      } else if (activeTab === 'orders') {
        loadOrders();
      }
    }
  }, [activeTab, isAuthenticated, token]);

  // 登录页面（所有功能都需要登录）
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
          <div className="flex items-center justify-center mb-6">
            <Shield size={48} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">后台管理系统</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            管理激活码、订单和统计数据
          </p>
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
            <span className="text-sm font-normal text-gray-500 ml-2">
              （已登录）
            </span>
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
        <div className="max-w-7xl mx-auto px-6 flex gap-1 border-t border-gray-200 flex-wrap">
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'codes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Key size={18} />
            激活码管理（服务器）
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
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 relative ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <ShoppingCart size={18} />
            Gumroad 订单
            {getPendingOrdersCount() > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {getPendingOrdersCount()}
              </span>
            )}
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

        {/* 订单管理标签页 */}
        {activeTab === 'orders' && isAuthenticated && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Gumroad 订单管理：</strong>手动创建订单，生成激活码并发送给客户。数据存储在浏览器 localStorage。
              </p>
            </div>

            {/* 订单统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">总订单数</div>
                <div className="text-2xl font-bold text-gray-800">
                  {Object.keys(orders).length}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">待处理</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {getOrdersByStatus('pending').length}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">已完成</div>
                <div className="text-2xl font-bold text-green-600">
                  {getOrdersByStatus('completed').length}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">总金额</div>
                <div className="text-2xl font-bold text-blue-600">
                  ${Object.values(orders).reduce((sum, o) => sum + (o.amount || 0), 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* 创建订单按钮 */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateOrderModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus size={18} />
                创建订单
              </button>
            </div>

            {/* 订单筛选 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">筛选：</span>
                {(['all', 'pending', 'processing', 'completed', 'cancelled'] as const).map((status) => {
                  const statusText = status === 'all' ? '全部' 
                    : status === 'pending' ? '待处理'
                    : status === 'processing' ? '处理中'
                    : status === 'completed' ? '已完成'
                    : '已取消';
                  
                  return (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        orderStatusFilter === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {statusText}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 订单列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">订单列表</h2>
              </div>
              
              {(() => {
                const ordersArray = orderStatusFilter === 'all'
                  ? Object.values(orders).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  : getOrdersByStatus(orderStatusFilter);

                if (ordersArray.length === 0) {
                  return (
                    <div className="p-12 text-center text-gray-400">
                      <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                      <p>暂无订单，点击"创建订单"添加 Gumroad 订单</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">订单号</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">客户信息</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">产品</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">金额</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">购买日期</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">状态</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">激活码</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersArray.map((order) => {
                          const statusInfo = order.status === 'pending'
                            ? { text: '待处理', color: 'text-yellow-700 bg-yellow-100' }
                            : order.status === 'processing'
                            ? { text: '处理中', color: 'text-blue-700 bg-blue-100' }
                            : order.status === 'completed'
                            ? { text: '已完成', color: 'text-green-700 bg-green-100' }
                            : { text: '已取消', color: 'text-red-700 bg-red-100' };
                          const isProcessing = processingOrderId === order.id;
                          const isCopied = copyStatus[`order_${order.id}`];
                          
                          return (
                            <tr
                              key={order.id}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="font-mono text-sm text-gray-800">{order.gumroad_order_id}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-800 flex items-center gap-1">
                                    <Mail size={14} className="text-gray-400" />
                                    {order.customer_email}
                                  </div>
                                  {order.customer_name && (
                                    <div className="text-gray-600 text-xs mt-1 flex items-center gap-1">
                                      <User size={12} className="text-gray-400" />
                                      {order.customer_name}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">{order.product_name}</td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                <div className="flex items-center gap-1">
                                  <DollarSign size={14} className="text-gray-400" />
                                  {order.amount} {order.currency}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} className="text-gray-400" />
                                  {new Date(order.purchase_date).toLocaleDateString('zh-CN')}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.text}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {order.license_code ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-gray-800">{order.license_code}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(order.license_code!);
                                        setCopyStatus((prev: Record<string, boolean>) => ({ ...prev, [`order_${order.id}`]: true }));
                                        setTimeout(() => {
                                          setCopyStatus((prev: Record<string, boolean>) => ({ ...prev, [`order_${order.id}`]: false }));
                                        }, 2000);
                                      }}
                                      className="text-gray-400 hover:text-gray-600 transition-colors"
                                      title="复制激活码"
                                    >
                                      {isCopied ? (
                                        <Check size={14} className="text-green-600" />
                                      ) : (
                                        <Copy size={14} />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">未生成</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {order.status === 'pending' && (
                                    <button
                                      onClick={() => handleProcessOrder(order.id)}
                                      disabled={isProcessing}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs rounded transition-colors"
                                    >
                                      {isProcessing ? '处理中...' : '生成激活码'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm('确定要删除此订单吗？')) {
                                        deleteOrder(order.id);
                                        loadOrders();
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-700 transition-colors"
                                    title="删除"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 创建订单模态框 */}
        {showCreateOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingCart size={20} />
                创建 Gumroad 订单
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gumroad 订单号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newOrder.gumroad_order_id}
                    onChange={(e) => setNewOrder({ ...newOrder, gumroad_order_id: e.target.value })}
                    placeholder="例如：12345678"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    客户邮箱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newOrder.customer_email}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_email: e.target.value })}
                    placeholder="customer@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    客户姓名（可选）
                  </label>
                  <input
                    type="text"
                    value={newOrder.customer_name}
                    onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    产品名称
                  </label>
                  <input
                    type="text"
                    value={newOrder.product_name}
                    onChange={(e) => setNewOrder({ ...newOrder, product_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      金额
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newOrder.amount}
                      onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                      placeholder="9.99"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      货币
                    </label>
                    <select
                      value={newOrder.currency}
                      onChange={(e) => setNewOrder({ ...newOrder, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                      <option value="EUR">EUR</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    购买日期
                  </label>
                  <input
                    type="date"
                    value={newOrder.purchase_date}
                    onChange={(e) => setNewOrder({ ...newOrder, purchase_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    备注（可选）
                  </label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    placeholder="添加备注信息..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateOrder}
                  disabled={!newOrder.gumroad_order_id || !newOrder.customer_email}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  创建订单
                </button>
                <button
                  onClick={() => {
                    setShowCreateOrderModal(false);
                    setNewOrder({
                      gumroad_order_id: '',
                      customer_email: '',
                      customer_name: '',
                      product_name: 'EN Translator License (100 uses)',
                      amount: '',
                      currency: 'USD',
                      purchase_date: new Date().toISOString().split('T')[0],
                      notes: '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
