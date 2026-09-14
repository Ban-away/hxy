# 文化桥评估系统

**本土中文教师中华文化传播力影响力评估与调研数字化模型** —— 前后端一体的数字化评估系统：评估规则引擎 + AI 辅助分析 + 可视化仪表板，运营数据落库 SQLite，支持登录鉴权与角色权限。

## 快速开始

```bash
npm install
npm run dev        # 同时启动后端 API(:3000) + 前端 Vite(:5173) → http://localhost:5173
```

**登录账号**

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | `admin` | `admin123` |
| 教师 | `teacher` | `teacher123` |
| 专家 | `expert` | `expert123` |
| 用人单位 | `employer` | `employer123` |

## 生产部署

```bash
npm run build      # 前端构建到 dist/
npm start          # 单进程托管 API + 前端 → http://localhost:3000
```

## 技术栈

- **前端**：Vue 3（`<script setup>`）+ Vite + ECharts + vue-router
- **后端**：Node.js + Express + `node:sqlite`（内置 SQLite，无需原生编译）
- **认证**：`node:crypto` scrypt 密码哈希 + HMAC-SHA256 JWT，角色权限（RBAC）

## 数据存储与用户管理

- **数据库**：SQLite 单文件 `server/data/app.db`，首次启动自动建表并灌入 156 名教师种子数据（10 名示例 + 146 名确定性生成）。
- **数据表**：完整落地参考文档 §2.1 的 10 张表（教师主表 / 评估任务 / 知识测评 / 认知地图 / 态度量表 / 叙事评价 / 综合结果 / 用人单位反馈 / 培养单位自评 / 常模参照）+ `users`（认证）+ `alerts`（预警）。
- **用户管理**：`admin` 可对教师库增删改（`POST/PUT/DELETE /api/teachers`）；`teacher`/`expert`/`employer` 为只读/受限角色。用户密码 scrypt 加盐哈希存储，JWT 有效期 12 小时。
- **规则引擎联动**：种子数据的综合得分、等级、剖面、诊断建议均由 `src/engine/scoring.js` 在入库时实时计算，与前端展示完全一致。

## API 一览（均需 `Authorization: Bearer <token>`）

```
POST   /api/auth/login               登录
GET    /api/auth/me                  当前用户
GET    /api/dashboard/stats          概览 KPI（实时统计）
GET    /api/dashboard/profile-distribution  剖面分布（聚合）
GET    /api/dashboard/alerts         预警列表
GET    /api/dashboard/trend|three-party|norms
GET    /api/teachers?search=&status=&page=  教师库（分页/搜索/筛选）
GET    /api/teachers/:id             教师详情（含结果/反馈/诊断）
POST   /api/teachers                 新增教师（admin/expert）
PUT    /api/teachers/:id             更新教师（admin/expert）
DELETE /api/teachers/:id             删除教师（admin）
GET    /api/assessment/tasks|lifecycle
GET    /api/analysis/*               认知地图 / 访谈 / 知识测评 / 调研结论
GET    /api/meta/*                   指标 / 规则 / 模板 / 部署 / 等级配置
```

## 页面结构（五模块）

| 路由 | 模块 | 对应文档 |
|---|---|---|
| `/login` | 登录 | 认证 |
| `/` | 概览仪表板 | §5.2 智能仪表板 |
| `/assessment` | 评估管理 | §6.1 评估全生命周期 |
| `/teachers` | 教师库 | §2.1 教师主表 |
| `/teachers/:id` | 个体评估报告 | §8.1 报告摘要 |
| `/analysis` | 分析中心 | §4 AI 辅助分析 + §8.2 调研结论 |
| `/settings` | 设置 | §1.2 公式 / §3.2 规则 / §7 部署 |

## 目录结构

```
server/
├── index.js        # 入口：Express + 静态托管 dist/
├── schema.js       # 12 张表结构（§2.1 十表 + users + alerts）
├── seed.js         # 种子数据（156 教师 + 用户 + 记录）
├── db.js           # node:sqlite 连接（server/data/app.db）
├── security.js     # scrypt 哈希 + HMAC JWT
├── auth.js         # 鉴权中间件（RBAC）
└── routes.js       # 全部 API 路由
src/
├── api.js          # fetch 封装（自动携带 Token / 401 跳登录）
├── store/auth.js   # 响应式鉴权状态
├── engine/         # 评分规则引擎 + AI 分析（纯函数）
├── data/mock.js    # 参考/聚合内容（趋势、三方对比、规则、指标等）
├── theme.js        # ECharts 共享主题常量（分类色板已过 CVD 校验）
├── components/     # BaseChart / StatCard / Icon / 布局
├── styles/         # 设计令牌 tokens.css + 基础样式 base.css
└── views/          # 登录 + 五个模块页面
```

## 设计要点

- **主题**：中华文化配色 —— 墨色 `#1f2330` / 丹红 `#c03a2b` / 鎏金 `#c9a227` / 宣纸 `#f4f0e6`。
- **分类色板**（8 槽，固定顺序）已过 `validate_palette.js` 校验：色盲分离度 ΔE ≥ 9、正常视力 ΔE ≥ 19.6。
- **评分引擎**忠实实现文档 §3 规则：综合得分 `0.3·认知 + 0.3·情感 + 0.4·能力`，等级判定（优秀 ≥85 / 良好 ≥70 / 一般 ≥55 / 待提升），剖面类型识别，三方差距预警，个性化推荐。
- **数据流向**：运营数据（教师/结果/反馈/任务/预警/常模）经 API 从 SQLite 读取；参考内容（趋势、三方对比、规则、指标、模板、部署、访谈样例等）作为内置内容由前端直接引用。
