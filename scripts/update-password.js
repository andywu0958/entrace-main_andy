const { execute } = require('../config/database');

async function updatePassword() {
  try {
    console.log('開始更新密碼...');
    
    const sql = `
      UPDATE users 
      SET password = '$2b$10$nvDRbpkwiN8nUcEEz3FxSOx4w0vgBa26yEYTdy4J7mrSeH5Lc7Um.'
      WHERE username = 'admin'
    `;
    
    const result = await execute(sql);
    console.log(`密碼更新成功！影響 ${result} 列`);
    
    // 驗證更新
    const verifySql = "SELECT username FROM users WHERE username = 'admin'";
    const { query } = require('../config/database');
    const users = await query(verifySql);
    console.log('驗證結果:', users.length > 0 ? '使用者存在' : '使用者不存在');
    
    process.exit(0);
  } catch (error) {
    console.error('更新密碼時發生錯誤:', error.message);
    process.exit(1);
  }
}

updatePassword();