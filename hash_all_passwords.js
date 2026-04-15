const bcrypt = require('bcryptjs');
const { query, execute } = require('./config/database');
require('dotenv').config();

const saltRounds = 10;

async function hashPassword(plain) {
  return await bcrypt.hash(plain, saltRounds);
}

async function main() {
  console.log('开始批量哈希用户密码...');
  // 获取所有用户
  const users = await query("SELECT id, username, password FROM users");
  console.log(`总用户数: ${users.length}`);

  let updated = 0;
  let skipped = 0;
  let errors = [];

  for (const user of users) {
    const { id, username, password } = user;
    // 检查是否已经是bcrypt哈希
    if (password && password.startsWith('$2b$') && password.length === 60) {
      console.log(`用户 ${username} 已哈希，跳过`);
      skipped++;
      continue;
    }

    // 如果密码为空或null，跳过（或设置为默认？但不应发生）
    if (!password) {
      console.log(`用户 ${username} 密码为空，跳过`);
      skipped++;
      continue;
    }

    try {
      const hash = await hashPassword(password);
      const updateSql = `UPDATE users SET password = @hash WHERE id = @id`;
      await execute(updateSql, { hash, id });
      console.log(`已更新用户 ${username}`);
      updated++;
    } catch (error) {
      console.error(`更新用户 ${username} 时出错:`, error.message);
      errors.push({ username, error: error.message });
    }
  }

  console.log('\n批量更新完成');
  console.log(`已更新: ${updated}`);
  console.log(`已跳过: ${skipped}`);
  if (errors.length > 0) {
    console.log(`错误数: ${errors.length}`);
    errors.forEach(e => console.log(`  ${e.username}: ${e.error}`));
  }

  // 验证
  console.log('\n验证更新...');
  const afterUsers = await query("SELECT username, password FROM users");
  let hashCount = 0;
  let plainCount = 0;
  afterUsers.forEach(u => {
    if (u.password && u.password.startsWith('$2b$') && u.password.length === 60) {
      hashCount++;
    } else {
      plainCount++;
    }
  });
  console.log(`哈希密码用户数: ${hashCount}`);
  console.log(`明文密码用户数: ${plainCount}`);

  process.exit(0);
}

main().catch(err => {
  console.error('批量哈希失败:', err);
  process.exit(1);
});
