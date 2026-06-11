const { query, execute } = require('../config/database');

class AssetHistory {
  /**
   * 建立折舊歷史記錄
   * @param {Object} data - 折舊歷史資料
   * @returns {Promise<Object>} 新增的記錄
   */
  static async create(data) {
    const {
      asset_id,
      record_date,
      unamortized_mo,
      avg_dep,
      accumulated,
      dep_rate,
      annual_dep,
      decl_accumulated,
      cost,
      quantity,
      residual,
      useful_mo,
      dep_meth,
      dep_start
    } = data;

    const sql = `
      INSERT INTO assets_history (
        asset_id, record_date,
        unamortized_mo, avg_dep, accumulated,
        dep_rate, annual_dep, decl_accumulated,
        cost, quantity, residual, useful_mo, dep_meth, dep_start
      ) VALUES (
        @asset_id, @record_date,
        @unamortized_mo, @avg_dep, @accumulated,
        @dep_rate, @annual_dep, @decl_accumulated,
        @cost, @quantity, @residual, @useful_mo, @dep_meth, @dep_start
      );
      SELECT SCOPE_IDENTITY() as id;
    `;

    const params = {
      asset_id,
      record_date,
      unamortized_mo: unamortized_mo || null,
      avg_dep: avg_dep || null,
      accumulated: accumulated || null,
      dep_rate: dep_rate || null,
      annual_dep: annual_dep || null,
      decl_accumulated: decl_accumulated || null,
      cost: cost || null,
      quantity: quantity || null,
      residual: residual || null,
      useful_mo: useful_mo || null,
      dep_meth: dep_meth || null,
      dep_start: dep_start || null
    };

    const result = await query(sql, params);
    return result[0].id;
  }

  /**
   * 根據 ID 查詢記錄
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const sql = `
      SELECT ah.*, a.name as asset_name, a.category, d.name as department_name
      FROM assets_history ah
      JOIN assets a ON ah.asset_id = a.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE ah.id = @id
    `;
    const records = await query(sql, { id });
    return records[0] || null;
  }

  /**
   * 查詢指定資產的折舊歷史記錄
   * @param {number} assetId - 資產 ID
   * @param {Object} options - 查詢選項
   * @returns {Promise<Array>}
   */
  static async findByAssetId(assetId, options = {}) {
    let sql = `
      SELECT * FROM assets_history
      WHERE asset_id = @assetId
    `;
    const params = { assetId };

    // 日期範圍篩選
    if (options.startDate) {
      sql += ' AND record_date >= @startDate';
      params.startDate = options.startDate;
    }
    if (options.endDate) {
      sql += ' AND record_date <= @endDate';
      params.endDate = options.endDate;
    }

    sql += ' ORDER BY record_date DESC';

    // 分頁
    if (options.limit) {
      sql += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      params.offset = options.offset || 0;
      params.limit = options.limit;
    }

    return await query(sql, params);
  }

  /**
   * 查詢指定日期的所有資產折舊記錄
   * @param {string} recordDate - 日期 (YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  static async findByDate(recordDate) {
    const sql = `
      SELECT ah.*, a.name as asset_name, a.category, d.name as department_name
      FROM assets_history ah
      JOIN assets a ON ah.asset_id = a.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE ah.record_date = @recordDate
      ORDER BY a.name
    `;
    return await query(sql, { recordDate });
  }

  /**
   * 查詢指定日期範圍內的所有記錄（用於報表）
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  static async findByDateRange(options = {}) {
    let sql = `
      SELECT ah.*, a.name as asset_name, a.category, d.name as department_name
      FROM assets_history ah
      JOIN assets a ON ah.asset_id = a.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE 1=1
    `;
    const params = {};

    if (options.startDate) {
      sql += ' AND ah.record_date >= @startDate';
      params.startDate = options.startDate;
    }
    if (options.endDate) {
      sql += ' AND ah.record_date <= @endDate';
      params.endDate = options.endDate;
    }
    if (options.departmentId) {
      sql += ' AND a.department_id = @departmentId';
      params.departmentId = options.departmentId;
    }
    if (options.category) {
      sql += ' AND a.category = @category';
      params.category = options.category;
    }

    sql += ' ORDER BY ah.record_date DESC, a.name';

    if (options.limit) {
      sql += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      params.offset = options.offset || 0;
      params.limit = options.limit;
    }

    return await query(sql, params);
  }

  /**
   * 取得指定資產的最新一筆記錄
   * @param {number} assetId
   * @returns {Promise<Object|null>}
   */
  static async getLatestByAssetId(assetId) {
    const sql = `
      SELECT TOP 1 * FROM assets_history
      WHERE asset_id = @assetId
      ORDER BY record_date DESC
    `;
    const records = await query(sql, { assetId });
    return records[0] || null;
  }

  /**
   * 檢查指定資產在指定日期是否已有記錄
   * @param {number} assetId
   * @param {string} recordDate
   * @returns {Promise<boolean>}
   */
  static async exists(assetId, recordDate) {
    const sql = `
      SELECT COUNT(*) as count FROM assets_history
      WHERE asset_id = @assetId AND record_date = @recordDate
    `;
    const result = await query(sql, { assetId, recordDate });
    return result[0].count > 0;
  }

  /**
   * 更新指定資產在指定日期的記錄（用於編輯資產時覆蓋當天記錄）
   * @param {number} assetId
   * @param {string} recordDate
   * @param {Object} data - 要更新的欄位資料
   * @returns {Promise<void>}
   */
  static async updateByAssetIdAndDate(assetId, recordDate, data) {
    const {
      unamortized_mo, avg_dep, accumulated,
      dep_rate, annual_dep, decl_accumulated,
      cost, quantity, residual, useful_mo, dep_meth, dep_start
    } = data;

    const sql = `
      UPDATE assets_history SET
        unamortized_mo = @unamortized_mo,
        avg_dep = @avg_dep,
        accumulated = @accumulated,
        dep_rate = @dep_rate,
        annual_dep = @annual_dep,
        decl_accumulated = @decl_accumulated,
        cost = @cost,
        quantity = @quantity,
        residual = @residual,
        useful_mo = @useful_mo,
        dep_meth = @dep_meth,
        dep_start = @dep_start
      WHERE asset_id = @assetId AND record_date = @recordDate
    `;

    const params = {
      assetId,
      recordDate,
      unamortized_mo: unamortized_mo || null,
      avg_dep: avg_dep || null,
      accumulated: accumulated || null,
      dep_rate: dep_rate || null,
      annual_dep: annual_dep || null,
      decl_accumulated: decl_accumulated || null,
      cost: cost || null,
      quantity: quantity || null,
      residual: residual || null,
      useful_mo: useful_mo || null,
      dep_meth: dep_meth || null,
      dep_start: dep_start || null
    };

    return await execute(sql, params);
  }

  /**
   * 刪除指定資產的所有歷史記錄
   * @param {number} assetId
   * @returns {Promise<void>}
   */
  static async deleteByAssetId(assetId) {
    const sql = 'DELETE FROM assets_history WHERE asset_id = @assetId';
    return await execute(sql, { assetId });
  }

  /**
   * 取得統計摘要
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  static async getSummary(options = {}) {
    let sql = `
      SELECT 
        COUNT(DISTINCT ah.asset_id) as total_assets,
        COUNT(*) as total_records,
        MIN(ah.record_date) as earliest_date,
        MAX(ah.record_date) as latest_date,
        SUM(ah.avg_dep) as total_avg_dep,
        SUM(ah.annual_dep) as total_annual_dep
      FROM assets_history ah
      JOIN assets a ON ah.asset_id = a.id
      WHERE 1=1
    `;
    const params = {};

    if (options.startDate) {
      sql += ' AND ah.record_date >= @startDate';
      params.startDate = options.startDate;
    }
    if (options.endDate) {
      sql += ' AND ah.record_date <= @endDate';
      params.endDate = options.endDate;
    }

    const result = await query(sql, params);
    return result[0];
  }
}

module.exports = AssetHistory;
