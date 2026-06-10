# 财迹 FinTrack — 个人记账 Web 应用

> **数据私有** · **多用户** · **局域网共享** · **一键备份迁移**

💎 财迹 (FinTrack) 是一款轻量级个人记账 Web 应用。数据存储在本地，无需联网即可使用，同时支持局域网内多设备浏览器访问。支持多用户独立账户、管理员用户管理、定期存款自动计息、XIRR 投资收益率分析和完整的数据导入导出。

**作者**：lianghuaiyuan　|　hrblianghuaiyuan@163.com

---

## 设计理念

### 为什么按账户记录总金额而不是每笔交易？

传统记账软件要求记录每一笔理财、基金、股票的买卖明细，对只想了解「我的总资产是多少、赚了多少钱」的用户来说过于复杂。

财迹采用**账户为单位**的设计：
- 为每个资金账户（微信零钱、支付宝、招商银行、中信证券等）记录**当前总余额/市值**
- 余额变化时，点击「更新余额」或「增减金额」即可
- 所有变动自动保存历史快照，用于资产趋势图和收益率计算

### 收支与投资分离

收入和支出独立记录，与投资账户变动分开。计算投资收益率时剔除新增投入和赎回影响，得到准确的 **XIRR（内部收益率）**。

---

## 核心功能

- 🔐 **多用户本地认证**：用户名+密码注册（无邮箱），JWT 令牌，数据完全隔离
- 🛡️ **管理员面板**：查看/删除用户、重置密码、设置/取消管理员权限
- 💰 **资金账户管理**：零钱、银行、证券投资、其他类型，资产类别灵活配置
- 📊 **资产市值更新**：覆盖式更新或增量调整，自动保存历史快照
- 🏦 **定期存款自动计息**：单利按日计算，到期提醒，一键赎回
- 📝 **收支独立记录**：7类支出+5类收入，月度统计，CSV 导出
- 📈 **精美图表分析**：渐变面积趋势图、环形分布图（外部标签+中心总值）、圆角柱状图
- 📦 **数据导入导出**：JSON 备份，换电脑迁移
- 🌓 **亮色/暗色主题**：自动跟随或手动切换，图表色系同步适配
- 📱 **响应式设计**：桌面侧边栏，手机底部标签栏+弹出菜单
- 🌐 **局域网访问**：启动后同网络下任意设备浏览器均可访问

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + Vite | 开发服务器端口 5173，绑定 0.0.0.0 |
| 路由 | React Router v6 | 保护路由 + 认证拦截 |
| 图表 | Recharts | 环形图、面积折线图、圆角柱状图 |
| 样式 | CSS Variables + Media Queries | 亮/暗主题、响应式、时间线 |
| 后端 | Node.js + Express | RESTful API，端口 10004，绑定 0.0.0.0 |
| 数据库 | SQLite (better-sqlite3) | 本地文件存储，WAL 模式 |
| 认证 | JWT + bcryptjs | 7天过期，无状态，含 isAdmin 字段 |
| 报表 | node-xlsx, csv-stringify | Excel + CSV 导出（带认证的 blob 下载） |
| 测试 | Jest + Supertest / Vitest + RTL | 前后端全覆盖 |

---

## 目录结构

```
FinTrack/
├── README.md
├── USER_MANUAL.md / .html     # 使用手册
├── .env / .env.example        # 环境变量
├── .gitignore
├── setup.bat                  # Windows 一键安装
├── start.bat                  # Windows 一键启动
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js           # Express 入口
│       ├── config.js          # 配置读取
│       ├── db/
│       │   ├── connection.js  # SQLite 连接
│       │   └── schema.js      # 表结构 + 迁移 + admin 种子
│       ├── middleware/
│       │   ├── auth.js        # JWT 验证 + admin 中间件
│       │   ├── validate.js    # 输入校验
│       │   └── errorHandler.js
│       ├── routes/
│       │   ├── auth.js        # 注册/登录/改密/注销
│       │   ├── accounts.js    # 账户 CRUD + 余额调整
│       │   ├── deposits.js    # 定存 CRUD + 赎回
│       │   ├── transactions.js# 收支记录
│       │   ├── analytics.js   # 概览/趋势/分布/月度
│       │   ├── export.js      # CSV/Excel/JSON 导出
│       │   ├── import.js      # JSON 导入
│       │   └── admin.js       # 用户管理（需管理员）
│       └── utils/
│           ├── xirr.js        # XIRR 牛顿迭代法
│           ├── depositCalc.js # 定存单利计算
│           └── csvWriter.js   # CSV 生成
├── client/
│   ├── package.json
│   ├── vite.config.js         # Vite + API 代理 + host: 0.0.0.0
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # 路由（含 /admin）
│       ├── styles/app.css     # 全局样式 + 时间线 + 移动菜单
│       ├── api/client.js      # Axios（401 智能拦截）
│       ├── contexts/          # AuthContext（含 isAdmin）、ThemeContext
│       ├── hooks/             # useAuth、useTheme
│       ├── components/
│       │   ├── common/        # Loading, ErrorMessage, ConfirmDialog, EmptyState
│       │   └── layout/        # AppLayout, Header, Sidebar（admin过滤）, MobileBottomNav（弹出菜单）
│       └── pages/             # 12 个页面（含 Admin）
```

---

## 快速开始

### 前提条件
- **Node.js** >= 16（推荐 18+）

### 1. 安装

双击 `setup.bat`，自动安装前后端依赖、复制环境变量。

### 2. 启动

双击 `start.bat`（开发模式），同时启动：
- 后端：`http://localhost:10004`
- 前端：`http://localhost:5173`

生产模式双击 `start-prod.bat`，单端口 `http://localhost:10004` 同时提供前后端。详见上方「生产部署」。

### 3. 局域网访问

同一网络下其他设备访问 `http://<本机IP>:10004`（如 `http://192.168.1.100:10004`）。

### 预置账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `admin` | `admin1234` |
| 演示 | `demo` | `demo1234` |

---

## 生产部署

### 快速部署（单端口）

```bash
# Windows：双击 deploy.bat
# 或手动执行：
cd client && npm install && npm run build
cd ../server && npm install --omit=dev
```

然后双击 `start-prod.bat`，访问 `http://localhost:10004`。

前端静态文件由 Express 直接托管，无需 Vite 开发服务器。一个端口搞定一切。

### 部署到云服务器

1. 将整个项目文件夹上传到服务器
2. 运行 `deploy.bat`（Windows）或手动构建
3. 用 `start-prod.bat` 或 `node server/src/index.js` 启动
4. 配置防火墙开放 10004 端口
5. （可选）使用 Nginx/Caddy 反代到 80/443 端口

### 环境变量

编辑 `.env`：

```env
JWT_SECRET=你的随机密钥    # 务必修改
PORT=10004                 # 服务端口
NODE_ENV=production        # 生产模式
```

---

## API 文档

### 认证
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录（返回 token, userId, username, isAdmin） |
| GET | `/api/auth/me` | 当前用户 |
| PUT | `/api/auth/password` | 修改密码 |
| DELETE | `/api/auth/account` | 注销账户 |

### 账户
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/accounts` | 账户列表 |
| POST | `/api/accounts` | 创建（type: 零钱/银行/证券投资/其他） |
| PUT | `/api/accounts/:id` | 编辑 |
| DELETE | `/api/accounts/:id` | 删除 |
| POST | `/api/accounts/:id/set-balance` | 设置余额 |
| POST | `/api/accounts/:id/adjust` | 增减调整 |
| GET | `/api/accounts/:id/history` | 变动记录 |

### 定存
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/deposits` | 列表（含计算后的本息和） |
| POST | `/api/deposits` | 创建 |
| PUT | `/api/deposits/:id` | 编辑 |
| POST | `/api/deposits/:id/redeem` | 赎回到关联账户 |
| DELETE | `/api/deposits/:id` | 删除 |

### 收支
| 方法 | 端点 | 说明 |
|------|------|------|
| GET/POST/PUT/DELETE | `/api/transactions[/:id]` | CRUD |
| GET | `/api/transactions/summary` | 月度汇总 |

### 分析
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/analytics/overview` | 总览（totalAssets, totalProfit, depositValue, xirrRate…） |
| GET | `/api/analytics/trend?days=90` | 资产趋势 |
| GET | `/api/analytics/distribution` | 分布（返回 {grp, total}） |
| GET | `/api/analytics/monthly` | 月度收支对比 |

### 导入导出
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/export/transactions?format=csv` | 收支 CSV |
| GET | `/api/export/assets?format=xlsx` | 资产 Excel |
| GET | `/api/export/all` | 完整备份 JSON |
| POST | `/api/import` | 导入 JSON（multipart） |

### 管理（需 isAdmin）
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 所有用户列表 |
| DELETE | `/api/admin/users/:id` | 删除用户 |
| POST | `/api/admin/users/:id/reset-password` | 重置密码 |
| POST | `/api/admin/users/:id/toggle-admin` | 切换管理员 |

所有 `/api/accounts` 及之后接口均需 `Authorization: Bearer <token>` 头。

---

## 设计决策

### 定期存款：单利按日计息

中国银行定存普遍采用单利。公式：`本息和 = 本金 + 本金 × 年利率 × (已存天数 / 365)`。对 1-5 年期限，复利差异可忽略。

### XIRR

牛顿迭代法，基于账户调整+定存交易构建现金流序列，剔除新增投入影响，反映纯粹投资收益率。

### 管理员设计

`users.is_admin` 列标记权限。JWT 中携带 `isAdmin`，前端侧边栏和路由据此过滤。管理员不能取消自己的权限。普通用户完全不感知管理功能。

### 时间显示

SQLite 存储 UTC 时间，`fmtDate()` 强制 UTC 解析后转换到北京时间（Asia/Shanghai），格式 `YYYY/MM/DD HH:mm`。

---

## 测试

```bash
# 后端（Jest + Supertest）
cd server && npm test      # 5 suites, 24 tests

# 前端（Vitest + RTL）
cd client && npx vitest run
```

---

## 许可证

MIT License
