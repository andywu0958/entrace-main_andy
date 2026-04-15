const { query } = require('./config/database');

async function main() {
  try {
    const sql = 'SELECT * FROM users WHERE username = @username';
    const users = await query(sql, { username: 'admin' });
    console.log('用户记录:', JSON.stringify(users, null, 2));
    if (users[0]) {
      console.log('密码哈希:', users[0].password);
      console.log('密码长度:', users[0].password.length);
    }
  } catch (error) {
    console.error('错误:', error);
  }
}

main();
