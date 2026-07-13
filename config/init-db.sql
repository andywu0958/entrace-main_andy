-- 使用現有的 pm 資料庫
USE pm;
GO

PRINT 'Using existing database: pm';

-- 建立部門資料表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='assets_departments' AND xtype='U')
BEGIN
    CREATE TABLE assets_departments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table assets_departments created.';
    
    -- 插入預設部門
    INSERT INTO assets_departments (name) VALUES 
    ('資訊部'),
    ('人事部'),
    ('財務部'),
    ('業務部'),
    ('總務部');
    PRINT 'Default departments inserted.';
END
GO

-- 建立使用者資料表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dept_manager')),
        department_id INT,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (department_id) REFERENCES assets_departments(id) ON DELETE SET NULL
    );
    PRINT 'Table users created.';
    
    -- 插入預設管理員 (密碼: admin123)
    INSERT INTO users (username, password, role, department_id) VALUES 
    ('admin', '$2b$10$zy718eaNRhL.DvorxGOkuuyrOMhIx/51P1GPepCXLt1HDLR2rcLrS', 'admin', NULL);
    PRINT 'Default admin user inserted.';
END
GO

-- 建立資產資料表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='assets' AND xtype='U')
BEGIN
    CREATE TABLE assets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        model NVARCHAR(200),
        category NVARCHAR(100) NOT NULL,
        department_id INT NOT NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
        qr_code_url NVARCHAR(500),
        serialno NVARCHAR(100),
        purchased_at DATETIME,
        remark NVARCHAR(500),
        -- 14個新欄位
        supplier NVARCHAR(200),
        quantity INT,
        unit NVARCHAR(50),
        cost DECIMAL(18,2),
        warranty INT,
        dep_meth NVARCHAR(50),
        useful_mo INT,
        residual DECIMAL(18,2),
        dep_start nvarchar(6),
        unamortized_mo INT,
        avg_dep DECIMAL(18,2),
        accumulated DECIMAL(18,2),
        custodian NVARCHAR(100),
        location NVARCHAR(200),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (department_id) REFERENCES assets_departments(id) ON DELETE CASCADE
    );
    PRINT 'Table assets created.';
    
    -- 建立索引以提升查詢效能
    CREATE INDEX idx_assets_department ON assets(department_id);
    CREATE INDEX idx_assets_category ON assets(category);
    CREATE INDEX idx_assets_status ON assets(status);
    PRINT 'Indexes created for assets table.';
END
GO

-- 如果 assets 表已存在但缺少 model 列，則添加
IF EXISTS (SELECT * FROM sysobjects WHERE name='assets' AND xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('assets') AND name = 'model')
    BEGIN
        ALTER TABLE assets ADD model NVARCHAR(200);
        PRINT 'Column model added to assets table.';
    END
END
GO

-- 如果 assets 表已存在但缺少 serialno 列，則添加
IF EXISTS (SELECT * FROM sysobjects WHERE name='assets' AND xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('assets') AND name = 'serialno')
    BEGIN
        ALTER TABLE assets ADD serialno NVARCHAR(100);
        PRINT 'Column serialno added to assets table.';
    END
END
GO

-- 如果 assets 表已存在但缺少 purchased_at 列，則添加
IF EXISTS (SELECT * FROM sysobjects WHERE name='assets' AND xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('assets') AND name = 'purchased_at')
    BEGIN
        ALTER TABLE assets ADD purchased_at DATETIME;
        PRINT 'Column purchased_at added to assets table.';
    END
END
GO

-- 如果 assets 表已存在但缺少 remark 列，則添加
IF EXISTS (SELECT * FROM sysobjects WHERE name='assets' AND xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('assets') AND name = 'remark')
    BEGIN
        ALTER TABLE assets ADD remark NVARCHAR(500);
        PRINT 'Column remark added to assets table.';
    END
END
GO

-- 建立更新時間的觸發器
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_update_assets_updated_at')
BEGIN
    EXEC('
    CREATE TRIGGER trg_update_assets_updated_at
    ON assets
    AFTER UPDATE
    AS
    BEGIN
        UPDATE assets
        SET updated_at = GETDATE()
        FROM inserted
        WHERE assets.id = inserted.id
    END
    ');
    PRINT 'Trigger for updating assets.updated_at created.';
END
GO

-- 建立資產類別檢視表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='vw_asset_categories' AND xtype='V')
BEGIN
    EXEC('
    CREATE VIEW vw_asset_categories AS
    SELECT DISTINCT category
    FROM assets
    ');
    PRINT 'View vw_asset_categories created.';
END
GO

-- 建立資產詳細資訊檢視表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='vw_asset_details' AND xtype='V')
BEGIN
    EXEC('
    CREATE VIEW vw_asset_details AS
    SELECT 
        a.id,
        a.name,
        a.model,
        a.category,
        a.department_id,
        d.name AS department_name,
        a.status,
        a.qr_code_url,
        a.serialno,
        a.purchased_at,
        a.remark,
        a.created_at,
        a.updated_at
    FROM assets a
    LEFT JOIN assets_departments d ON a.department_id = d.id
    ');
    PRINT 'View vw_asset_details created.';
END
GO

-- 如果視圖已存在，則更新以包含所有新欄位
IF EXISTS (SELECT * FROM sysobjects WHERE name='vw_asset_details' AND xtype='V')
BEGIN
    EXEC('
    ALTER VIEW vw_asset_details AS
    SELECT 
        a.id,
        a.name,
        a.model,
        a.category,
        a.department_id,
        d.name AS department_name,
        a.status,
        a.qr_code_url,
        a.serialno,
        a.purchased_at,
        a.remark,
        a.supplier,
        a.quantity,
        a.unit,
        a.cost,
        a.warranty,
        a.dep_meth,
        a.useful_mo,
        a.residual,
        a.dep_start,
        a.unamortized_mo,
        a.avg_dep,
        a.accumulated,
        a.custodian,
        a.location,
        a.created_at,
        a.updated_at
    FROM assets a
    LEFT JOIN assets_departments d ON a.department_id = d.id
    ');
    PRINT 'View vw_asset_details updated to include all new financial columns.';
END
GO

-- ============================================
-- 資產折舊歷史記錄表 (assets_history)
-- 用於儲存每個月各資產的折舊快照資料
-- 不影響現有 assets 表的運算
-- ============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='assets_history' AND xtype='U')
BEGIN
    CREATE TABLE assets_history (
        id INT IDENTITY(1,1) PRIMARY KEY,
        asset_id INT NOT NULL,
        record_date DATE NOT NULL,                   -- 記錄日期（每月1日）
        
        -- === 開帳欄位 ===
        unamortized_mo INT,                          -- 未攤月數
        avg_dep DECIMAL(18,2),                       -- 平均法月折舊額
        accumulated DECIMAL(18,2),                   -- 累積折舊
        dep_rate DECIMAL(10,6),                      -- 定率年折舊率（%）
        annual_dep DECIMAL(18,2),                    -- 定率年折舊額
        decl_accumulated DECIMAL(18,2),              -- 定率累積折舊
        
        -- === 快照資訊（記錄當下資產狀態）===
        cost DECIMAL(18,2),                          -- 當時成本
        quantity INT,
        residual DECIMAL(18,2),                      -- 當時殘值
        useful_mo INT,                               -- 當時耐用月數
        dep_meth NVARCHAR(50),                       -- 當時折舊方法
        dep_start NVARCHAR(7),                       -- 當時提列年月
        
        -- === 系統欄位 ===
        created_at DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_assets_history_asset 
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        CONSTRAINT UQ_assets_record_date 
            UNIQUE (asset_id, record_date)
    );

    -- 建立索引以提升查詢效能
    CREATE INDEX idx_assets_history_asset_id ON assets_history(asset_id);
    CREATE INDEX idx_assets_history_record_date ON assets_history(record_date);
    CREATE INDEX idx_assets_history_asset_date ON assets_history(asset_id, record_date);

    PRINT '資料表 assets_history 建立成功';
END
ELSE
BEGIN
    PRINT '資料表 assets_history 已存在，跳過建立';
END
GO

PRINT 'Database initialization completed successfully!';
