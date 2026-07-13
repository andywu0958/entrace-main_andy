const { query, execute } = require('../config/database');
const QRCode = require('qrcode');
const AssetHistory = require('./AssetHistory');
const { calcDecliningAccumulated, calcElapsedMonths } = require('../utils/depreciation');

class Asset {
  // 建立資產
  static async create(data) {
    const { name, model, category, departmentId, status = 'active', serialno, purchased_at, remark, supplier, quantity, unit, cost, warranty, dep_meth, useful_mo, residual, dep_start, unamortized_mo, avg_dep, accumulated, custodian, location, dep_rate, decl_accumulated } = data;
    
    const sql = `
      INSERT INTO assets (name, model, category, department_id, status, serialno, purchased_at, remark, supplier, quantity, unit, cost, warranty, dep_meth, useful_mo, residual, dep_start, unamortized_mo, avg_dep, accumulated, custodian, location, dep_rate) 
      VALUES (@name, @model, @category, @departmentId, @status, @serialno, @purchased_at, @remark, @supplier, @quantity, @unit, @cost, @warranty, @dep_meth, @useful_mo, @residual, @dep_start, @unamortized_mo, @avg_dep, @accumulated, @custodian, @location, @dep_rate);
      SELECT SCOPE_IDENTITY() as id;
    `;
    
    const params = {
      name,
      model: model || null,
      category,
      departmentId,
      status,
      serialno: serialno || null,
      purchased_at: purchased_at || null,
      remark: remark || null,
      supplier: supplier || null,
      quantity: quantity || null,
      unit: unit || null,
      cost: cost || null,
      warranty: warranty || null,
      dep_meth: dep_meth || null,
      useful_mo: useful_mo || null,
      residual: residual || null,
      dep_start: dep_start || null,
      unamortized_mo: unamortized_mo || null,
      avg_dep: avg_dep || null,
      accumulated: accumulated || null,
      custodian: custodian || null,
      location: location || null,
      dep_rate: dep_rate || null
    };
    
    const result = await query(sql, params);
    const assetId = result[0].id;
    
    // 生成 QR Code
    const qrCodeUrl = await this.generateQRCode(assetId);
    
    // 更新 QR Code URL
    await this.updateQRCode(assetId, qrCodeUrl);
    
    // 同步寫入折舊歷史記錄（開帳資料）
    try {
      await AssetHistory.create({
        asset_id: assetId,
        record_date: new Date().toISOString().split('T')[0],
        unamortized_mo: unamortized_mo || null,
        avg_dep: avg_dep || null,
        accumulated: accumulated || null,
        dep_rate: dep_rate || null,
      annual_dep: dep_rate && cost && dep_start
          ? (() => {
              // 計算從提列開始到現在經過的完整年數
              const startDate = new Date(dep_start);
              const now = new Date();
              const elapsedMonths = (now.getFullYear() - startDate.getFullYear()) * 12
                + (now.getMonth() - startDate.getMonth());
              const fullYearsElapsed = Math.floor(elapsedMonths / 12);
              
              // 計算第 N 年的期初帳面價值
              let bookValue = Number(cost);
              const rate = Number(dep_rate) / 100;
              const residualVal = Number(residual) || 0;
              
              // 逐年模擬折舊，記錄每年的折舊額（與前端 calcAnnualDepreciation() 邏輯一致）
              let lastYearDep = 0;
              for (let i = 0; i < fullYearsElapsed; i++) {
                let yearDep = Math.round(bookValue * rate);
                if (bookValue - yearDep < residualVal) {
                  yearDep = bookValue - residualVal;
                }
                lastYearDep = yearDep;
                bookValue -= yearDep;
              }
              
              // 回傳最後一個完整年度的年折舊額（與前端一致）
              return lastYearDep;
            })()
          : null,
      // 根據折舊方法決定 decl_accumulated 的值：
      // - 定率遞減法：使用 calcDecliningAccumulated() 計算的累積折舊
      // - 平均法：decl_accumulated 應為 null，不應寫入平均法的累積折舊值
      decl_accumulated: dep_meth === '定率遞減法' ? (decl_accumulated || null) : null,
        cost: cost || null,
        quantity: quantity || null,
        residual: residual || null,
        useful_mo: useful_mo || null,
        dep_meth: dep_meth || null,
        dep_start: dep_start || null
      });
    } catch (historyErr) {
      // 歷史記錄寫入失敗不影響主流程，僅記錄錯誤
      console.error(`[Asset.create] 寫入折舊歷史記錄失敗 (assetId=${assetId}):`, historyErr.message);
    }
    
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
      SELECT a.*, d.name as department_name,
             ah.annual_dep, ah.decl_accumulated
      FROM assets a 
      LEFT JOIN assets_departments d ON a.department_id = d.id 
      LEFT JOIN (
        SELECT asset_id, annual_dep, decl_accumulated,
               ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY record_date DESC) as rn
        FROM [pm].[dbo].[assets_history]
      ) ah ON a.id = ah.asset_id AND ah.rn = 1
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
      LEFT JOIN assets_departments d ON a.department_id = d.id 
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
      sql += ' AND (a.name LIKE @search OR a.category LIKE @search OR a.model LIKE @search OR a.location LIKE @search)';
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
      sql += ' AND (name LIKE @search OR category LIKE @search OR model LIKE @search OR location LIKE @search)';
      params.search = `%${filters.search}%`;
    }
    
    const result = await query(sql, params);
    return result[0].total;
  }

  // 更新資產
  static async update(id, data) {
    const { name, model, category, departmentId, status, serialno, purchased_at, remark, supplier, quantity, unit, cost, warranty, dep_meth, useful_mo, residual, dep_start, unamortized_mo, avg_dep, accumulated, custodian, location, dep_rate, decl_accumulated } = data;
    
    const sql = `
      UPDATE assets 
      SET name = @name, model = @model, category = @category, 
          department_id = @departmentId, status = @status,
          serialno = @serialno, purchased_at = @purchased_at, remark = @remark,
          supplier = @supplier, quantity = @quantity, unit = @unit, cost = @cost,
          warranty = @warranty, dep_meth = @dep_meth, useful_mo = @useful_mo,
          residual = @residual, dep_start = @dep_start, unamortized_mo = @unamortized_mo,
          avg_dep = @avg_dep, accumulated = @accumulated, custodian = @custodian,
          location = @location, dep_rate = @dep_rate
      WHERE id = @id
    `;
    
    const params = {
      id,
      name,
      model: model || null,
      category,
      departmentId,
      status,
      serialno: serialno || null,
      purchased_at: purchased_at || null,
      remark: remark || null,
      supplier: supplier || null,
      quantity: quantity || null,
      unit: unit || null,
      cost: cost || null,
      warranty: warranty || null,
      dep_meth: dep_meth || null,
      useful_mo: useful_mo || null,
      residual: residual || null,
      dep_start: dep_start || null,
      unamortized_mo: unamortized_mo || null,
      avg_dep: avg_dep || null,
      accumulated: accumulated || null,
      custodian: custodian || null,
      location: location || null,
      dep_rate: dep_rate || null
    };
    
    const result = await execute(sql, params);
    
    // 同步寫入折舊歷史記錄（更新後的快照）
    try {
      // 從資料庫查詢該資產當前的累積折舊值，確保不依賴前端傳遞
      const currentAsset = await this.findById(id);
      const currentAccumulated = currentAsset ? currentAsset.accumulated : null;
      const currentCost = currentAsset ? currentAsset.cost : null;
      const currentDepRate = currentAsset ? currentAsset.dep_rate : null;
      const currentDepStart = currentAsset ? currentAsset.dep_start : null;
      const currentResidual = currentAsset ? currentAsset.residual : null;
      
      // 使用資料庫中的值計算 annual_dep 和 decl_accumulated
      const effectiveAccumulated = accumulated !== undefined && accumulated !== null ? accumulated : currentAccumulated;
      const effectiveCost = cost !== undefined && cost !== null ? cost : currentCost;
      const effectiveDepRate = dep_rate !== undefined && dep_rate !== null ? dep_rate : currentDepRate;
      const effectiveDepStart = dep_start !== undefined && dep_start !== null ? dep_start : currentDepStart;
      const effectiveResidual = residual !== undefined && residual !== null ? residual : currentResidual;
      
      const recordDate = new Date().toISOString().split('T')[0];
      // 計算 annual_dep
      const computedAnnualDep = effectiveDepRate && effectiveCost && effectiveDepStart
        ? (() => {
            // 計算從提列開始到現在經過的完整年數
            const startDate = new Date(effectiveDepStart);
            const now = new Date();
            const elapsedMonths = (now.getFullYear() - startDate.getFullYear()) * 12
              + (now.getMonth() - startDate.getMonth());
            const fullYearsElapsed = Math.floor(elapsedMonths / 12);
            
            // 計算第 N 年的期初帳面價值
            let bookValue = Number(effectiveCost);
            const rate = Number(effectiveDepRate) / 100;
            const residualVal = Number(effectiveResidual) || 0;
            
            // 逐年模擬折舊，記錄每年的折舊額（與前端 calcAnnualDepreciation() 邏輯一致）
            let lastYearDep = 0;
            for (let i = 0; i < fullYearsElapsed; i++) {
              let yearDep = Math.round(bookValue * rate);
              if (bookValue - yearDep < residualVal) {
                yearDep = bookValue - residualVal;
              }
              lastYearDep = yearDep;
              bookValue -= yearDep;
            }
            
            // 回傳最後一個完整年度的年折舊額（與前端一致）
            return lastYearDep;
          })()
        : null;

      // 根據折舊方法決定 decl_accumulated 的值：
      // - 定率遞減法：使用前端傳來的 decl_accumulated 值（前端 calcDecliningAccumulated() 已計算正確的累積折舊）
      // - 平均法：decl_accumulated 應為 null，不應寫入平均法的累積折舊值
      const effectiveDepMeth = dep_meth !== undefined && dep_meth !== null ? dep_meth : (currentAsset ? currentAsset.dep_meth : null);
      let computedDeclAccumulated = null;
      if (effectiveDepMeth === '定率遞減法') {
        computedDeclAccumulated = decl_accumulated !== undefined && decl_accumulated !== null ? decl_accumulated : null;
      }
      // 平均法 (straight-line) 或其他方法：decl_accumulated 保持 null

      const historyData = {
        unamortized_mo: unamortized_mo || null,
        avg_dep: avg_dep || null,
        accumulated: effectiveAccumulated,
        dep_rate: effectiveDepRate,
        annual_dep: computedAnnualDep,
        decl_accumulated: computedDeclAccumulated,
        cost: effectiveCost,
        quantity: quantity || null,
        residual: effectiveResidual,
        useful_mo: useful_mo || null,
        dep_meth: dep_meth || null,
        dep_start: effectiveDepStart
      };

      // 檢查當天是否已有記錄，有則更新，無則新增（避免唯一鍵衝突）
      const exists = await AssetHistory.exists(id, recordDate);
      if (exists) {
        await AssetHistory.updateByAssetIdAndDate(id, recordDate, historyData);
      } else {
        await AssetHistory.create({
          asset_id: id,
          record_date: recordDate,
          ...historyData
        });
      }
    } catch (historyErr) {
      // 歷史記錄寫入失敗不影響主流程，僅記錄錯誤
      console.error(`[Asset.update] 寫入折舊歷史記錄失敗 (assetId=${id}):`, historyErr.message);
    }
    
    return result;
  }

  // 刪除資產
  static async delete(id) {
    const sql = 'DELETE FROM assets WHERE id = @id';
    return await execute(sql, { id });
  }

  // 取得所有類別（從 assets_category 資料表）
  static async getCategories() {
    const sql = 'SELECT [code], [name], [dep_meth] FROM [pm].[dbo].[assets_category] ORDER BY [code]';
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
      FROM assets_departments d
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

  // 根據序號/編號尋找資產
  static async findBySerialno(serialno, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM assets WHERE serialno = @serialno';
    const params = { serialno };
    
    if (excludeId) {
      sql += ' AND id != @excludeId';
      params.excludeId = excludeId;
    }
    
    const result = await query(sql, params);
    return result[0].count > 0;
  }

  // 取得最近新增的資產
  static async getRecentAssets(limit = 10, departmentId = null) {
    let sql = `
      SELECT TOP ${limit} a.*, d.name as department_name 
      FROM assets a 
      LEFT JOIN assets_departments d ON a.department_id = d.id 
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
