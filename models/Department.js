const { query, execute } = require('../config/database');

class Department {
  // 建立部門
  static async create(name) {
    const sql = 'INSERT INTO departments (name) VALUES (@name)';
    return await execute(sql, { name });
  }

  // 取得所有部門
  static async findAll() {
    const sql = 'SELECT * FROM departments ORDER BY name';
    return await query(sql);
  }

  // 根據 ID 尋找部門
  static async findById(id) {
    const sql = 'SELECT * FROM departments WHERE id = @id';
    const departments = await query(sql, { id });
    return departments[0] || null;
  }

  // 更新部門
  static async update(id, name) {
    const sql = 'UPDATE departments SET name = @name WHERE id = @id';
    return await execute(sql, { id, name });
  }

  // 刪除部門
  static async delete(id) {
    const sql = 'DELETE FROM departments WHERE id = @id';
    return await execute(sql, { id });
  }

  // 檢查部門名稱是否已存在
  static async nameExists(name, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM departments WHERE name = @name';
    const params = { name };
    
    if (excludeId) {
      sql += ' AND id != @excludeId';
      params.excludeId = excludeId;
    }
    
    const result = await query(sql, params);
    return result[0].count > 0;
  }

  // 取得部門及其資產統計
  static async getWithStats(departmentId = null) {
    let sql = `
      SELECT 
        d.*,
        COUNT(a.id) as asset_count,
        SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as active_assets
      FROM departments d
      LEFT JOIN assets a ON d.id = a.department_id
      WHERE 1=1
    `;
    
    const params = {};
    
    if (departmentId) {
      sql += ' AND d.id = @departmentId';
      params.departmentId = departmentId;
    }
    
    sql += ' GROUP BY d.id, d.name, d.created_at ORDER BY d.name';
    
    return await query(sql, params);
  }

  // 取得部門的資產
  static async getAssets(departmentId, filters = {}) {
    let sql = `
      SELECT a.* 
      FROM assets a 
      WHERE a.department_id = @departmentId
    `;
    
    const params = { departmentId };
    
    if (filters.category) {
      sql += ' AND a.category = @category';
      params.category = filters.category;
    }
    
    if (filters.status) {
      sql += ' AND a.status = @status';
      params.status = filters.status;
    }
    
    sql += ' ORDER BY a.created_at DESC';
    
    return await query(sql, params);
  }

  // 取得部門的管理員
  static async getManagers(departmentId) {
    const sql = `
      SELECT u.* 
      FROM users u 
      WHERE u.department_id = @departmentId AND u.role = 'dept_manager'
      ORDER BY u.username
    `;
    return await query(sql, { departmentId });
  }

  // 搜尋部門
  static async search(searchTerm) {
    const sql = 'SELECT * FROM departments WHERE name LIKE @search ORDER BY name';
    return await query(sql, { search: `%${searchTerm}%` });
  }

  // 取得部門數量
  static async count() {
    const sql = 'SELECT COUNT(*) as total FROM departments';
    const result = await query(sql);
    return result[0].total;
  }

  // 取得最近建立的部門
  static async getRecent(limit = 5) {
    const sql = `SELECT TOP ${limit} * FROM departments ORDER BY created_at DESC`;
    return await query(sql);
  }
}

module.exports = Department;
