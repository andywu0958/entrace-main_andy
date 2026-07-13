const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// 模擬資料庫函數（用於測試）
const mockData = {
  users: [
    {
      id: 1,
      username: 'admin',
      password: '$2b$10$zy718eaNRhL.DvorxGOkuuyrOMhIx/51P1GPepCXLt1HDLR2rcLrS',
      role: 'admin',
      department_id: null,
      created_at: new Date()
    }
  ],
  departments: [
    { id: 1, name: '資訊部', created_at: new Date() },
    { id: 2, name: '人事部', created_at: new Date() },
    { id: 3, name: '財務部', created_at: new Date() },
    { id: 4, name: '業務部', created_at: new Date() },
    { id: 5, name: '總務部', created_at: new Date() }
  ],
  assets: [
    {
      id: 1,
      name: '筆記型電腦 Dell XPS 15',
      category: '電子設備',
      department_id: 1,
      status: 'active',
      qr_code_url: '/uploads/qr_1_123456789.png',
      created_at: new Date(),
      updated_at: new Date(),
      department_name: '資訊部'
    },
    {
      id: 2,
      name: '投影機 Epson EB-U05',
      category: '會議設備',
      department_id: 3,
      status: 'active',
      qr_code_url: '/uploads/qr_2_123456789.png',
      created_at: new Date(),
      updated_at: new Date(),
      department_name: '財務部'
    }
  ]
};

// 檢查是否使用模擬資料庫
let useMockDatabase = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

let poolPromise;
let query;
let execute;

// 模擬查詢輔助函數（供兩個分支使用）
function mockQuery(text, params) {
  if (text.includes('FROM users')) {
    if (text.includes('WHERE username')) {
      const username = params?.username;
      return mockData.users.filter(user => user.username === username);
    }
    if (text.includes('WHERE id')) {
      const id = params?.id;
      return mockData.users.filter(user => user.id === id);
    }
    // 處理 LEFT JOIN 查詢，加入 department_name
    if (text.includes('LEFT JOIN')) {
      return mockData.users.map(user => {
        const dept = mockData.departments.find(d => d.id === user.department_id);
        return { ...user, department_name: dept ? dept.name : null };
      });
    }
    return mockData.users;
  }
  
  if (text.includes('FROM assets_departments')) {
    if (text.includes('WHERE id')) {
      const id = params?.id;
      return mockData.departments.filter(dept => dept.id === id);
    }
    return mockData.departments;
  }
  
  if (text.includes('FROM assets')) {
    if (text.includes('WHERE id')) {
      const id = params?.id;
      return mockData.assets.filter(asset => asset.id === id);
    }
    // 處理 LEFT JOIN 查詢，加入 department_name
    if (text.includes('LEFT JOIN')) {
      return mockData.assets.map(asset => {
        const dept = mockData.departments.find(d => d.id === asset.department_id);
        return { ...asset, department_name: dept ? dept.name : null };
      });
    }
    return mockData.assets;
  }
  
  if (text.includes('COUNT(*)')) {
    return [{ count: mockData.assets.length }];
  }
  
  return [];
}

if (useMockDatabase) {
  console.log('Using mock database for testing');
  
  // 模擬查詢函數
  query = async (text, params) => {
    console.log('Mock Query:', text.substring(0, 100) + '...');
    return mockQuery(text, params);
  };
  
  // 模擬執行函數
  execute = async (text, params) => {
    console.log('Mock Execute:', text.substring(0, 100) + '...');
    return 1; // 模擬成功影響1列
  };
  
  poolPromise = Promise.resolve({ request: () => ({ input: () => {}, query }) });
} else {
  // 建立真實的 MSSQL 連線池
  poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
      console.log('Connected to MSSQL database');
      return pool;
    })
    .catch(err => {
      console.error('Database Connection Failed:', err);
      console.log('Falling back to mock database for development');
      
      // 回退到模擬資料庫
      process.env.USE_MOCK_DB = 'true';
      useMockDatabase = true;
      
      return null; // 返回 null 表示連線失敗
    });

  // 真實的查詢函數
  query = async (text, params) => {
    try {
      const pool = await poolPromise;
      
      // 如果連線失敗（pool 為 null），使用模擬資料庫
      if (!pool) {
        console.log('Mock Query (fallback):', text.substring(0, 100) + '...');
        return mockQuery(text, params);
      }
      
      const request = pool.request();
      
      if (params) {
        Object.keys(params).forEach(key => {
          request.input(key, params[key]);
        });
      }
      
      const result = await request.query(text);
      return result.recordset;
    } catch (err) {
      console.error('Query Error:', err);
      throw err;
    }
  };

  // 真實的執行函數
  execute = async (text, params) => {
    try {
      const pool = await poolPromise;
      
      // 如果連線失敗（pool 為 null），使用模擬資料庫
      if (!pool) {
        console.log('Mock Execute (fallback):', text.substring(0, 100) + '...');
        return 1;
      }
      
      const request = pool.request();
      
      if (params) {
        Object.keys(params).forEach(key => {
          request.input(key, params[key]);
        });
      }
      
      const result = await request.query(text);
      return result.rowsAffected[0];
    } catch (err) {
      console.error('Execute Error:', err);
      throw err;
    }
  };
  
}

module.exports = {
  sql,
  poolPromise,
  query,
  execute,
  dbConfig,
  useMockDatabase
};
