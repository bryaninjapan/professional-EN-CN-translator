/**
 * Gumroad 订单管理系统
 * 使用 localStorage 存储（MVP版本）
 */

// 存储键名
const STORAGE_KEY_ORDERS = 'en_translator_gumroad_orders';

// 订单状态
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// 订单数据接口
export interface GumroadOrder {
  id: string; // 订单ID（Gumroad 订单号或自定义ID）
  gumroad_order_id: string; // Gumroad 订单号
  customer_email: string; // 客户邮箱
  customer_name?: string; // 客户姓名
  product_name: string; // 产品名称
  amount: number; // 金额
  currency: string; // 货币
  purchase_date: string; // 购买日期
  status: OrderStatus; // 订单状态
  license_code?: string; // 关联的激活码
  notes?: string; // 备注
  created_at: string; // 创建时间
  updated_at: string; // 更新时间
  completed_at?: string; // 完成时间（发送激活码时间）
}

/**
 * 获取所有订单
 */
export function getAllOrders(): Record<string, GumroadOrder> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load orders:', error);
    return {};
  }
}

/**
 * 保存所有订单
 */
export function saveAllOrders(orders: Record<string, GumroadOrder>): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (error) {
    console.error('Failed to save orders:', error);
  }
}

/**
 * 创建新订单
 */
export function createOrder(orderData: Omit<GumroadOrder, 'id' | 'created_at' | 'updated_at' | 'status'>): GumroadOrder {
  const allOrders = getAllOrders();
  
  // 生成订单ID（使用 Gumroad 订单号或时间戳）
  const orderId = orderData.gumroad_order_id || `order_${Date.now()}`;
  
  // 检查订单是否已存在
  if (allOrders[orderId]) {
    throw new Error('订单已存在');
  }
  
  const now = new Date().toISOString();
  
  const newOrder: GumroadOrder = {
    id: orderId,
    ...orderData,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  
  allOrders[orderId] = newOrder;
  saveAllOrders(allOrders);
  
  return newOrder;
}

/**
 * 更新订单
 */
export function updateOrder(orderId: string, updates: Partial<GumroadOrder>): boolean {
  const allOrders = getAllOrders();
  const order = allOrders[orderId];
  
  if (!order) {
    return false;
  }
  
  allOrders[orderId] = {
    ...order,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  saveAllOrders(allOrders);
  return true;
}

/**
 * 处理订单（生成激活码并关联）
 */
export function processOrder(orderId: string, licenseCode: string): boolean {
  const allOrders = getAllOrders();
  const order = allOrders[orderId];
  
  if (!order) {
    return false;
  }
  
  if (order.status === 'completed') {
    return false; // 订单已完成，不能重复处理
  }
  
  const now = new Date().toISOString();
  
  allOrders[orderId] = {
    ...order,
    license_code: licenseCode,
    status: 'completed',
    completed_at: now,
    updated_at: now,
  };
  
  saveAllOrders(allOrders);
  return true;
}

/**
 * 删除订单
 */
export function deleteOrder(orderId: string): boolean {
  const allOrders = getAllOrders();
  
  if (!allOrders[orderId]) {
    return false;
  }
  
  delete allOrders[orderId];
  saveAllOrders(allOrders);
  return true;
}

/**
 * 根据状态获取订单
 */
export function getOrdersByStatus(status: OrderStatus): GumroadOrder[] {
  const allOrders = getAllOrders();
  return Object.values(allOrders)
    .filter(order => order.status === status)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * 获取待处理订单数量
 */
export function getPendingOrdersCount(): number {
  return getOrdersByStatus('pending').length;
}

/**
 * 生成订单ID（如果 Gumroad 订单号为空）
 */
export function generateOrderId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

