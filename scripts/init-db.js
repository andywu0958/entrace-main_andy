const fs = require('fs');
const path = require('path');
const { query, execute } = require('../config/database');

async function initDatabase() {
  try {
    console.log('開始初始化資料庫...');
    
    // 讀取 SQL 檔案
    const sqlFilePath = path.join(__dirname, '../config/init-db.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 分割 SQL 語句（以 GO 分隔）
    const sqlStatements = sqlContent.split('GO').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
    
    console.log(`找到 ${sqlStatements.length} 個 SQL 語句`);
    
    // 執行每個 SQL 語句
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      console.log(`執行語句 ${i + 1}/${sqlStatements.length}...`);
      
      try {
        // 如果是 SELECT 查詢，使用 query
        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.includes('PRINT')) {
          const result = await query(sql);
          if (result && result.length > 0) {
            console.log(`查詢結果: ${JSON.stringify(result)}`);
          }
        } else {
          // 其他語句使用 execute
          const result = await execute(sql);
          console.log(`執行成功，影響 ${result} 列`);
        }
      } catch (error) {
        console.error(`執行語句 ${i + 1} 時發生錯誤:`, error.message);
        // 繼續執行其他語句
      }
    }
    
    console.log('資料庫初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('初始化資料庫時發生錯誤:', error);
    process.exit(1);
  }
}

// 執行初始化
initDatabase();