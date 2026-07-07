const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Department = require('../models/Department');
const User = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

// API 路由需要登入
router.use(isAuthenticated);

// 取得資產列表 (API)
router.get('/assets', async (req, res) => {
  try {
    const filters = {
      departmentId: req.query.department_id,
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };
    
    // 如果是部門管理員，只能看到自己部門的資產
    if (req.session.user.role === 'dept_manager') {
      filters.departmentId = req.session.user.department_id;
    }
    
    const assets = await Asset.findAll(filters);
    const total = await Asset.count(filters);
    
    res.json({
      success: true,
      data: assets,
      total,
      limit: filters.limit,
      offset: filters.offset
    });
  } catch (error) {
    console.error('API assets error:', error);
    res.status(500).json({
      success: false,
      message: '取得資產列表時發生錯誤'
    });
  }
});

// 取得單一資產 (API)
router.get('/assets/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: '資產不存在'
      });
    }
    
    // 檢查權限（部門管理員只能存取自己部門的資產）
    if (req.session.user.role === 'dept_manager') {
      if (asset.department_id !== req.session.user.department_id) {
        return res.status(403).json({
          success: false,
          message: '沒有權限存取此資產'
        });
      }
    }
    
    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('API asset detail error:', error);
    res.status(500).json({
      success: false,
      message: '取得資產詳細資訊時發生錯誤'
    });
  }
});

// 取得部門列表 (API)
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.findAll();
    
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('API departments error:', error);
    res.status(500).json({
      success: false,
      message: '取得部門列表時發生錯誤'
    });
  }
});

// 取得資產類別 (API)
router.get('/categories', async (req, res) => {
  try {
    const categories = await Asset.getCategories();
    
    res.json({
      success: true,
      data: categories.map(cat => cat.category)
    });
  } catch (error) {
    console.error('API categories error:', error);
    res.status(500).json({
      success: false,
      message: '取得資產類別時發生錯誤'
    });
  }
});

// 取得資產統計 (API)
router.get('/stats', async (req, res) => {
  try {
    const departmentStats = await Asset.getDepartmentStats();
    const categoryStats = await Asset.getCategoryStats();
    
    res.json({
      success: true,
      data: {
        departments: departmentStats,
        categories: categoryStats
      }
    });
  } catch (error) {
    console.error('API stats error:', error);
    res.status(500).json({
      success: false,
      message: '取得統計資料時發生錯誤'
    });
  }
});

// 搜尋資產 (API)
router.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }
    
    const filters = {
      search: searchTerm,
      limit: 20
    };
    
    // 如果是部門管理員，只能搜尋自己部門的資產
    if (req.session.user.role === 'dept_manager') {
      filters.departmentId = req.session.user.department_id;
    }
    
    const assets = await Asset.findAll(filters);
    
    res.json({
      success: true,
      data: assets,
      total: assets.length
    });
  } catch (error) {
    console.error('API search error:', error);
    res.status(500).json({
      success: false,
      message: '搜尋資產時發生錯誤'
    });
  }
});

// 取得 QR Code 資訊 (公開 API，不需要登入)
router.get('/qr/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: '資產不存在'
      });
    }
    
    // 只回傳基本資訊（適合 QR Code 掃描）
    res.json({
      success: true,
      data: {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        department_name: asset.department_name,
        status: asset.status,
        created_at: asset.created_at,
        view_url: `${process.env.APP_URL || 'http://localhost:3000'}/assets/${asset.id}/view`
      }
    });
  } catch (error) {
    console.error('API QR info error:', error);
    res.status(500).json({
      success: false,
      message: '取得 QR Code 資訊時發生錯誤'
    });
  }
});

// 取得使用者資訊 (API，僅管理員可用)
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('API users error:', error);
    res.status(500).json({
      success: false,
      message: '取得使用者列表時發生錯誤'
    });
  }
});

// 匯出資產資料 (API，僅管理員可用)
router.get('/export/assets', isAdmin, async (req, res) => {
  try {
    // 自訂查詢：LEFT JOIN assets_history 取最新一筆折舊記錄
    const sql = `
      SELECT 
        a.*, 
        d.name as department_name,
        ah.avg_dep as history_avg_dep,
        ah.accumulated as history_accumulated,
        ah.annual_dep as history_annual_dep,
        ah.decl_accumulated as history_decl_accumulated,
        ah.dep_rate as history_dep_rate,
        ah.unamortized_mo as history_unamortized_mo,
        ah.record_date as history_record_date
      FROM assets a 
      LEFT JOIN departments d ON a.department_id = d.id
      OUTER APPLY (
        SELECT TOP 1 *
        FROM assets_history ah
        WHERE ah.asset_id = a.id
        ORDER BY ah.record_date DESC
      ) ah
    `;
    const assets = await query(sql, {});
    
    // 設定 CSV 標頭，包含 UTF-8 BOM 以便 Excel 正確識別
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=assets_export.csv');
    
    // 寫入 UTF-8 BOM（Excel 需要）
    res.write('\uFEFF');
    
    // CSV 標題列 - 完整欄位（新增定率年折舊額、定率累積折舊）
    const headers = [
      'ID', '資產名稱', '型號', '類別', '部門', '狀態', 
      '序號/編號', '購買日期',
      '供應商', '數量', '單位', '成本', '保固(月)',
      '折舊方法', '耐用月數', '殘值', '折舊起始(年月)', 
      '未攤銷月數', '平均折舊', '累計折舊', '折舊率(%)',
      '定率年折舊額', '定率累積折舊',
      '保管人', '存放地點',
      '建立時間', '更新時間',
      '備註'
    ];
    res.write(headers.join(',') + '\n');
    
    // 資料列
    const statusMap = {
      'active': '使用中',
      'inactive': '閒置',
      'maintenance': '維修中',
      'retired': '已報廢'
    };
    
    const depMethMap = {
      'straight_line': '直線法',
      'declining_balance': '定率遞減法',
      'sum_of_years': '年數合計法'
    };
    
    assets.forEach(asset => {
      const statusChinese = statusMap[asset.status] || asset.status;
      const depMethChinese = depMethMap[asset.dep_meth] || asset.dep_meth || '';
      
      // 決定使用哪個來源的折舊資料
      // 優先使用 assets_history 的最新記錄，若無則回退到 assets 表
      const avgDep = asset.history_avg_dep != null ? asset.history_avg_dep : asset.avg_dep;
      const accumulated = asset.history_accumulated != null ? asset.history_accumulated : asset.accumulated;
      const depRate = asset.history_dep_rate != null ? asset.history_dep_rate : asset.dep_rate;
      const unamortizedMo = asset.history_unamortized_mo != null ? asset.history_unamortized_mo : asset.unamortized_mo;
      const annualDep = asset.history_annual_dep;
      const declAccumulated = asset.history_decl_accumulated;
      
      const row = [
        asset.id,
        `"${(asset.name || '').replace(/"/g, '""')}"`,
        `"${(asset.model || '').replace(/"/g, '""')}"`,
        `"${(asset.category || '').replace(/"/g, '""')}"`,
        `"${(asset.department_name || '').replace(/"/g, '""')}"`,
        `"${statusChinese}"`,
        `"${(asset.serialno || '').replace(/"/g, '""')}"`,
        asset.purchased_at ? `"${new Date(asset.purchased_at).toISOString().split('T')[0]}"` : '',
        `"${(asset.supplier || '').replace(/"/g, '""')}"`,
        asset.quantity != null ? asset.quantity : '',
        `"${(asset.unit || '').replace(/"/g, '""')}"`,
        asset.cost != null ? asset.cost : '',
        asset.warranty != null ? asset.warranty : '',
        `"${depMethChinese}"`,
        asset.useful_mo != null ? asset.useful_mo : '',
        asset.residual != null ? asset.residual : '',
        `"${(asset.dep_start || '').replace(/"/g, '""')}"`,
        unamortizedMo != null ? unamortizedMo : '',
        avgDep != null ? avgDep : '',
        accumulated != null ? accumulated : '',
        depRate != null ? depRate : '',
        annualDep != null ? annualDep : '',
        declAccumulated != null ? declAccumulated : '',
        `"${(asset.custodian || '').replace(/"/g, '""')}"`,
        `"${(asset.location || '').replace(/"/g, '""')}"`,
        asset.created_at ? `"${new Date(asset.created_at).toISOString().replace('T', ' ').substring(0, 19)}"` : '',
        asset.updated_at ? `"${new Date(asset.updated_at).toISOString().replace('T', ' ').substring(0, 19)}"` : '',
        `"${(asset.remark || '').replace(/"/g, '""')}"`
      ];
      res.write(row.join(',') + '\n');
    });
    
    res.end();
  } catch (error) {
    console.error('API export error:', error);
    res.status(500).json({
      success: false,
      message: '匯出資產資料時發生錯誤'
    });
  }
});

// 計算逐年折舊 (API)
router.post('/calculate-depreciation', async (req, res) => {
  try {
    const { cost, salvage_value, useful_life, depreciation_rate, purchase_date } = req.body;
    
    // 驗證參數
    if (!cost || !salvage_value || !useful_life || !depreciation_rate || !purchase_date) {
      return res.status(400).json({
        success: false,
        message: '請提供完整的折舊計算參數'
      });
    }

    const costNum = parseFloat(cost);
    const salvageNum = parseFloat(salvage_value);
    const lifeNum = parseInt(useful_life);
    const rateNum = parseFloat(depreciation_rate) / 100;
    const purchaseDate = new Date(purchase_date);
    const currentYear = purchaseDate.getFullYear();

    // 定率遞減法計算逐年折舊
    const schedule = [];
    let bookValue = costNum;
    let totalDepreciation = 0;

    for (let year = 1; year <= lifeNum; year++) {
      const yearLabel = `${currentYear + year - 1}`;
      
      // 計算當年折舊
      let depreciationAmount;
      if (year === lifeNum) {
        // 最後一年：折舊到殘值
        depreciationAmount = bookValue - salvageNum;
      } else {
        depreciationAmount = bookValue * rateNum;
      }

      // 確保折舊後不低於殘值
      if (bookValue - depreciationAmount < salvageNum && year !== lifeNum) {
        depreciationAmount = bookValue - salvageNum;
      }

      // 確保折舊不為負數
      depreciationAmount = Math.max(0, depreciationAmount);
      
      totalDepreciation += depreciationAmount;
      bookValue -= depreciationAmount;

      schedule.push({
        year: year,
        yearLabel: yearLabel,
        beginningValue: Math.round((bookValue + depreciationAmount) * 100) / 100,
        depreciationRate: (rateNum * 100).toFixed(2) + '%',
        depreciationAmount: Math.round(depreciationAmount * 100) / 100,
        accumulatedDepreciation: Math.round(totalDepreciation * 100) / 100,
        endingValue: Math.round(Math.max(bookValue, salvageNum) * 100) / 100
      });

      // 如果已折舊到殘值，後續年度填0
      if (bookValue <= salvageNum && year < lifeNum) {
        for (let y = year + 1; y <= lifeNum; y++) {
          schedule.push({
            year: y,
            yearLabel: `${currentYear + y - 1}`,
            beginningValue: Math.round(salvageNum * 100) / 100,
            depreciationRate: '0.00%',
            depreciationAmount: 0,
            accumulatedDepreciation: Math.round(totalDepreciation * 100) / 100,
            endingValue: Math.round(salvageNum * 100) / 100
          });
        }
        break;
      }
    }

    res.json({
      success: true,
      data: {
        cost: costNum,
        salvageValue: salvageNum,
        usefulLife: lifeNum,
        depreciationRate: (rateNum * 100).toFixed(2) + '%',
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        schedule: schedule,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        finalBookValue: Math.round(bookValue * 100) / 100
      }
    });
  } catch (error) {
    console.error('API calculate depreciation error:', error);
    res.status(500).json({
      success: false,
      message: '計算折舊時發生錯誤'
    });
  }
});

module.exports = router;
