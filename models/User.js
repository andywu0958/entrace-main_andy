const bcrypt = require('bcryptjs');
const { query, execute } = require('../config/database');

class User {
  // 建立使用者
  static async create(username, password, role, departmentId = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users (username, password, role, department_id) 
      VALUES (@username, @password, @role, @departmentId)
    `;
    
    const params = {
      username,
      password: hashedPassword,
      role,
      departmentId: departmentId || null
    };
    
    const result = await execute(sql, params);
    return result;
  }

  // 根據使用者名稱尋找使用者
  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = @username';
    const users = await query(sql, { username });
    return users[0] || null;
  }

  // 根據 ID 尋找使用者
  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = @id';
    const users = await query(sql, { id });
    return users[0] || null;
  }

  // 驗證密碼
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // 取得所有使用者
  static async findAll() {
    const sql = `
      SELECT u.*, d.name as department_name 
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id 
      ORDER BY u.created_at DESC
    `;
    return await query(sql);
  }

  // 更新使用者
  static async update(id, data) {
    const { username, role, departmentId } = data;
    const sql = `
      UPDATE users 
      SET username = @username, role = @role, department_id = @departmentId 
      WHERE id = @id
    `;
    
    const params = {
      id,
      username,
      role,
      departmentId: departmentId || null
    };
    
    return await execute(sql, params);
  }

  // 刪除使用者
  static async delete(id) {
    const sql = 'DELETE FROM users WHERE id = @id';
    return await execute(sql, { id });
  }

  // 檢查使用者名稱是否已存在
  static async usernameExists(username, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM users WHERE username = @username';
    const params = { username };
    
    if (excludeId) {
      sql += ' AND id != @excludeId';
      params.excludeId = excludeId;
    }
    
    const result = await query(sql, params);
    return result[0].count > 0;
  }

  // 取得部門管理員
  static async getDepartmentManagers(departmentId) {
    const sql = `
      SELECT * FROM users 
      WHERE role = 'dept_manager' AND department_id = @departmentId
    `;
    return await query(sql, { departmentId });
  }

  // 更新密碼
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE users SET password = @password WHERE id = @id';
    return await execute(sql, { id, password: hashedPassword });
  }
}

module.exports = User;