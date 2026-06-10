# 财迹 (FinTrack) — Implementation Plan (v2)

## Summary

Build a fully offline, multi-user personal finance tracking web application with Node.js/Express backend, React frontend, SQLite storage, JWT auth, and comprehensive analytics. **New in v2: responsive design for desktop & mobile, light/dark theme support.**

---

## 0. Key Design Decisions (Updated)

| Decision | Choice | Rationale |
|---|---|---|
| Responsive | CSS media queries + flexbox/grid, mobile-first | Sidebar collapses to bottom tab bar on mobile (<768px) |
| Theme | CSS custom properties + React Context | `data-theme` attribute on `<html>`, persisted in localStorage |
| Charts | Recharts with theme-aware colors | Pie/Line/Bar colors adapt to light/dark via CSS vars |
| Mobile Nav | Bottom tab bar (4 icons: 仪表盘/资产/收支/设置) | Replaces sidebar on screens <768px |

---

## 1. Project Scaffolding & Configuration

### 1.1 Directory Structure
```
FinTrack/
├── README.md
├── .env.example
├── .gitignore
├── setup.bat
├── start.bat
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── config.js
│   │   ├── db/
│   │   │   ├── connection.js
│   │   │   ├── schema.js
│   │   │   └── seed.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── accounts.js
│   │   │   ├── assets.js
│   │   │   ├── deposits.js
│   │   │   ├── transactions.js
│   │   │   ├── analytics.js
│   │   │   ├── export.js
│   │   │   └── import.js
│   │   ├── services/
│   │   │   ├── accountService.js
│   │   │   ├── assetService.js
│   │   │   ├── depositService.js
│   │   │   ├── transactionService.js
│   │   │   ├── analyticsService.js
│   │   │   └── importExportService.js
│   │   └── utils/
│   │       ├── xirr.js
│   │       ├── depositCalc.js
│   │       └── csvWriter.js
│   └── tests/
│       ├── auth.test.js
│       ├── accounts.test.js
│       ├── assets.test.js
│       ├── deposits.test.js
│       ├── transactions.test.js
│       ├── xirr.test.js
│       └── importExport.test.js
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useTheme.js
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── MobileBottomNav.jsx
│   │   │   │   └── Header.jsx
│   │   │   ├── common/
│   │   │   │   ├── Loading.jsx
│   │   │   │   ├── ErrorMessage.jsx
│   │   │   │   ├── ConfirmDialog.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   └── ThemeToggle.jsx
│   │   │   ├── charts/
│   │   │   │   ├── AssetTrendChart.jsx
│   │   │   │   ├── AssetPieChart.jsx
│   │   │   │   └── MonthlyBarChart.jsx
│   │   │   └── cards/
│   │   │       ├── StatCard.jsx
│   │   │       └── AccountCard.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Accounts.jsx
│   │   │   ├── Assets.jsx
│   │   │   ├── Deposits.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── DataImportExport.jsx
│   │   │   └── ReportExport.jsx
│   │   └── styles/
│   │       ├── index.css          # CSS reset, variables, utility classes
│   │       ├── theme.css          # Light/dark theme definitions
│   │       └── responsive.css     # Media queries, mobile layout
│   └── tests/
│       ├── Login.test.jsx
│       └── Dashboard.test.jsx
```

### 1.2 Key Dependencies

**server/package.json:** express, better-sqlite3, bcryptjs, jsonwebtoken, express-validator, cors, dotenv, multer, uuid, csv-stringify, xlsx, jest, supertest

**client/package.json:** react, react-dom, react-router-dom, axios, recharts, vite, @vitejs/plugin-react, @testing-library/react, @testing-library/jest-dom, vitest, jsdom

---

## 2. Database Schema (SQLite)

### 2.1 Tables

```sql
-- users: multi-user isolation
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- accounts: fund accounts (wechat, alipay, bank cards, brokerage)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('cash','savings','investment','other')),
  asset_category TEXT NOT NULL CHECK(asset_category IN ('cash','deposit','investment')),
  current_balance REAL NOT NULL DEFAULT 0,
  last_updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

-- balance_snapshots: historical balance records for trend charts
CREATE TABLE balance_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  balance REAL NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  source TEXT CHECK(source IN ('manual_update','adjustment','deposit_redemption'))
);

-- adjustment_records: audit trail for balance changes
CREATE TABLE adjustment_records (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  old_balance REAL NOT NULL,
  new_balance REAL NOT NULL,
  adjustment_amount REAL NOT NULL,
  adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('set','add','subtract')),
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- time_deposits: fixed-term deposits with simple interest
CREATE TABLE time_deposits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  principal REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  annual_rate REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','redeemed','matured')),
  redeemed_at TEXT,
  redeemed_amount REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- income_expenses: independent income/expense records
CREATE TABLE income_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 3. Backend Implementation Steps (Express + SQLite)

### Step 1: Server Scaffolding
- `server/package.json` with all dependencies
- `server/src/config.js` — dotenv, export JWT_SECRET, DB_PATH, PORT
- `server/src/db/connection.js` — better-sqlite3 singleton
- `server/src/db/schema.js` — `initializeDatabase()` runs CREATE TABLE IF NOT EXISTS
- `server/src/index.js` — Express app: cors({origin:'http://localhost:10004'}), express.json(), mount routes, error handler, call init DB, listen

### Step 2: Auth Middleware & Routes
- `server/src/middleware/auth.js` — extract Bearer token, verify JWT, attach `req.userId`
- `POST /api/auth/register` — validate username (3-20 chars) + password (6+ chars), bcrypt hash, insert user, return JWT
- `POST /api/auth/login` — find user by username, bcrypt compare, return JWT
- `GET /api/auth/me` — return current user info (protected)

### Step 3: Account Routes
- `GET /api/accounts` — list all accounts for user
- `POST /api/accounts` — create account: name, type, asset_category, initial_balance
- `PUT /api/accounts/:id` — update name, type; prevent changing asset_category if linked to deposits
- `DELETE /api/accounts/:id` — only if no active deposits linked
- `POST /api/accounts/:id/set-balance` — override balance, record snapshot + adjustment
- `POST /api/accounts/:id/adjust` — adjust by delta (+/-), record snapshot + adjustment
- `GET /api/accounts/:id/history` — adjustment records with date filtering

### Step 4: Time Deposit Routes
- `GET /api/deposits` — list with computed `current_value`, `days_remaining`, `days_held`
- `POST /api/deposits` — create: principal, start_date, end_date, annual_rate, account_id
- `PUT /api/deposits/:id` — update fields
- `POST /api/deposits/:id/redeem` — mark redeemed, add amount to linked account, record snapshot
- `DELETE /api/deposits/:id` — only if status='active'

### Step 5: Transaction (Income/Expense) Routes
- `GET /api/transactions` — list with ?type, ?category, ?startDate, ?endDate
- `POST /api/transactions` — create
- `PUT /api/transactions/:id` — update
- `DELETE /api/transactions/:id` — delete
- `GET /api/transactions/summary` — monthly aggregation by type

### Step 6: Analytics Routes
- `GET /api/analytics/overview` — total_assets, total_principal, total_profit, xirr_return
- `GET /api/analytics/trend?days=30` — daily asset values (from snapshots, with linear interpolation for gaps)
- `GET /api/analytics/distribution` — by account type and asset category
- `GET /api/analytics/monthly` — monthly income vs expense

### Step 7: Export Routes
- `GET /api/export/transactions?format=csv` — CSV download
- `GET /api/export/assets?format=xlsx` — Excel workbook
- `GET /api/export/all` — JSON with version field, all user data

### Step 8: Import Route
- `POST /api/import` — multer file upload, validate JSON structure (version, data keys), wrap in transaction, replace all user data on success, rollback on failure

### Step 9: Utility Functions
- `xirr.js` — Newton's method XIRR, input [{date, amount}], output annual rate
- `depositCalc.js` — `computeCurrentValue(principal, startDate, endDate, annualRate)`: simple interest capped at maturity
- `csvWriter.js` — generate CSV string from array of objects

---

## 4. Frontend Implementation Steps

### Step 10: React App Setup (Vite)
- `vite.config.js` — proxy `/api` to `http://localhost:3000`, dev server on port 10004
- Install all dependencies
- `main.jsx` — render App

### Step 11: Theme System (CSS Variables + Context)
- `styles/theme.css`:
  ```css
  :root, [data-theme="light"] {
    --color-bg-primary: #f8f9fa;
    --color-bg-secondary: #ffffff;
    --color-bg-card: #ffffff;
    --color-text-primary: #212529;
    --color-text-secondary: #6c757d;
    --color-border: #dee2e6;
    --color-accent: #4f46e5;
    --color-accent-hover: #4338ca;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-danger: #ef4444;
    --color-chart-1: #4f46e5;
    --color-chart-2: #10b981;
    --color-chart-3: #f59e0b;
    --color-chart-4: #ef4444;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.1);
  }
  [data-theme="dark"] {
    --color-bg-primary: #111827;
    --color-bg-secondary: #1f2937;
    --color-bg-card: #1f2937;
    --color-text-primary: #f3f4f6;
    --color-text-secondary: #9ca3af;
    --color-border: #374151;
    --color-accent: #6366f1;
    --color-accent-hover: #818cf8;
    --color-success: #34d399;
    --color-warning: #fbbf24;
    --color-danger: #f87171;
    --color-chart-1: #6366f1;
    --color-chart-2: #34d399;
    --color-chart-3: #fbbf24;
    --color-chart-4: #f87171;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.4);
  }
  ```
- `contexts/ThemeContext.jsx` — ThemeProvider: read `data-theme` from `<html>`, toggle function, persist to localStorage, apply class
- `components/common/ThemeToggle.jsx` — sun/moon icon button in header

### Step 12: Responsive Layout
- `styles/responsive.css`:
  - Breakpoints: `sm: 576px`, `md: 768px`, `lg: 992px`, `xl: 1200px`
  - Mobile (<768px): Sidebar hidden, BottomNav visible, single-column layout, cards full-width, forms stacked
  - Tablet (768-992px): Sidebar as icon-only rail (optional, keep simple sidebar for now)
  - Desktop (>=992px): Full sidebar with text labels, multi-column dashboard grid, side-by-side charts
- `components/layout/AppLayout.jsx`:
  - Renders Sidebar (desktop) or MobileBottomNav (mobile) based on `window.innerWidth` + resize listener
  - Main content area with proper padding for bottom nav on mobile
- `components/layout/Sidebar.jsx`:
  - Fixed left, 240px width on desktop
  - Hidden (display:none) below 768px
  - Nav links: 仪表盘, 账户管理, 资产列表, 定期存款, 收支记录, 数据导入导出, 报表导出
  - Logout at bottom
- `components/layout/MobileBottomNav.jsx`:
  - Fixed bottom, full width, 4 primary tabs: 仪表盘 / 资产 / 收支 / 设置
  - Active state with accent color
  - Hidden above 768px
- `components/layout/Header.jsx`:
  - Top bar with page title (left) + username + ThemeToggle (right)
  - Sticky position

### Step 13: API Client & Auth Context
- `api/client.js` — axios instance, baseURL='/api', JWT interceptor, 401 → logout redirect
- `contexts/AuthContext.jsx` — user state, login/register/logout functions, token in localStorage
- `hooks/useAuth.js` — convenience hook

### Step 14: Auth Pages (Login & Register)
- `Login.jsx` — centered card, mobile-responsive (full-width on small screens), form validation
- `Register.jsx` — same style, confirm password validation, redirect to login on success

### Step 15: Dashboard Page
- `Dashboard.jsx`:
  - Responsive grid: 4 stat cards (1-col mobile, 2-col tablet, 4-col desktop)
  - StatCard component: icon, label, value, trend indicator
  - Charts section: 2-col desktop, stacked on mobile
  - Deposit maturity reminders: list cards with countdown badge
  - All cards use CSS variables for theme adaptation

### Step 16: Accounts Page
- `Accounts.jsx`:
  - Account cards grid (1-col mobile, 2-col tablet, 3-col desktop)
  - AccountCard: name, type badge, balance, last updated
  - Add/Edit modal form (responsive)
  - Delete with ConfirmDialog
  - Filter by type (dropdown or horizontal scroll chips)

### Step 17: Assets Page
- `Assets.jsx`:
  - Grouped by account, each group shows current balance + last updated
  - "更新余额" button → modal: new value + note
  - "调整增/减" button → modal: +/- amount + note
  - History table below each account (last 10, responsive horizontal scroll on mobile)

### Step 18: Time Deposits Page
- `Deposits.jsx`:
  - Card list: principal, rate, current computed value, days remaining countdown
  - Near-maturity (<7d) cards get warning highlight
  - Add form: principal, dates (date inputs), rate, linked account selector
  - Redeem button with confirmation
  - Responsive: full-width cards on mobile

### Step 19: Transactions Page
- `Transactions.jsx`:
  - Filter bar: type toggle (income/expense/all), category dropdown, date range
  - Quick-add form (inline or expandable on mobile)
  - Transactions table: desktop table, mobile card list
  - Monthly summary section
  - Export CSV button

### Step 20: Data Import/Export Page
- `DataImportExport.jsx`:
  - Export section: button → download JSON with date-stamped filename
  - Import section: file input → preview → ConfirmDialog → upload → result
  - Clear warnings about data overwrite
  - Mobile-friendly: stacked layout

### Step 21: Report Export Page
- `ReportExport.jsx`:
  - Card buttons: CSV export (transactions), Excel export (asset overview)
  - Simple, clean layout

### Step 22: Chart Components (Theme-Aware)
- `AssetTrendChart.jsx`:
  - Recharts LineChart, period buttons (30d/90d/1y)
  - Read chart colors from CSS variables via `getComputedStyle`
  - ResponsiveContainer for auto-sizing
- `AssetPieChart.jsx`:
  - PieChart with custom label formatting (name + percentage)
  - Theme-aware colors
- `MonthlyBarChart.jsx`:
  - Grouped BarChart (income green, expense red)
  - Tooltip with formatted amounts

### Step 23: Common Components
- `Loading.jsx` — centered spinner
- `ErrorMessage.jsx` — alert banner
- `ConfirmDialog.jsx` — modal with title, message, cancel/confirm actions
- `EmptyState.jsx` — illustration + message + optional action button
- All themed via CSS variables

---

## 5. Scripts & Deployment

### Step 24: setup.bat
```bat
@echo off
echo === 财迹 FinTrack 环境配置 ===
REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 ( echo Node.js not found! & pause & exit /b 1 )
REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 ( echo npm not found! & pause & exit /b 1 )
REM Install server deps
cd /d "%~dp0server"
call npm install
REM Install client deps
cd /d "%~dp0client"
call npm install
REM Copy .env
cd /d "%~dp0"
if not exist .env ( copy .env.example .env & echo .env created from .env.example - please set JWT_SECRET )
echo === Setup complete ===
pause
```

### Step 25: start.bat
```bat
@echo off
echo === 财迹 FinTrack ===
cd /d "%~dp0"
start "FinTrack Server" cmd /k "cd server && npm start"
start "FinTrack Client" cmd /k "cd client && npm run dev"
timeout /t 3 >nul
start http://localhost:10004
```

---

## 6. Testing

### Step 26: Backend Tests (Jest + Supertest)
- `auth.test.js` — register, login, duplicate username, invalid password, me endpoint
- `accounts.test.js` — CRUD, set-balance, adjust, history
- `assets.test.js` — snapshot creation, balance computation
- `deposits.test.js` — CRUD, interest calculation, redemption
- `transactions.test.js` — CRUD, filtering, summary aggregation
- `xirr.test.js` — known cash flows with expected rates
- `importExport.test.js` — export JSON, validate, import with validation, rollback on bad data

### Step 27: Frontend Tests (Vitest + RTL)
- `Login.test.jsx` — form validation errors, successful login redirect
- `Dashboard.test.jsx` — stat cards render with data, charts mount

---

## 7. README.md Contents

1. Project overview & design philosophy
2. Tech stack
3. Directory structure
4. Quick start (setup.bat + start.bat)
5. API reference (endpoints table)
6. Design decisions: simple interest rationale, XIRR approach, why no email registration
7. Import/export usage guide
8. Screenshots (placeholders)
9. License

---

## Implementation Order (Priority)

| # | Phase | Steps |
|---|-------|-------|
| 1 | Project skeleton | 1, 10, 24, 25 |
| 2 | Database + Auth | 2, 3, 11, 12, 13, 14 |
| 3 | Core CRUD APIs | 4, 5, 6 |
| 4 | Core UI pages | 15, 16, 17, 18, 19 |
| 5 | Analytics + Charts | 7, 22 |
| 6 | Import/Export | 8, 9, 20, 21 |
| 7 | Tests | 26, 27 |
| 8 | Polish & README | Theme consistency, mobile QA, README |
