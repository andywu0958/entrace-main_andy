const cron = require('node-cron');
const { query } = require('../config/database');
const AssetHistory = require('../models/AssetHistory');
const { calcDecliningAccumulated, calcElapsedMonths } = require('../utils/depreciation');

/**
 * 折舊歷史記錄排程服務
 * 
 * 每月1日凌晨 00:30 執行，將所有 active 資產的當月折舊資料
 * 寫入 assets_history 表
 */
class DepreciationScheduler {
  /**
   * 啟動排程
   */
  static start() {
    // 每月1日 00:30 執行
    cron.schedule('30 0 1 * *', async () => {
      console.log(`[DepreciationScheduler] 開始執行每月折舊記錄寫入 - ${new Date().toISOString()}`);
      try {
        const result = await this.batchWriteHistory();
        console.log(`[DepreciationScheduler] 完成寫入 ${result.count} 筆記錄`);
      } catch (error) {
        console.error('[DepreciationScheduler] 執行失敗:', error);
      }
    });

    console.log('[DepreciationScheduler] 排程已啟動（每月1日 00:30）');
  }

  /**
   * 批次寫入所有 active 資產的當月折舊歷史記錄
   * @returns {Promise<{count: number}>}
   */
  static async batchWriteHistory() {
    // 取得當月1日的日期
    const now = new Date();
    const recordDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const dateStr = recordDate.toISOString().split('T')[0];

    // 查詢所有 active 資產
    const assets = await query(`
      SELECT id, cost, quantity, residual, useful_mo, dep_meth, dep_start,
             unamortized_mo, avg_dep, accumulated, dep_rate
      FROM assets
      WHERE status = 'active'
    `);

    let writeCount = 0;

    for (const asset of assets) {
      try {
        // 檢查是否已有當月記錄（避免重複寫入）
        const exists = await AssetHistory.exists(asset.id, dateStr);
        if (exists) {
          continue;
        }

        // 計算當月折舊值
        const historyData = this.calculateDepreciation(asset, dateStr);

        // 寫入歷史記錄
        await AssetHistory.create(historyData);
        writeCount++;
      } catch (err) {
        console.error(`[DepreciationScheduler] 資產 ID ${asset.id} 寫入失敗:`, err.message);
      }
    }

    return { count: writeCount };
  }

  /**
   * 計算單一資產的當月折舊資料
   * @param {Object} asset - 資產資料
   * @param {string} recordDate - 記錄日期
   * @returns {Object} 折舊歷史資料
   */
  static calculateDepreciation(asset, recordDate) {
    const cost = Number(asset.cost) || 0;
    const residual = Number(asset.residual) || 0;
    const quantity = Number(asset.quantity) || 1;
    const usefulMo = Number(asset.useful_mo) || 0;
    const unamortizedMo = Number(asset.unamortized_mo) || 0;
    const accumulated = Number(asset.accumulated) || 0;
    const depRate = Number(asset.dep_rate) || 0;
    const depStart = asset.dep_start;

    // 平均法月折舊額 = (成本 - 殘值) / 耐用月數
    let avgDep = 0;
    if (usefulMo > 0) {
      avgDep = (cost - residual) / usefulMo;
    }

    // 未攤月數遞減
    const newUnamortizedMo = Math.max(0, unamortizedMo - 1);

    // 平均法累積折舊遞增
    const newAccumulated = accumulated + avgDep;

    // 根據折舊方法決定 decl_accumulated 的值：
    // - 定率遞減法：使用 calcDecliningAccumulated() 計算的累積折舊
    // - 平均法：decl_accumulated 應為 null，不應寫入平均法的累積折舊值
    let declAccumulated = null;
    let annualDep = 0;
    if (asset.dep_meth === 'declining') {
      const elapsedMonths = calcElapsedMonths(depStart, recordDate);
      declAccumulated = calcDecliningAccumulated(cost, depRate, elapsedMonths, residual);
      // 定率年折舊額 = 未折舊餘額 × 年折舊率（用於記錄）
      const netBookValue = cost - accumulated;
      annualDep = netBookValue * (depRate / 100);
    }

    return {
      asset_id: asset.id,
      record_date: recordDate,
      unamortized_mo: newUnamortizedMo,
      avg_dep: Math.round(avgDep * 100) / 100,
      accumulated: Math.round(newAccumulated * 100) / 100,
      dep_rate: depRate,
      annual_dep: Math.round(annualDep * 100) / 100,
      decl_accumulated: declAccumulated !== null ? Math.round(declAccumulated * 100) / 100 : null,
      cost: cost,
      quantity: quantity,
      residual: residual,
      useful_mo: usefulMo,
      dep_meth: asset.dep_meth,
      dep_start: depStart
    };
  }

  /**
   * 手動觸發寫入（供管理員手動執行）
   * @param {number|null} assetId - 指定資產 ID（可選，不指定則寫入全部）
   * @param {string|null} recordDate - 指定日期（可選，不指定則為當月1日）
   * @returns {Promise<{count: number}>}
   */
  static async manualTrigger(assetId = null, recordDate = null) {
    if (recordDate) {
      return await this.batchWriteHistory();
    }

    if (assetId) {
      const now = new Date();
      const dateStr = (recordDate || new Date(now.getFullYear(), now.getMonth(), 1))
        .toISOString().split('T')[0];

      const asset = await query(
        'SELECT id, cost, quantity, residual, useful_mo, dep_meth, dep_start, unamortized_mo, avg_dep, accumulated, dep_rate FROM assets WHERE id = @id',
        { id: assetId }
      );

      if (asset.length === 0) {
        throw new Error(`資產 ID ${assetId} 不存在`);
      }

      const exists = await AssetHistory.exists(assetId, dateStr);
      if (exists) {
        return { count: 0, message: '該月份已有記錄' };
      }

      const historyData = this.calculateDepreciation(asset[0], dateStr);
      await AssetHistory.create(historyData);
      return { count: 1 };
    }

    return await this.batchWriteHistory();
  }
}

module.exports = DepreciationScheduler;
