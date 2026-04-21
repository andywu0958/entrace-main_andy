const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Asset = require('../models/Asset');
const Department = require('../models/Department');

// 首頁
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const departmentId = user.role === 'admin' ? null : user.department_id;
    
    const recentAssets = await Asset.getRecentAssets(5, departmentId);
    const departmentStats = await Asset.getDepartmentStats(departmentId);
    const categoryStats = await Asset.getCategoryStats(departmentId);
    
    res.render('index', {
      title: '資產管理系統',
      recentAssets,
      departmentStats,
      categoryStats,
      user
    });
  } catch (error) {
    console.error('Home page error:', error);
    req.flash('error_msg', '載入首頁時發生錯誤');
    res.render('index', {
      title: '資產管理系統',
      recentAssets: [],
      departmentStats: [],
      categoryStats: [],
      user: req.session.user
    });
  }
});

// 儀表板
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const departmentId = user.role === 'admin' ? null : user.department_id;
    
    // 根據使用者角色取得不同的資料
    let assets, departments;
    
    if (user.role === 'admin') {
      assets = await Asset.findAll({ limit: 10 });
      departments = await Department.getWithStats(); // null 表示所有部門
    } else if (user.role === 'dept_manager') {
      assets = await Asset.findAll({ 
        departmentId: user.department_id,
        limit: 10 
      });
      departments = await Department.getWithStats(user.department_id);
    }
    
    const categoryStats = await Asset.getCategoryStats(departmentId);
    
    res.render('dashboard', {
      title: '儀表板',
      assets,
      departments,
      categoryStats,
      user
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', '載入儀表板時發生錯誤');
    res.redirect('/');
  }
});

// 關於頁面
router.get('/about', (req, res) => {
  res.render('about', {
    title: '關於系統',
    user: req.session.user || null
  });
});

// 使用說明
router.get('/help', (req, res) => {
  res.render('help', {
    title: '使用說明',
    user: req.session.user || null
  });
});

module.exports = router;
