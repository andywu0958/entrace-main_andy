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
    // 自訂查詢（無排序）
    const sql = `
      SELECT a.*, d.name as department_name 
      FROM assets a 
      LEFT JOIN departments d ON a.department_id = d.id
    `;
    const assets = await query(sql, {});
    
    // 設定 CSV 標頭，包含 UTF-8 BOM 以便 Excel 正確識別
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=assets_export.csv');
    
    // 寫入 UTF-8 BOM（Excel 需要）
    res.write('\uFEFF');
    
    // CSV 標題列
    const headers = ['ID', '名稱', '類別', '部門', '狀態', '建立時間', '更新時間'];
    res.write(headers.join(',') + '\n');
    
    // 資料列
    const statusMap = {
      'active': '使用中',
      'inactive': '閒置',
      'maintenance': '維修中',
      'retired': '已報廢'
    };
    
    assets.forEach(asset => {
      const statusChinese = statusMap[asset.status] || asset.status;
      const row = [
        asset.id,
        `"${asset.name.replace(/"/g, '""')}"`, // 處理引號
        `"${asset.category}"`,
        `"${asset.department_name || ''}"`,
        `"${statusChinese}"`,
        `"${new Date(asset.created_at).toISOString().replace('T', ' ').substring(0, 19)}"`, 
        `"${new Date(asset.updated_at).toISOString().replace('T', ' ').substring(0, 19)}"` 
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

module.exports = router;
