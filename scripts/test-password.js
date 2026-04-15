const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'db0915';
  const storedHash = '$2b$10$zy718eaNRhL.DvorxGOkuuyrOMhIx/51P1GPepCXLt1HDLR2rcLrS';
  
  console.log('測試密碼驗證...');
  console.log('密碼:', password);
  console.log('儲存的雜湊:', storedHash);
  
  try {
    const isMatch = await bcrypt.compare(password, storedHash);
    console.log('密碼匹配結果:', isMatch);
    
    if (!isMatch) {
      console.log('\n密碼不匹配！需要重新生成正確的雜湊值...');
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(password, salt);
      console.log('新的雜湊值:', newHash);
      
      // 更新資料庫中的密碼雜湊
      console.log('\n請使用以下 SQL 更新資料庫中的密碼：');
      console.log(`UPDATE users SET password = '${newHash}' WHERE username = 'admin';`);
    }
  } catch (error) {
    console.error('錯誤:', error.message);
  }
}

testPassword();
