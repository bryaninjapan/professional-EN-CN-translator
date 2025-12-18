# Gumroad 购买链接配置

## 配置步骤

1. **获取 Gumroad 产品链接**
   - 登录 Gumroad
   - 进入产品页面
   - 复制产品链接（格式：`https://your-username.gumroad.com/l/your-product-id`）

2. **更新购买链接**
   - 打开 `app/page.tsx`
   - 找到购买模态框中的 Gumroad 链接（约第 752 行）
   - 将 `https://your-product.gumroad.com/l/your-product-id` 替换为您的实际产品链接

## 当前代码位置

```tsx
// app/page.tsx - 购买模态框
<a
  href="https://your-product.gumroad.com/l/your-product-id"  // ← 替换这里
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-md"
>
  <ShoppingCart size={18} />
  前往 Gumroad 购买
</a>
```

## Gumroad 产品链接格式

- 标准链接：`https://your-username.gumroad.com/l/product-id`
- 短链接：`https://gum.co/product-id`（如果已设置）

## 工作流程

1. 用户点击"购买激活码"按钮
2. 弹出购买模态框
3. 点击"前往 Gumroad 购买"按钮
4. 在新标签页打开 Gumroad 产品页面
5. 用户在 Gumroad 完成购买
6. 管理员在后台创建订单并发送激活码

## 注意事项

- 确保 Gumroad 产品已正确配置
- 购买后，管理员需要在后台手动创建订单并发送激活码
- 建议在 Gumroad 产品描述中说明激活码将通过邮件发送

