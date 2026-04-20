const { query, execute } = require('../config/database');
const QRCode = require('qrcode');

class Asset {
  // 建立資產
  static async create(data) {
    const { name, category, departmentId, status = 'active' } = data;
    
    const sql = `
      INSERT INTO assets (name, category, department_id, status) 
      VALUES (@name, @category, @departmentId, @status);
      SELECT SCOPE_IDENTITY() as id;
    `;
    
    const params = {
      name,
      category,
      departmentId,
      status
    };
    
    const result = await query(sql, params);
    const assetId = result[0].id;
    
    // 生成 QR Code
    const qrCodeUrl = await this.generateQRCode(assetId);
    
    // 更新 QR Code URL
    await this.updateQRCode(assetId, qrCodeUrl);
    
    return { id: assetId, qrCodeUrl };
  }

  // 生成 QR Code
  static async generateQRCode(assetId) {
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const qrCodeUrl = `${appUrl}/assets/${assetId}/view`;
      
      // 生成 QR Code 圖片並儲存
      const fileName = `qr_${assetId}_${Date.now()}.png`;
      const filePath = `public/uploads/${fileName}`;
      
      await QRCode.toFile(filePath, qrCodeUrl, {
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300,
        margin: 1
      });
      
      return `/uploads/${fileName}`;
    } catch (error) {
      console.error('QR Code generation error:', error);
      return null;
    }
  }

  // 更新 QR Code URL
  static async updateQRCode(assetId, qrCodeUrl) {
    const sql = 'UPDATE assets SET qr_code_url = @qrCodeUrl WHERE id = @assetId';
    return await execute(sql, { assetId, qrCodeUrl });
  }

  // 根據 ID 尋找資產
  static async findById(id) {
    const sql = `
      SELECT a.*, d.name as department_name 
      FROM assets a 
      LEFT JOIN departments d ON a.department_id = d.id 
      WHERE a.id = @id
    `;
    const assets = await query(sql, { id });
    return assets[0] || null;
  }

  // 取得所有資產（可篩選）
  static async findAll(filters = {}) {
    let sql = `
      SELECT a.*, d.name as department_name 
      FROM assets a 
      LEFT JOIN departments d ON a.department_id = d.id 
      WHERE 1=1
    `;
    
    const params = {};
    
    // 部門篩選
    if (filters.departmentId) {
      sql += ' AND a.department_id = @departmentId';
      params.departmentId = filters.departmentId;
    }
    
    // 類別篩選
    if (filters.category) {
      sql += ' AND a.category = @category';
      params.category = filters.category;
    }
    
    // 狀態篩選
    if (filters.status) {
      sql += ' AND a.status = @status';
      params.status = filters.status;
    }
    
    // 搜尋關鍵字
    if (filters.search) {
      sql += ' AND (a.name LIKE @search OR a.category LIKE @search)';
      params.search = `%${filters.search}%`;
    }
    
    sql += ' ORDER BY a.created_at DESC';
    
    // 分頁
    if (filters.limit) {
      sql += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      params.offset = filters.offset || 0;
      params.limit = filters.limit;
    }
    
    return await query(sql, params);
  }

  // 計算資產總數（用於分頁）
  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM assets WHERE 1=1';
    const params = {};
    
    if (filters.departmentId) {
      sql += ' AND department_id = @departmentId';
      params.departmentId = filters.departmentId;
    }
    
    if (filters.category) {
      sql += ' AND category = @category';
      params.category = filters.category;
    }
    
    if (filters.status) {
      sql += ' AND status = @status';
      params.status = filters.status;
    }
    
    if (filters.search) {
      sql += ' AND (name LIKE @search OR category LIKE @search)';
      params.search = `%${filters.search}%`;
    }
    
    const result = await query(sql, params);
    return result[0].total;
  }

  // 更新資產
  static async update(id, data) {
    const { name, category, departmentId, status } = data;
    
    const sql = `
      UPDATE assets 
      SET name = @name, category = @category, 
          department_id = @departmentId, status = @status 
      WHERE id = @id
    `;
    
    const params = {
      id,
      name,
      category,
      departmentId,
      status
    };
    
    return await execute(sql, params);
  }

  // 刪除資產
  static async delete(id) {
    const sql = 'DELETE FROM assets WHERE id = @id';
    return await execute(sql, { id });
  }

  // 取得所有類別
  static async getCategories() {
    const sql = 'SELECT DISTINCT category FROM assets ORDER BY category';
    return await query(sql);
  }

  // 取得部門資產統計
  static async getDepartmentStats(departmentId = null) {
    let sql = `
      SELECT 
        d.id as department_id,
        d.name as department_name,
        COUNT(a.id) as total_assets,
        SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as active_assets,
        SUM(CASE WHEN a.status = 'inactive' THEN 1 ELSE 0 END) as inactive_assets,
        SUM(CASE WHEN a.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_assets
      FROM departments d
      LEFT JOIN assets a ON d.id = a.department_id
      WHERE 1=1
    `;
    
    const params = {};
    
    if (departmentId) {
      sql += ' AND d.id = @departmentId';
      params.departmentId = departmentId;
    }
    
    sql += ' GROUP BY d.id, d.name ORDER BY d.name';
    
    return await query(sql, params);
  }

  // 取得類別統計
  static async getCategoryStats(departmentId = null) {
    let sql = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
      FROM assets
      WHERE 1=1
    `;
    
    const params = {};
    
    if (departmentId) {
      sql += ' AND department_id = @departmentId';
      params.departmentId = departmentId;
    }
    
    sql += ' GROUP BY category ORDER BY count DESC';
    
    return await query(sql, params);
  }

  // 檢查資產是否屬於部門
  static async belongsToDepartment(assetId, departmentId) {
    const sql = 'SELECT COUNT(*) as count FROM assets WHERE id = @assetId AND department_id = @departmentId';
    const result = await query(sql, { assetId, departmentId });
    return result[0].count > 0;
  }

  // 取得最近新增的資產
  static async getRecentAssets(limit = 10, departmentId = null) {
    let sql = `
      SELECT TOP ${limit} a.*, d.name as department_name 
      FROM assets a 
      LEFT JOIN departments d ON a.department_id = d.id 
      WHERE 1=1
    `;
    
    const params = {};
    
    if (departmentId) {
      sql += ' AND a.department_id = @departmentId';
      params.departmentId = departmentId;
    }
    
    sql += ' ORDER BY a.created_at DESC';
    
    return await query(sql, params);
  }
}

module.exports = Asset;
