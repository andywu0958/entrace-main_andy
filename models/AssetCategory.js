const { query, execute } = require('../config/database');

class AssetCategory {
  // 取得所有類別
  static async getAll() {
    const sql = 'SELECT * FROM [pm].[dbo].[asset_category] ORDER BY code';
    return await query(sql);
  }

  // 根據 code 取得類別
  static async getById(code) {
    const sql = 'SELECT * FROM [pm].[dbo].[asset_category] WHERE code = @code';
    const categories = await query(sql, { code });
    return categories[0] || null;
  }

  // 搜尋類別
  static async search(params) {
    // 支援字串參數（向後兼容）
    if (typeof params === 'string') {
      const sql = `SELECT * FROM [pm].[dbo].[asset_category] 
                   WHERE name LIKE @keyword OR code LIKE @keyword OR remark LIKE @keyword 
                   ORDER BY code`;
      return await query(sql, { keyword: `%${params}%` });
    }

    // 支援物件參數（多欄位搜尋）
    const conditions = [];
    const queryParams = {};

    if (params.code) {
      conditions.push('code LIKE @code');
      queryParams.code = `%${params.code}%`;
    }
    if (params.name) {
      conditions.push('name LIKE @name');
      queryParams.name = `%${params.name}%`;
    }
    if (params.acct_code) {
      conditions.push('(acct_code LIKE @acct_code OR ad_code LIKE @acct_code2 OR dep_code LIKE @acct_code3)');
      queryParams.acct_code = `%${params.acct_code}%`;
      queryParams.acct_code2 = `%${params.acct_code}%`;
      queryParams.acct_code3 = `%${params.acct_code}%`;
    }

    if (conditions.length === 0) {
      return [];
    }

    const sql = `SELECT * FROM [pm].[dbo].[asset_category] 
                 WHERE ${conditions.join(' AND ')} 
                 ORDER BY code`;
    return await query(sql, queryParams);
  }

  // 新增類別
  static async create(data) {
    const sql = `INSERT INTO [pm].[dbo].[asset_category] 
                 (code, name, acct_code, acct_name, ad_code, ad_name, dep_code, dep_name, dep_meth, useful_mo, remark, created_date, updated_date) 
                 VALUES (@code, @name, @acct_code, @acct_name, @ad_code, @ad_name, @dep_code, @dep_name, @dep_meth, @useful_mo, @remark, GETDATE(), GETDATE())`;
    return await execute(sql, {
      code: data.code,
      name: data.name,
      acct_code: data.acct_code,
      acct_name: data.acct_name,
      ad_code: data.ad_code,
      ad_name: data.ad_name,
      dep_code: data.dep_code,
      dep_name: data.dep_name,
      dep_meth: data.dep_meth,
      useful_mo: data.useful_mo,
      remark: data.remark || null
    });
  }

  // 更新類別
  static async update(code, data) {
    const sql = `UPDATE [pm].[dbo].[asset_category] 
                 SET name = @name, 
                     acct_code = @acct_code, 
                     acct_name = @acct_name, 
                     ad_code = @ad_code, 
                     ad_name = @ad_name, 
                     dep_code = @dep_code, 
                     dep_name = @dep_name, 
                     dep_meth = @dep_meth, 
                     useful_mo = @useful_mo, 
                     remark = @remark,
                     updated_date = GETDATE()
                 WHERE code = @code`;
    return await execute(sql, {
      code: code,
      name: data.name,
      acct_code: data.acct_code,
      acct_name: data.acct_name,
      ad_code: data.ad_code,
      ad_name: data.ad_name,
      dep_code: data.dep_code,
      dep_name: data.dep_name,
      dep_meth: data.dep_meth,
      useful_mo: data.useful_mo,
      remark: data.remark || null
    });
  }

  // 刪除類別
  static async delete(code) {
    const sql = 'DELETE FROM [pm].[dbo].[asset_category] WHERE code = @code';
    return await execute(sql, { code });
  }

  // 檢查類別代號是否已存在
  static async codeExists(code, excludeCode = null) {
    let sql = 'SELECT COUNT(*) as count FROM [pm].[dbo].[asset_category] WHERE code = @code';
    const params = { code };
    
    if (excludeCode) {
      sql += ' AND code != @excludeCode';
      params.excludeCode = excludeCode;
    }
    
    const result = await query(sql, params);
    return result[0].count > 0;
  }

  // 檢查類別名稱是否已存在
  static async nameExists(name, excludeCode = null) {
    let sql = 'SELECT COUNT(*) as count FROM [pm].[dbo].[asset_category] WHERE name = @name';
    const params = { name };
    
    if (excludeCode) {
      sql += ' AND code != @excludeCode';
      params.excludeCode = excludeCode;
    }
    
    const result = await query(sql, params);
    return result[0].count > 0;
  }

  // 取得該類別下的資產數量
  static async getAssetCount(code) {
    const sql = 'SELECT COUNT(*) as count FROM [pm].[dbo].[assets] WHERE category = @code';
    const result = await query(sql, { code });
    return result[0].count;
  }
}

module.exports = AssetCategory;
