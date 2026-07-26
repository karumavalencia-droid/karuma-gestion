# Karuma Gestión — Phase 0 审查：Documento 与 Datos / Analytics

日期：2026-07-26（2026-07-27 更新 staging 验收结果）  
审查范围：当前工作区 `/Users/karuma/Documents/Codex/karuma-gestion` 的源码、迁移文件、类型定义和配置样例。  
执行边界：本轮从 Phase 0 审查开始；后续在用户明确要求继续后，仓库内新增了 migration 和应用代码。**始终没有执行生产数据库写入、没有删除或重建模块。** 2026-07-27 经用户授权创建了独立 Supabase staging，并只在该 staging 应用了 Documento migrations。

## 0. 初始 Phase 0 审查边界

当前用户指定的工作目录 `phase-0-karuma-gestion-documento-datos` 是空目录，没有 `.git`、源码或 `docs`。实际仓库位于上面的 `karuma-gestion` 路径，本报告基于该仓库生成。

本地仓库存在大量未提交改动（包括 `Datos`、销售同步、RestoSuite、CEO 等文件），因此本报告记录的是“当前工作树”而不是干净 HEAD。审查未覆盖这些改动的提交意图。Phase 0 后续已通过 Supabase 只读 SQL 盘点实际项目 `aiwbdjeuvcvkuyoxgomr`：生产库确实存在 `public.documentos`（1 条记录、RLS 已启用），字段为旧版 `nombre`、`categoria`、`storage_path`、`mime_type`、`tamano_bytes`、`notas`、`created_at`；没有现有 policy。生产 Storage 已有 private `documentos` bucket（25 MB 上限）、private `facturas` bucket 和 private `karuma-private` bucket。生产库没有 `invoice_items`、`facturas` 或 `compras` 同名 public 表。仓库 migrations/types 没有反映 `documentos` 的生产漂移，因此 Phase 1 采用兼容扩展而不是重建。

## 1. 当前已经具备的功能

### 应用与权限

- Next.js App Router、TypeScript、Tailwind、Supabase JS、OpenAI SDK 已接入；入口包括 `/datos`、`/compras`、`/facturas`、`/sales`、`/dashboard`、`/ceo` 等。
- 当前主会话是服务器签名 cookie（`lib/auth/session.ts` / `lib/auth/guards.ts`），不是完整的 Supabase Auth 会话。`lib/supabase/admin.ts` 只在服务端使用 `SUPABASE_SERVICE_ROLE_KEY`。
- `canViewSales` 目前按 `KARUMA_SALES_VIEWER_EMAIL`（默认 `karuma@local`）限制销售读取；销售导入要求 owner/manager。权限总开关 `PERMISSIONS_ENABLED` 当前为 `false`，所以页面级模块权限实际未启用。
- RLS 迁移覆盖很多既有表，但项目同时存在两套权限模型：自有 cookie 会话和早期 `auth.uid()` / `auth.role()` RLS。新 Documento 不能直接套用旧的 authenticated-only policy。

### Documento / 文件能力（初始代码不是 Documento 模块）

- 初始仓库没有 `app/documento`、Documento 页面、Documento API、`document_chunks` 表或企业文件搜索实现；仓库 migration/types 也没有映射 `documentos`。后续只读生产盘点确认实际已有一张 legacy `public.documentos` 表，因此实施必须扩展该表，不能创建同名替代品。
- `/facturas` 是现有最接近的能力：`components/facturas/FacturasPanel.tsx` 支持手工发票记录、筛选、预览和发送状态。
- 发票旧链路使用 `localStorage` 的 `karuma_facturas_v1`，云端使用 Vercel Blob JSON `facturas/facturas.json`；附件路径为 `facturas/files/{id}/{filename}`。文件大小上限为 2 MB，类型基本限定 PDF/JPG/PNG。
- `app/api/facturas/[id]/file` 通过服务器读取附件；旧 Blob 上传设置了 private，但并非 Supabase Storage signed URL 方案。
- 发票发送已通过 Resend，并可从 Blob 或 data URL 读取附件；这部分可作为后续“律师楼发送状态”迁移时的业务参考。

### Datos / Analytics

- `/datos` 的 `DatosPanel` 已有统一 KPI 卡片、模块扫描、CSV 导出、状态提示、RestoSuite 数据状态和旧 localStorage 迁移入口。
- `lib/datos/helpers.ts` 会扫描 `personal`、`compras`、`profit`、`restosuite`、`reviews`、`objetivo`、`inventario` 的 localStorage key，并计算销售、客户、采购、人工、利润、Google Reviews 等汇总。它仍然把多类模块当作浏览器本地 JSON，无法提供跨设备、可追溯的数据血缘。
- 销售已有相对可靠的服务器链路：`sales_daily` 按 `(location_id, business_date)` upsert，`sales_import_log` 记录导入结果；CSV、旧 localStorage、旧 Blob 和 RestoSuite 报告都可归一化到该表。
- RestoSuite 报告 API 已支持销售、付款和 KDS 菜品数据；`dish_reorder_daily` 保存去标识化的复购聚合。
- `/sales` 的 `SalesErpPanel` 已复用销售日报、支付、重购和比较计算；但当前报告重点是销售与操作 KPI，并不是完整的经营分析事实层。

### Compras、供应商和库存

- `/compras` 的 `ComprasPanel` 仍以 `localStorage` `karuma_compras_v1` 为主，包含供应商、采购单、状态、收货和库存联动的前端逻辑。
- Supabase migrations 中有 `suppliers`、`supplier_products`、`supplier_product_alerts`、`supplier_invoice_items`、`purchase_orders`、`supplier_auto_orders` 等供应链表；这些是可复用的数据基础，但字段/主键体系与现有 localStorage 类型并不完全一致。
- `inventory_items`、`inventory_movements` 已有 Supabase 迁移；同时仍有 `lib/inventario/helpers.ts` 的 localStorage 旧实现，因此 Datos 不能直接把两者相加而不标注来源。

### AI、Storage 和邮件

- `app/api/coach/chat` 和 `app/api/ceo/chat` 在服务器端调用 OpenAI Responses API，保存会话/消息，并支持工具调用；这是后续“问文件库”可复用的 API、鉴权和错误处理形态。
- AI key 只在 `OPENAI_API_KEY` 服务端环境变量中；没有 Documento 专用抽取、OCR、embedding、引用或人工校正流水线。
- 初始仓库的 Supabase Storage 代码只在旧销售 Blob/Storage 兼容逻辑中出现，迁移文件没有记录 Documento bucket 或 `storage.objects` policy；但后续只读生产盘点确认已有 private `documentos` bucket。旧发票文件当前仍主要是 Vercel Blob，不是 Supabase signed URL 链路。
- Gmail 现状仅用于预约邮件发送：`lib/reservas/email.ts` 有本地凭据文件和 Gmail API send 流程。没有 Gmail inbox 搜索、附件导入、OAuth 管理或导入幂等记录。

## 2. Documento 当前存在的问题

1. 功能上不存在独立 Documento 模块；没有首页、QuickAdd、Inbox、详情页、搜索、重分析、批量确认或状态机。
2. 文件与元数据不在数据库中，发票核心记录依赖 localStorage/Blob JSON；无法可靠地跨设备检索、关联供应商、审计修改或统计待付款/合同到期。
3. 原始附件链路仅覆盖 2 MB 的 PDF/JPG/PNG，不能满足 Word、Excel、手机照片、语音、截图等要求；没有 SHA-256、幂等键、软删除或安全文件名的统一服务端策略。
4. 没有文本提取、OCR、分类、结构化发票抽取、摘要、标签、全文索引、向量分块或来源引用。
5. 生产只有字段很少且无 policy 的 legacy `documentos`，没有 `invoice_items`；仓库则未映射这张漂移表。虽然有 `supplier_invoice_items`，但它是旧供应商 BI 结构，不能直接假设等价于 Documento 发票行项目。
6. 旧发票模型只有 `proveedor` 文本和单一 `importe`，没有稳定的 supplier/company/document 关系、付款状态、到期日、人工确认、AI 置信度或字段级锁定。
7. 旧 Blob JSON 读写存在并发覆盖风险；旧附件预览可重定向到 `archivoUrl`，因此迁移到 private Supabase Storage 时必须重新设计短时 signed URL，不能把旧 URL 直接暴露给浏览器。
8. Gmail 发送不是 Gmail 导入；凭据文件方案也不适合作为 Vercel 上的 inbox 同步方案。

## 3. Datos 当前存在的问题

1. 数据源分散：销售已进入 `sales_daily`，但采购、人工、利润、评价、库存仍大量来自 localStorage 或 mock/seed 数据。
2. `DatosPanel` 的“同步”实际调用 `sincronizarDatos()`，提示内容仍是从 localStorage 同步；这不是可追溯的 ETL 或数据库快照。
3. 现有 KPI 没有统一的事实表、数据版本、确认状态、估算标记、数据完整度、来源文件或计算依据；“估计利润”不能与已确认财务数据混淆。
4. 目前主要覆盖销售/客户/票单/采购/人工/评价的简单汇总，缺少堂食、午餐/晚餐、平台、折扣、退款、广告、平台佣金、银行付款等可核验维度。
5. 采购分析仍主要使用采购单或本地发票摘要，缺少发票明细的标准化产品、规格、单位、税率和供应商价格历史，因此无法可靠完成三文鱼规格合并与异常检测。
6. 没有统一的周期比较协议（日/周/月/自定义、上一周期、上月、去年同期）、完整度算法和异常证据链。
7. AI CEO/Coach 能查询既有工具结果，但不是 Documento 检索；当前 AI 摘要没有强制每个结论绑定查询结果/文件来源，也没有禁止无证据数字推断的通用契约。
8. RLS/权限模型不一致：部分旧 policy 使用已弃用的 `auth.role()`，部分表对 authenticated 使用 `USING (true)`；这不符合“核心经营数据仅老板可见”的目标。新 Analytics API 应继续走服务端 cookie 权限，不向浏览器开放 service role。

## 4. 可以复用的现有代码

- 文件 UI：`components/facturas/FacturasPanel.tsx` 的列表、筛选、表单、预览确认交互；`app/api/facturas/[id]/file/route.ts` 的服务端文件读取边界。
- 上传/安全处理：`lib/facturas/storage.ts` 的文件名规范化、大小限制、附件读取和错误传播思路；但存储后端应改为 Supabase private Storage + signed URL。
- 销售事实链路：`lib/sales-sync/types.ts`、`normalize.ts`、`supabaseRepo.ts`、`app/api/sales/import`、`app/api/sales/daily`、`sales_import_log` 的幂等 upsert 与导入日志。
- RestoSuite：`lib/restosuite/reportApi.ts` 的分页、认证失败识别、报告字段映射；`lib/dish-reorders` 的聚合和测试模式。
- Supabase：`lib/supabase/admin.ts` 的 server-only admin client、`lib/supabase/types.ts` 的手工类型风格，以及现有 migration 中的索引、trigger、RLS 写法。
- 权限：`getSessionUser`、`isSalesAdmin`、`canViewSales`、`isCeoAdmin`；Documento 应新增明确的 owner-only guard，而不是仅依赖隐藏导航。
- AI：Coach/CEO 的 OpenAI Responses API、工具调用、会话保存、异常返回和服务端模型配置；问文件库需另外实现检索和来源约束。
- 邮件：`lib/facturas/envio.ts` 的附件读取、批量发送和发送结果状态；不能把预约邮件 Gmail 代码直接当作 inbox 导入。
- 视觉：`components/layout/PageHeader.tsx`、`Card`、`StatCard`、`DataTable`、`Button`、`Dialog` 和现有深色/金色 token；Documento 首页应在这些基础上保持移动优先，而不是新建白色后台模板。

## 5. 建议新增或修改的数据库结构

### Phase 1 最小结构（建议新增 migration，先以 live schema 检查结果为准）

建议优先新增/扩展以下结构，避免把所有信息塞入 JSON：

- `documentos`：文件主记录。至少包括 `id`、`title`、`original_filename`、`mime_type`、`file_size`、`storage_bucket`、`storage_path`、`sha256`、`document_type`、`category`、`subcategory`、`status`、`company_id`/`restaurant_id`（如现有实体存在）、`supplier_id`、`employee_id`、日期/金额/付款字段、`source`、`source_email_id`、`summary`、`extracted_text`、`tags`、`ai_confidence`、`ai_model`、`ai_processing_error`、`parent_document_id`、`duplicate_of_id`、`human_verified`、`deleted_at`、`created_by`、`created_at`、`updated_at`。可保留受控 `metadata jsonb`。
- `document_processing_runs`：记录每次上传/重分析的阶段、attempt、状态、开始/结束、错误和模型，防止后台重试覆盖人工结果。
- `document_audit_log`：记录人工确认/编辑前后值、用户、时间和动作；敏感原文可按字段或 diff 存储，避免无限复制大文本。
- `invoice_items`：`document_id` 外键、`supplier_id`、`raw_product_name`、`normalized_product_id`（若现有产品表可对应）、`description`、`quantity`、`unit`、`unit_price`、`tax_rate`、`line_total`、时间字段。必须保留原始商品名称和规格。
- `document_links`（如果多个实体关系不能用单列覆盖）：document 与 purchase/order/payment/employee/company 的关系、关系类型和人工确认状态。
- Storage private bucket（建议名称先配置，不写死）：记录 bucket/path 在 `documentos`；bucket 是否已经存在必须先查 `storage.buckets`，已有 bucket 复用。

### 初始 Phase 0 不应提前做的结构

- `document_chunks` + pgvector、完整语义问答、重复相似度、Gmail inbox 表、付款对账和经营分析事实层属于 Phase 2–5；本轮只在设计中预留 `extracted_text`、`sha256`、处理运行和来源字段。
- 不应新建与现有 `suppliers`、`supplier_products`、`inventory_items` 重复的供应商/产品主表；先做只读 schema/外键核对。

### RLS / 权限建议

- `documentos`、`invoice_items`、处理运行、审计日志全部启用 RLS；匿名和浏览器 anon 角色默认无权访问。
- 由于当前业务鉴权使用自有 cookie，实际读写应由 Next.js server route 验证 owner 后用 service role 执行；不能把 service role key 发给客户端。
- 如果未来开放 Supabase Auth，policy 必须基于可信 app metadata/服务器映射，而不是 `raw_user_meta_data`；避免 `TO authenticated` + `USING (true)`。
- Storage bucket 必须 private；对象读取仅由 owner-authorized API 生成短时 signed URL。上传/删除也只能走服务端 API。

## 6. 初始 Phase 0 的 Phase 1 精确实施清单

1. **只读前置盘点**：通过 Supabase SQL/MCP 查询实际表、列、外键、RLS、policy、`storage.buckets` 和 `storage.objects`，与所有 migration/types 对照；确认 `documentos`、`facturas`、`proveedores/suppliers`、`compras/purchase_orders`、`invoice_items`、`supplier_invoice_items` 是否真实存在。
2. **确定兼容方案**：若 `documentos` 不存在则新建；若存在则只补缺列/索引/约束。明确旧 `facturas` localStorage/Blob 是否迁移、只读兼容还是双写过渡。
3. **新 migration**：按实际 schema 创建/扩展 `documentos`、`document_processing_runs`、`document_audit_log`、`invoice_items`（名称以现有库冲突检查结果为准），索引高频筛选列，添加更新时间 trigger、外键和软删除字段；不直接执行到生产。
4. **private Storage**：复用或创建 private bucket；统一路径 `{company}/{year}/{month}/{type}/{uuid}-{safeFilename}`；增加服务端 upload/read/delete helper，使用 signed URL，限制 MIME、大小和文件名。
5. **Documento service/API**：新增 owner-only 的批量上传、创建记录、列表、详情、更新、归档/软删除、signed URL 和重新处理占位接口；每个重要写入检查用户、校验 body、记录错误。
6. **QuickAddDocumento**：支持单/多文件、图片/相机、纯文字 note/idea、语音文件上传；前端不强制分类；显示上传进度和 `uploading → uploaded → needs_review/failed` 的可见状态。Phase 1 不接入真实 AI 抽取。
7. **首页与列表**：新建 `/documento`（或经确认的路由），复用现有深色/金色组件，加入搜索框、快捷入口、统计卡片、分类入口、最近文件和 Inbox 入口；首版搜索可先做结构化/关键词 SQL。
8. **详情/预览**：文件详情页展示原文件基本信息、预览、下载、状态、摘要/文本占位、关联信息和处理历史；编辑只更新允许字段并写 audit log，不覆盖人工确认字段。
9. **兼容与迁移策略**：保留 `/facturas` 旧功能；先不删除 localStorage/Blob 代码。若要导入旧发票，单独做可回滚的管理操作，按 hash/旧 id 幂等，不自动覆盖已有人工数据。
10. **验证**：对 API 做认证/权限、大小/MIME、重复请求、Storage private/signed URL、失败重试和移动端上传测试；执行 lint、`tsc --noEmit --incremental false`、现有测试，并记录迁移 dry-run/rollback 结果。

## 7. 预计修改的文件

以下是初始 Phase 0 规划的 Phase 1 预计范围；实际新增/修改的文件请以后文“实际实施进度”为准：

- 新增：`app/documento/page.tsx`、`app/documento/[id]/page.tsx`、`app/api/documentos/route.ts`、`app/api/documentos/[id]/route.ts`、`app/api/documentos/[id]/file/route.ts`、`app/api/documentos/[id]/reprocess/route.ts`。
- 新增：`components/documento/DocumentoHome.tsx`、`QuickAddDocumento.tsx`、`DocumentoInbox.tsx`、`DocumentoList.tsx`、`DocumentoDetail.tsx`、`DocumentoSearch.tsx`、`DocumentoPreview.tsx`。
- 新增：`lib/documentos/types.ts`、`repository.ts`、`storage.ts`、`validation.ts`、`permissions.ts`、`audit.ts`。
- 新增 migration：使用 Supabase CLI/项目规范生成实际文件名；不要手工猜文件名，也不要在本轮创建。
- 修改：`lib/supabase/types.ts`、`lib/layout/navigation.ts`、可能的 `components/layout/Sidebar.tsx`、`lib/auth/guards.ts`、`.env.local.example`、测试文件。
- 可能修改但需兼容验证：`components/facturas/FacturasPanel.tsx`、`lib/facturas/storage.ts`、`app/api/facturas/*`，仅用于链接旧数据或迁移，不应删除旧路径。

## 8. 风险和可能破坏现有功能的地方

- 旧 `/facturas` 使用 Vercel Blob JSON；切换到 Supabase 表/Storage 可能造成旧附件不可见、发送失败或重复数据，必须保留读取兼容和回滚开关。
- 当前工作树已有未提交改动，特别是 `DatosPanel`、`SalesErpPanel`、RestoSuite cron 和 Supabase client；Phase 1 不应覆盖这些改动。
- 自有 cookie 与 Supabase Auth/RLS 不一致。若直接给 `authenticated` policy，浏览器请求可能仍读不到；若给 `USING (true)` 又可能暴露经营文件。
- 上传文件会带来恶意内容、超大文件、路径穿越、重复请求和 Storage 孤儿对象风险；数据库记录与对象删除必须有补偿/清理策略。
- AI/解析任务超出 Vercel 单次执行时间或失败时，不能阻塞原文件写入；应保存 processing run 并可重试。
- 人工修改结果若被后台重跑覆盖，会破坏可信度；需要 `human_verified` 或字段级锁定，并在 update 条件中保护。
- 发票金额、税额、日期和供应商匹配错误会污染 Compras/Analytics；低置信度必须进入 review，不能自动创建供应商。
- 初始 TypeScript 检查有 5 组基线错误：`app/api/ceo/change-requests/[id]/route.ts` 的 `current`、`app/api/ceo/chat/route.ts` 缺 `drafts`、`CeoChatPanel` 的 `draftType`、`ChangeCenterPanel` 缺 `ShieldAlert`、`restosuite/session-store.ts` 的类型错误。2026-07-27 已修复并通过完整 `tsc --noEmit`。
- `npm run lint` 脚本是 `next lint`，在当前 Next 版本/配置下需单独确认命令兼容性；不能把 lint 失败自动归因于 Documento。

## 9. 需要人工配置的环境变量

当前已有、与后续功能相关的变量见 `.env.local.example`：Supabase URL/anon/service role、`KARUMA_AUTH_SECRET`、`OPENAI_API_KEY` / `OPENAI_MODEL`、Vercel Blob、RestoSuite、Resend、Gmail 预约发送变量等。staging 验收临时使用了 staging key；没有把任何真实值写入仓库或报告，权限为 600 的临时 env 文件已在验收后删除。

Phase 1 预计需要新增或确认：

- `DOCUMENTO_STORAGE_BUCKET`（或确认复用已存在 bucket 的固定名称）。
- `DOCUMENTO_MAX_FILE_BYTES`、允许 MIME/扩展名配置（建议服务端配置，不能只依赖前端）。
- 若使用异步 worker/cron：`DOCUMENTO_PROCESSING_SECRET` 或受保护的 Vercel Cron secret。
- 若 Phase 1 只做上传，不需要新的 AI key；不要为未实施的 OCR/embedding 提前配置供应商。
- Phase 2 才需要 OCR/文件解析服务、embedding/向量配置；Phase 4 才需要 Gmail OAuth client、refresh token、导入邮箱和 webhook/sync secret。

## 10. 建议测试和回滚方案

### 测试

- Migration：在 staging/本地数据库执行，检查重复/缺表/外键/RLS/policy、索引和 rollback 说明；生产只在备份和人工确认后执行。
- Storage：匿名、非 owner、owner 三种身份分别测试上传、列表、signed URL、过期 URL、删除和路径隔离；验证 bucket 不是 public。
- API：MIME/大小/文件名、批量部分成功、网络重试幂等、数据库写失败后的孤儿对象、Storage 写失败后的无残留、软删除和审计日志。
- UI：iPhone 宽度的相机/多选/进度、断网提示、失败重试、PDF/图片预览、键盘搜索、深色金色视觉回归。
- 兼容：现有 `/facturas` 列表、预览、发送律师楼；现有 `/datos` 销售读取/导入、`/compras` localStorage 数据和 `/sales` 报表。
- 质量门：`npx tsc --noEmit --incremental false`、现有 Node tests、可用的 lint 命令、迁移 dry-run，并保存基线错误清单。

### 回滚

1. 先以 feature flag/导航隐藏方式发布 Documento，不替换旧 `/facturas`。
2. 新写入通过独立表和 bucket 路径；关闭 flag 后旧模块继续工作，避免删除旧数据。
3. 若 migration 出现问题，按 migration 的反向 SQL/备份恢复新表和 policy；不要 `DROP` 任何既有表或 bucket。
4. 若上传流程异常，停止新 API/cron，保留已上传原文件和 processing run，之后可重试；必要时清理只属于新批次的孤儿对象。
5. 旧发票导入采用单独批次标识、旧 id/hash 映射和幂等约束，失败时只回滚该批次，不影响现有 `facturas` Blob JSON。

## 实际实施进度（本轮继续）

前文第 1–10 节是实施前的 Phase 0 快照。本轮在**不执行任何生产数据库迁移**、不删除旧 `/facturas` 或 `/compras` 的条件下，已在仓库中完成以下增量实现：

### Phase 1 — Documento 基础能力

- `039_documento_v1.sql` 以兼容方式扩展真实存在的旧 `public.documentos`，不重建表；增加文件元数据、状态、金额/日期、AI 字段、软删除、处理运行、审计日志和新的 `invoice_items`。新表仅显式授予 server-side `service_role`，没有向 `anon`/`authenticated` 开放，兼容 Supabase 2026 的 Data API 新表默认不自动暴露变更。
- 新增 owner-only `/documento`、上传/列表/详情/软删除/短时 signed URL API；文件始终先保存到已有的 private `documentos` bucket，路径以公司占位、年月、类型、UUID 和安全文件名构造。
- Quick Add 支持多文件、移动相机、图片、音频和快速文字笔记；原文件保存成功后会逐项自动进入 `uploading → uploaded → extracting → needs_review/processed/failed`。AI 失败不会删除原文件，并可以重试。
- 首页支持关键词、类型、处理状态、付款状态、人工确认、日期、金额和供应商 ID 筛选；浏览器从不获得 service role key。

### Phase 2 — AI 处理与人工确认

- `040_documento_processing_search.sql` 增加 PostgreSQL 关键词搜索向量与 GIN 索引。
- `044_documento_review_invoice_items.sql` 增加原子批量确认、发票商品行人工确认锁和完整审计 RPC；两个函数均为 `SECURITY INVOKER`，且只允许 server-side `service_role` 执行。
- 服务端 OpenAI 分析会生成分类、短摘要、标签、提取文字、发票头字段和原始商品行；低置信度结果停在 `needs_review`。
- 详情页可编辑类型、日期、发票号、金额、付款状态、摘要、标签、提取文本、律师交付状态和人工确认；每次写入都记录前后审计数据。
- Documento Inbox 以移动端卡片显示待确认、失败或刚上传的文件，支持单条确认、修改、重新分析、归档以及最多 50 条原子批量确认。
- 详情页现在提供 private 原文件预览/下载、处理历史、修改历史和发票商品行编辑；可保留原始商品名、规格、数量、单位、单价、税率、行总额及已存在的标准化商品 ID。
- 已确认 (`human_verified`) 的文件重新分析时只刷新 AI 诊断，**不会覆盖**已确认的结构化字段、摘要、文字或标签；人工保存过的发票行由独立的 `invoice_items_human_verified` 锁保护，重分析不会静默覆盖。AI 失败也不会把已确认文件标成 `failed`。

### Phase 3 — 文件问答与检索

- `041_documento_chunks.sql` 增加 `document_chunks`、pgvector `vector(1536)`、HNSW 索引及仅 service role 可访问的相似度 RPC。
- 文档按文本块嵌入；没有 OpenAI key 时仍保留关键词检索。问文件库只把命中的证据块送给模型；没有证据会明确拒答，金额/文件数量由程序计算，答案返回可点击的文件来源。

### Phase 4 — 关联与自动化基础

- `042_documento_associations_automation.sql` 增加供应商匹配建议、候选重复文件、Gmail 附件导入幂等记录和律师交付字段；`043_documento_supplier_tax_id.sql` 以增量方式给既有 `suppliers` 增加可选 `tax_id`（CIF/NIF）并支持精确税号匹配；候选重复绝不自动删除。
- 供应商先做 CIF/NIF、规范化名称和令牌匹配，只有高置信度且未人工确认的记录才会自动关联；确认/自动关联会同步更新该文件的 `invoice_items.supplier_id`，其余留在详情页供老板确认或忽略。
- 重复检测使用 SHA-256，或发票号/供应商/日期/总额组合，区分 exact/likely/possible。
- Gmail 只在老板明确点击“Importar Gmail”时读取附件，默认查询最近 30 天；不会标记已读、移动邮件或改变标签。导入使用现有 Gmail OAuth 文件机制和 `(message_id, attachment_id)` 唯一约束保证幂等。

### Phase 5 — Datos / Analytics 增强基础

- 保留原有 `DatosPanel` 和 localStorage 兼容模块，在顶部**增量**加入深色金色的“Análisis operativo trazable”。
- 新 owner-only `/api/analytics/operating` 从 `sales_daily`、已确认/未确认 Documento 发票、`invoice_items` 和重复候选中计算销售、客户、客单、饮料/外卖销售、确认采购、未确认采购、食材成本率、部分经营结果、供应商采购额、原始产品名价格趋势和异常。
- 每个指标/来源明确标为 `Confirmado`、`AI sin confirmar`、`Parcial`、`Estimado` 或 `Falta fuente`；结果部分明确排除尚无服务端确认来源的人工、房租、水电、广告和平台佣金。
- “Generar resumen”仅在老板主动点击时调用 AI；模型只接收程序计算的有限证据 JSON，不能自行查询数据库或臆测。缺少 OpenAI key 时回退到确定性证据摘要。

### 尚未声称完成的部分

- `039 → 040 → 041 → 042 → 043 → 044` 已在独立 staging 成功执行并通过事务验收，但**仍未应用到生产**；生产上线前仍需备份、维护窗口和人工确认。
- 没有异步队列、OCR 专用 worker、持续 Gmail webhook/cron、除发票行外的字段级锁定、付款/采购自动对账或完整 `document_links` 关系图；当前自动分析在上传后的前台流程或显式重试中执行。
- `sales_daily` 尚未提供午餐/晚餐、堂食、折扣、退款、平台佣金和营业工时的完整事实源；Analytics 对这些指标显示缺失，而不是伪造数值。
- 采购产品标准化、跨供应商同规格比价和持久化日/周/月分析快照需要在 `invoice_items` 有足够人工确认数据后继续扩展。

### 已验证的结果

- 新增/修改 Documento 与 Analytics 文件的定向 ESLint：通过，无错误或警告。
- `npm run test:restosuite`：11/11 通过。
- 新增 `tests/documento-invoice-items.test.ts`：4/4 通过（原始商品名保留、可选金额解析、空行集和非法输入拒绝）。
- 新增 `tests/analytics-operating.test.ts`：3/3 通过（日期范围、上一周期和“部分结果”免责声明）。
- `npm run build`：通过；Next.js 已成功编译并生成 `/documento`、`/documento/[id]`、Documento API 与 Analytics API 路由。
- `npx tsc --noEmit`：通过，5 组实施前 CEO/RestoSuite 基线错误已全部修复。
- 390×844 本地浏览器检查：全局鉴权门禁无横向溢出、无 Next.js 错误覆盖层、无控制台错误；由于本地浏览器会话接口被客户端拦截/延迟，本次没有进入已登录后的 Documento 内容，因此**不能把这一项视为完整移动端视觉验收**。
- `039–044` 已完成 staging 实际执行、schema/RLS/函数权限检查和可回滚事务验收；具体结果见下一节。

## 2026-07-27 — 基线修复、staging migration 与验收

### 独立 staging

- 在 `karumavalencia-droid's Org` 创建了独立项目 `karuma-gestion-staging`，project ref 为 `lolqbdoqqptavyihwvry`，区域为 Europe。
- 生产项目 `aiwbdjeuvcvkuyoxgomr` 没有执行任何写入或 migration。
- 新项目为空库，而 `039_documento_v1.sql` 的设计目标是扩展生产已有的 legacy `public.documentos`，`042/043` 也依赖既有 integer-keyed `public.suppliers`。因此 staging 先建立了与生产已盘点结构兼容的最小 legacy fixture，再按顺序执行 `039 → 040 → 041 → 042 → 043 → 044`；这不是生产重建方案。
- 创建并核验 private `documentos` bucket：`public = false`、`file_size_limit = 26214400`（25 MB），Storage 只有 Documento service-role policy。

### staging 执行时发现并修复的问题

1. `040_documento_processing_search.sql` 原先在 generated column 中直接使用 `concat_ws` 和 `array_to_string`。两者在 PostgreSQL 中是 `STABLE` 而非 `IMMUTABLE`，全新数据库会报 `generation expression is not immutable`。现已改为受限的 `IMMUTABLE` 文本包装函数 `documento_search_text(...)`，只允许 `service_role` 执行，并保留标题、文件名、发票号、付款状态、提取文本和标签搜索。
2. `044_documento_review_invoice_items.sql` 的 `confirm_document_batch` 返回列名 `document_id` 与未限定的 `invoice_items.document_id` 冲突，确认发票时会报 `column reference "document_id" is ambiguous`。现已给目标表加别名并重新应用 044。
3. Quick Note 创建时原先只写 `notas`，正文不会立即进入 `search_vector`。`app/api/documentos/route.ts` 现同时把纯文字笔记写入 `extracted_text`；原始 `.txt` 文件和 `notas` 仍然保留。

### schema、RLS 与事务验收

- 必需表缺失：`none`。
- 必需 Documento 列缺失：`none`。
- 目标表未启用 RLS：`none`。
- pgvector：`0.8.2`，`document_chunks.embedding vector(1536)` 与 HNSW 索引已创建。
- 目标函数中 `SECURITY DEFINER` 或允许 PUBLIC 执行的函数：`none`。
- 8 张目标表都只有 `service_role` policy；`anon` / `authenticated` 没有 Documento 表读写授权。
- 可回滚真实事务通过：service role 创建发票 Documento → 生成全文索引 → 原子替换 `SALMÓN 7/8` 商品行 → 批量确认 → 文件和商品行人工锁 → 审计记录 → 软归档。事务最终 `ROLLBACK`，固定测试 UUID 残留记录为 0。
- 自动化运行环境禁止本地端口监听、命令行外网和浏览器本地文件上传，因此本轮不能诚实声称完成“已部署应用中的真实文件上传 / signed URL / AI API 成功调用 / 390px 登录后视觉流”四项浏览器 E2E。已经完成的是实际 staging 数据库、RLS、RPC、搜索和 bucket 配置验收；这些 UI/网络项仍需在可部署 Preview 或人工浏览器会话中补跑。

### 最终质量门

- 定向 ESLint（5 个基线修复文件 + Documento 上传 route）：通过，0 error / 0 warning。
- `npx tsc --noEmit`：通过，0 error。
- `node --import tsx --test tests/*.test.ts`：54/54 通过。
- `npm run build`：通过；Next.js 15.5.19 编译成功并生成 113 个页面/路由。
- staging migration 顺序、RLS、函数 ACL、private bucket 和事务回滚：通过。
- 新增 `npm run test:documento-preview`：供可访问的 Vercel Preview 使用。它会签发短时 owner/manager 测试 cookie，验证 manager 拒绝、owner 上传、列表、short-lived signed URL、AI 重处理、批量确认、软归档；设置 `DOCUMENTO_E2E_REQUIRE_AI=1` 时强制 AI 成功，设置 `DOCUMENTO_E2E_CLEANUP=1` 时仅允许删除 project ref `lolqbdoqqptavyihwvry` 的 staging 测试对象和记录。

在 Preview 已连接 staging、且 Preview 环境已配置 `KARUMA_AUTH_SECRET` 和 AI 变量后，执行方式如下（不要把真实值写入仓库）：

```bash
DOCUMENTO_E2E_BASE_URL=https://<vercel-preview> \\
KARUMA_AUTH_SECRET=<preview-session-secret> \\
DOCUMENTO_E2E_REQUIRE_AI=1 \\
DOCUMENTO_E2E_CLEANUP=1 \\
NEXT_PUBLIC_SUPABASE_URL=https://lolqbdoqqptavyihwvry.supabase.co \\
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key> \\
npm run test:documento-preview
```

清理选项只用于 staging；不设置 `DOCUMENTO_E2E_CLEANUP=1` 时，测试只会执行软归档，保留审计轨迹。

### 本次实际修改文件

- 基线类型错误：
  - `app/api/ceo/change-requests/[id]/route.ts`
  - `app/api/ceo/chat/route.ts`
  - `components/ceo/CeoChatPanel.tsx`
  - `components/ceo/ChangeCenterPanel.tsx`
  - `lib/supabase/types.ts`
- staging 验收后修复：
  - `supabase/migrations/040_documento_processing_search.sql`
  - `supabase/migrations/044_documento_review_invoice_items.sql`
  - `app/api/documentos/route.ts`
- 审查记录：
  - `docs/documento-analytics-audit.md`

## 更新后的人工配置与发布顺序

除原有 Supabase、session、RestoSuite 和 Resend 变量外，`.env.local.example` 已列出：`OPENAI_DOCUMENT_MODEL`、`OPENAI_DOCUMENT_CHAT_MODEL`、`DOCUMENTO_EMBEDDING_MODEL`、`OPENAI_ANALYTICS_MODEL`、`DOCUMENTO_GMAIL_IMPORT_QUERY`、`GMAIL_USER`、`GMAIL_CREDENTIALS_FILE` 和 `GMAIL_TOKEN_FILE`。这些全部只能配置在服务器环境；Gmail 凭据/refresh token 不应进入 Git 或浏览器。

推荐上线顺序：staging migration/schema/RLS/RPC 验收（已完成）→ 在可部署 Preview 补跑 owner/non-owner API、真实上传、signed URL、AI 成功/失败重试和 390px 页面验收 → 备份/确认生产 schema → 在维护窗口按 `039–044` 应用生产 migration → 配置 OpenAI/Gmail（Gmail 可后置）→ 用少量测试文件复验 → 再开启导航给老板。任何一步异常时关闭 Documento 入口即可，旧 `/facturas`、`/compras` 和现有 Datos 仍可照常使用。

## 结论

Documento 现在已有一套可回滚的企业记忆中心基础：私有原文件、审计、人工优先的 AI 处理、关键词/语义检索、引用问答、重复/供应商建议和显式 Gmail 导入。Datos 也已开始使用可追溯服务器事实，而不是把 localStorage 估算冒充为真实经营利润。staging migration、RLS、RPC、搜索和 bucket 配置已经通过；发布前剩余关键门槛是 Preview 中的真实上传/signed URL/AI/移动端浏览器流，以及随后经备份和人工确认的生产 migration。生产数据库仍未修改。
