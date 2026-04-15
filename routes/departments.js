const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { isAuthenticated, isAdmin, checkDepartmentPermission } = require('../middleware/auth');

// 所有部門路由都需要登入
router.use(isAuthenticated);

// 部門列表（僅管理員可用）
router.get('/', isAdmin, async (req, res) => {
  try {
    const departments = await Department.getWithStats();
    
    res.render('departments/index', {
      title: '部門管理',
      departments,
      user: req.session.user
    });
  } catch (error) {
    console.error('Departments index error:', error);
    req.flash('error_msg', '載入部門列表時發生錯誤');
    res.redirect('/');
  }
});

// 新增部門表單（僅管理員可用）
router.get('/create', isAdmin, (req, res) => {
  res.render('departments/create', {
    title: '新增部門'
  });
});

// 儲存新部門（僅管理員可用）
router.post('/', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    // 驗證輸入
    if (!name) {
      req.flash('error_msg', '請填寫部門名稱');
      return res.redirect('/departments/create');
    }
    
    // 檢查部門名稱是否已存在
    const nameExists = await Department.nameExists(name);
    if (nameExists) {
      req.flash('error_msg', '部門名稱已存在');
      return res.redirect('/departments/create');
    }
    
    // 建立部門
    await Department.create(name);
    
    req.flash('success_msg', '部門新增成功');
    res.redirect('/departments');
  } catch (error) {
    console.error('Create department error:', error);
    req.flash('error_msg', '新增部門時發生錯誤');
    res.redirect('/departments/create');
  }
});

// 顯示單一部門
router.get('/:id', checkDepartmentPermission, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      req.flash('error_msg', '部門不存在');
      return res.redirect('/departments');
    }
    
    // 取得部門的資產
    const assets = await Department.getAssets(req.params.id);
    
    // 取得部門的管理員
    const managers = await Department.getManagers(req.params.id);
    
    res.render('departments/show', {
      title: `部門: ${department.name}`,
      department,
      assets,
      managers
    });
  } catch (error) {
    console.error('Show department error:', error);
    req.flash('error_msg', '載入部門詳細資訊時發生錯誤');
    res.redirect('/departments');
  }
});

// 編輯部門表單（僅管理員可用）
router.get('/:id/edit', isAdmin, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      req.flash('error_msg', '部門不存在');
      return res.redirect('/departments');
    }
    
    res.render('departments/edit', {
      title: `編輯部門: ${department.name}`,
      department
    });
  } catch (error) {
    console.error('Edit department form error:', error);
    req.flash('error_msg', '載入編輯部門表單時發生錯誤');
    res.redirect('/departments');
  }
});

// 更新部門（僅管理員可用）
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const departmentId = req.params.id;
    
    // 驗證輸入
    if (!name) {
      req.flash('error_msg', '請填寫部門名稱');
      return res.redirect(`/departments/${departmentId}/edit`);
    }
    
    // 檢查部門名稱是否已存在（排除自己）
    const nameExists = await Department.nameExists(name, departmentId);
    if (nameExists) {
      req.flash('error_msg', '部門名稱已存在');
      return res.redirect(`/departments/${departmentId}/edit`);
    }
    
    // 更新部門
    await Department.update(departmentId, name);
    
    req.flash('success_msg', '部門更新成功');
    res.redirect(`/departments/${departmentId}`);
  } catch (error) {
    console.error('Update department error:', error);
    req.flash('error_msg', '更新部門時發生錯誤');
    res.redirect(`/departments/${departmentId}/edit`);
  }
});

// 刪除部門（僅管理員可用）
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    await Department.delete(req.params.id);
    
    req.flash('success_msg', '部門刪除成功');
    res.redirect('/departments');
  } catch (error) {
    console.error('Delete department error:', error);
    req.flash('error_msg', '刪除部門時發生錯誤');
    res.redirect('/departments');
  }
});

// 搜尋部門
router.get('/search', isAdmin, async (req, res) => {
  try {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.redirect('/departments');
    }
    
    const departments = await Department.search(searchTerm);
    
    res.render('departments/search', {
      title: `搜尋部門: ${searchTerm}`,
      departments,
      searchTerm
    });
  } catch (error) {
    console.error('Search departments error:', error);
    req.flash('error_msg', '搜尋部門時發生錯誤');
    res.redirect('/departments');
  }
});

module.exports = router;