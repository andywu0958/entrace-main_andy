const bcrypt = require('bcryptjs');
const { query, execute } = require('./config/database');
require('dotenv').config();

async function main() {
  const username = 'andywu0958';
  const plainPassword = 'dddbar888'; // 从数据库获取的密码
  const saltRounds = 10;

  console.log(`正在为用户 ${username} 生成 bcrypt 哈希...`);
  console.log(`明文密码: ${plainPassword}`);

  // 生成哈希
  const hash = await bcrypt.hash(plainPassword, saltRounds);
  console.log(`生成的哈希: ${hash}`);

  // 验证哈希
  const isValid = await bcrypt.compare(plainPassword, hash);
  console.log(`哈希验证: ${isValid ? '成功' : '失败'}`);

  // 更新数据库
  try {
    const updateSql = `UPDATE users SET password = @password WHERE username = @username`;
    const result = await execute(updateSql, { password: hash, username });
    console.log(`数据库更新成功！影响行数: ${result}`);
  } catch (error) {
    console.error('更新数据库时出错:', error.message);
    process.exit(1);
  }

  // 验证更新
  const verifySql = `SELECT username, password FROM users WHERE username = @username`;
  const users = await query(verifySql, { username });
  if (users.length > 0) {
    console.log('更新后的用户记录:');
    console.log(`用户名: ${users[0].username}`);
    console.log(`密码哈希: ${users[0].password}`);
    console.log(`哈希长度: ${users[0].password.length}`);
  } else {
    console.log('未找到用户');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
