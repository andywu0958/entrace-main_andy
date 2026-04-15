# 公司資產管理系統

一個基於 Node.js 的完整資產管理系統，使用 Express.js 作為後端框架，EJS 作為前端模板，MSSQL 作為資料庫。

## 功能特色

### 核心功能
- ✅ 使用者認證系統 (Session-based)
- ✅ 角色權限控制 (RBAC)
  - 管理員：全域 CRUD 權限
  - 部門管理員：僅能操作自己部門的資產
- ✅ 資產管理 (CRUD 操作)
- ✅ QR Code 自動生成與管理
- ✅ 部門管理
- ✅ 數據統計與分析

### 進階功能
- ✅ 響應式設計 (支援行動裝置)
- ✅ 即時搜尋與篩選
- ✅ 分頁功能
- ✅ 資料匯出 (CSV 格式)
- ✅ API 介面
- ✅ 錯誤處理與日誌記錄

## 系統需求

- Node.js 14.0 或更高版本
- MSSQL Server 2012 或更高版本
- npm 或 yarn 套件管理器

## 安裝步驟

### 1. 複製專案
```bash
git clone <repository-url>
cd entrace
```

### 2. 安裝依賴套件
```bash
npm install
```

### 3. 設定環境變數
複製 `.env.example` 為 `.env` 並修改設定：
```bash
cp .env.example .env
```

編輯 `.env` 檔案，設定資料庫連線等參數：
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (MSSQL)
DB_SERVER=localhost
DB_DATABASE=asset_management
DB_USER=sa
DB_PASSWORD=your_password
DB_PORT=1433

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=your_session_secret_change_this_in_production

# App Configuration
APP_URL=http://localhost:3000
UPLOAD_PATH=public/uploads
```

### 4. 初始化資料庫
執行 SQL 腳本初始化資料庫：
```bash
# 使用 SQL Server Management Studio 或其他工具執行
# config/init-db.sql
```

或使用命令列工具：
```bash
sqlcmd -S localhost -U sa -P your_password -i config/init-db.sql
```

### 5. 啟動伺服器
開發模式：
```bash
npm run dev
```

生產模式：
```bash
npm start
```

### 6. 存取系統
開啟瀏覽器，訪問：http://localhost:3000

預設管理員帳號：
- 使用者名稱：admin
- 密碼：admin123

## 專案結構

```
entrace/
├── config/                 # 設定檔案
│   ├── database.js        # 資料庫連線設定
│   └── init-db.sql       # 資料庫初始化腳本
├── controllers/           # 控制器
│   ├── authController.js  # 認證控制器
│   └── assetController.js # 資產控制器
├── middleware/            # 中介軟體
│   └── auth.js           # 認證中介軟體
├── models/                # 資料模型
│   ├── User.js           # 使用者模型
│   ├── Asset.js          # 資產模型
│   └── Department.js     # 部門模型
├── routes/                # 路由
│   ├── index.js          # 主路由
│   ├── auth.js           # 認證路由
│   ├── assets.js         # 資產路由
│   ├── departments.js    # 部門路由
│   └── api.js            # API 路由
├── public/                # 靜態檔案
│   ├── css/              # 樣式表
│   │   └── style.css     # 主要樣式
│   └── uploads/          # 上傳檔案 (QR Code 圖片)
├── views/                 # 視圖模板
│   ├── layouts/          # 佈局檔案
│   │   └── main.ejs      # 主要佈局
│   ├── auth/             # 認證相關視圖
│   │   └── login.ejs     # 登入頁面
│   ├── index.ejs         # 首頁
│   └── error.ejs         # 錯誤頁面
├── server.js             # 主伺服器檔案
├── package.json          # 專案設定
├── .env                  # 環境變數
└── README.md            # 說明文件
```

## API 文件

### 認證 API
- `POST /auth/login` - 使用者登入
- `GET /auth/logout` - 使用者登出
- `GET /auth/profile` - 取得個人資料
- `POST /auth/profile` - 更新個人資料

### 資產 API
- `GET /api/assets` - 取得資產列表
- `GET /api/assets/:id` - 取得單一資產
- `GET /api/categories` - 取得資產類別
- `GET /api/stats` - 取得統計資料
- `GET /api/search` - 搜尋資產
- `GET /api/qr/:id` - 取得 QR Code 資訊

### 部門 API
- `GET /api/departments` - 取得部門列表

### 管理 API (僅管理員)
- `GET /api/users` - 取得使用者列表
- `GET /api/export/assets` - 匯出資產資料 (CSV)

## 資料庫設計

### 使用者表 (users)
- id (主鍵)
- username (使用者名稱)
- password (密碼，已雜湊)
- role (角色：admin/dept_manager)
- department_id (部門 ID，外鍵)
- created_at (建立時間)

### 部門表 (departments)
- id (主鍵)
- name (部門名稱)
- created_at (建立時間)

### 資產表 (assets)
- id (主鍵)
- name (資產名稱)
- category (類別)
- department_id (部門 ID，外鍵)
- status (狀態：active/inactive/maintenance/retired)
- qr_code_url (QR Code 圖片 URL)
- created_at (建立時間)
- updated_at (更新時間)

## 權限控制

### 管理員 (admin)
- 可以管理所有資產
- 可以管理所有部門
- 可以管理所有使用者
- 可以存取所有統計資料

### 部門管理員 (dept_manager)
- 只能管理自己部門的資產
- 只能檢視自己部門的資料
- 不能管理部門和使用者

## 開發指南

### 新增功能
1. 在 `models/` 建立資料模型
2. 在 `controllers/` 建立控制器
3. 在 `routes/` 建立路由
4. 在 `views/` 建立視圖模板

### 資料庫遷移
1. 修改 `config/init-db.sql`
2. 重新執行資料庫初始化腳本

### 測試
```bash
# 開發模式 (自動重啟)
npm run dev

# 生產模式
npm start
```

## 故障排除

### 常見問題

1. **資料庫連線失敗**
   - 檢查 MSSQL 服務是否運行
   - 確認 `.env` 中的資料庫設定正確
   - 檢查防火牆設定

2. **無法登入**
   - 確認使用者名稱和密碼正確
   - 檢查資料庫中是否有預設管理員帳號
   - 查看伺服器日誌錯誤訊息

3. **QR Code 無法生成**
   - 確認 `public/uploads/` 目錄存在且有寫入權限
   - 檢查 `qrcode` 套件是否正確安裝

4. **權限問題**
   - 確認使用者角色設定正確
   - 檢查中介軟體權限設定

### 日誌查看
伺服器錯誤日誌會顯示在控制台，開發時請注意錯誤訊息。

## 部署指南

### 生產環境設定
1. 修改 `.env` 中的 `NODE_ENV=production`
2. 設定安全的密碼和密鑰
3. 配置 HTTPS
4. 設定反向代理 (如 Nginx)
5. 使用 PM2 管理程序

### 安全性建議
1. 定期變更密碼和密鑰
2. 啟用 HTTPS
3. 限制存取 IP
4. 定期備份資料庫
5. 更新依賴套件

## 貢獻指南

1. Fork 專案
2. 建立功能分支
3. 提交變更
4. 發起 Pull Request

## 授權

MIT License

## 聯絡資訊

如有問題或建議，請聯繫系統管理員。

---

**版本：1.0.0**
**最後更新：2024年**