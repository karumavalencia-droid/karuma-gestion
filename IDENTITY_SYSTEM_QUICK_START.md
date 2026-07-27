# 🚀 Identity System v1.0 — Quick Start Guide

**状态**: ✅ 阶段 1-2 完成 | **分支**: `feat/identity-system-v1` | **日期**: 2026-07-13

---

## 📋 完成情况

### 阶段 1：数据库 + RLS ✅
```
✅ 3 个 Migrations (029-031)
✅ 5 个新表 + RLS 策略
✅ 12 个权限检查函数
✅ 8 个优化索引
✅ 9 个 TypeScript 类型
✅ 3 个服务库（OTP、Auth、Permissions）
```

### 阶段 2：OTP APIs + UI ✅
```
✅ 4 个 REST APIs
✅ 登录 UI 更新（2 步骤流程）
✅ Session 管理（httpOnly cookies）
✅ 审计日志（所有登录）
✅ 完整错误处理
✅ 文档 + 测试清单
```

---

## 🎯 现在需要做什么？

### Step 1: 应用 Migrations（❌ 必须先做）

在 Supabase 仪表板 SQL 编辑器中执行：

```bash
# 从这个目录复制内容：
supabase/migrations/029_identity_auth_tables.sql
supabase/migrations/030_identity_session_tracking.sql
supabase/migrations/031_identity_enable_permissions.sql

# 粘贴到 Supabase SQL 编辑器，按顺序执行
```

**验证**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'auth_%';
-- 应该返回 5 个表
```

---

### Step 2: 测试 OTP Flow

**方式 1：UI（浏览器）**
```
1. npm run dev
2. 打开 http://localhost:3000/login
3. 选择 "Oficina / Jefe"
4. 输入手机号 → "Enviar código"
5. 在服务器日志中查看 OTP（现在是 console.log）
6. 输入代码 → "Verificar"
```

**方式 2：API（curl）**
```bash
# 请求 OTP
curl -X POST http://localhost:3000/api/auth/login/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+34600123456"}'

# 查看服务器日志中的 OTP
# 验证 OTP
curl -X POST http://localhost:3000/api/auth/login/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+34600123456", "code": "123456"}' \
  -c cookies.txt

# 查看 cookies（应该有 karuma_session）
```

---

### Step 3: 集成真实 SMS（可选现在，必须在部署前）

**文件**: `lib/auth/otp-service.ts`

**改动位置**: 第 70 行，`requestOtp()` 函数

从：
```typescript
// 发送 SMS（暂时只记录日志，稍后集成 Twilio）
console.log(`[OTP] 发送给 ${normalizedPhone}: ${code}`);
```

改为：
```typescript
// 调用 Twilio
const twilioResult = await fetch('https://api.twilio.com/...', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.TWILIO_AUTH_TOKEN}` },
  body: new FormData({
    To: normalizedPhone,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: `Tu código de Karuma es: ${code}. Válido por 5 minutos.`
  })
});
```

**Env vars** (添加到 `.env.local`):
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

---

## 🔍 API 快速参考

| 端点 | 方法 | 用途 |
|-----|------|------|
| `/api/auth/login/otp/request` | POST | 请求 OTP（发 SMS） |
| `/api/auth/login/otp/verify` | POST | 验证 OTP（登录） |
| `/api/auth/register` | POST | 创建账户（Owner only） |
| `/api/auth/logout` | POST | 退出登录 |

**测试 Owner 操作**（需要先登录为 Owner）:
```bash
# 1. 先登录（手机/OTP）
# 2. 创建新账户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Cookie: karuma_session=..." \
  -d '{
    "phone": "+34601234567",
    "displayName": "María",
    "roleId": "manager"
  }'
```

---

## 📁 文件位置

### Migrations
```
supabase/migrations/
├── 029_identity_auth_tables.sql
├── 030_identity_session_tracking.sql
└── 031_identity_enable_permissions.sql
```

### APIs
```
app/api/auth/
├── login/otp/request/route.ts
├── login/otp/verify/route.ts
├── register/route.ts
└── logout/route.ts
```

### Libraries
```
lib/auth/
├── otp-service.ts        (OTP 生成/验证)
├── supabase-auth.ts      (Auth 账户管理)
└── permission-guard.ts   (权限检查中间件)
```

### Documentation
```
├── IDENTITY_SYSTEM_PHASE1.md    (DB 设计)
├── IDENTITY_SYSTEM_PHASE2.md    (APIs 详细)
└── IDENTITY_SYSTEM_QUICK_START.md (本文件)
```

---

## 🐛 常见问题

### Q: "OTP 一直显示 console.log"
A: 正常。现在没有配置 Twilio，OTP 只打印到服务器日志。查看终端看代码。

### Q: "POST /api/auth/register 返回 403"
A: 只有 Owner 可以创建账户。先登录为 Owner 再试。

### Q: "Login 后页面没变"
A: migrations 可能没应用。检查 Supabase 中是否存在 auth_accounts 表。

### Q: "Cookie 没有设置"
A: 检查环境：
   - 本地开发: `secure: false` ✅
   - 生产环境: 需要 HTTPS

---

## 🧪 测试检清单

- [ ] Migrations 在 Supabase 应用成功
- [ ] 表存在：`auth_accounts`, `auth_otp_sessions`, `auth_login_logs`, `auth_sessions`
- [ ] RLS 生效：匿名查询被拒绝
- [ ] API 响应正确（curl 测试）
- [ ] UI 显示 OTP 字段
- [ ] 可以请求 OTP（服务器日志显示代码）
- [ ] 可以验证 OTP（新用户返回 isNewUser: true）
- [ ] 可以创建账户（Owner only）
- [ ] 可以退出登录（cookies 清除）

---

## 📚 详细文档

- **Fase 1**: 见 `IDENTITY_SYSTEM_PHASE1.md`（DB 设计、RLS、函数）
- **Fase 2**: 见 `IDENTITY_SYSTEM_PHASE2.md`（API 详细、示例、测试）
- **下一步**: Fase 3（权限校验、admin 后台）

---

## 💡 快速恢复（如果出问题）

```sql
-- 在 Supabase SQL 编辑器中：
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS auth_login_logs CASCADE;
DROP TABLE IF EXISTS auth_otp_sessions CASCADE;
DROP TABLE IF EXISTS auth_accounts CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- 然后重新应用 migrations 029-031
```

---

## 🚀 部署前 Checklist

- [ ] Migrations 应用成功
- [ ] SMS 提供商配置（Twilio/Aliyun）
- [ ] Env vars 设置完整
- [ ] HTTPS 配置（生产）
- [ ] Rate limiting 配置（防 OTP 滥用）
- [ ] 监控告警（异常登录）
- [ ] Owner 初始账户创建

---

**Next Step**: 应用 Migrations → 测试 OTP → 准备 Fase 3（权限校验 + Admin）
