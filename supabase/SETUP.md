# Supabase 配置指南

## 1. 创建 Supabase 项目（2 分钟）

1. 打开 https://supabase.com → **Start your project**
2. 用 GitHub 登录
3. 创建新项目：
   - Name: `tower-db`
   - Database Password: 生成一个（保存好）
   - Region: **Singapore** (离香港最近，30ms延迟)
   - Pricing Plan: **Free**
4. 等 1-2 分钟数据库就绪

## 2. 创建数据库表

1. 进入项目 → **SQL Editor** (左边栏)
2. 点 **New query**
3. 粘贴 `supabase/migration.sql` 全部内容
4. 点 **Run** (Ctrl+Enter)

## 3. 关闭邮箱验证（重要）

1. 左边栏 → **Authentication** → **Providers**
2. **Email** → 关掉 **Confirm email** 开关
3. 保存

## 4. 获取连接信息

1. 左边栏 → **Settings** → **API**
2. 记下两个值：
   - **Project URL** (类似 `https://xxxxx.supabase.co`)
   - **anon public key** (很长的字符串)

## 5. 填入游戏代码

编辑 `js/db.js` 第 11-12 行：

```js
SUPABASE_URL: 'https://xxxxx.supabase.co',
SUPABASE_KEY: 'eyJhbGci...你的anon key',
```

推送后 GitHub Pages 自动生效。
