// 檢查使用者是否已登入
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  
  req.flash('error_msg', '請先登入以存取此頁面');
  res.redirect('/auth/login');
};

// 檢查使用者是否未登入
const isNotAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  
  res.redirect('/');
};

// 檢查使用者角色
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      req.flash('error_msg', '請先登入以存取此頁面');
      return res.redirect('/auth/login');
    }
    
    if (roles.includes(req.session.user.role)) {
      return next();
    }
    
    req.flash('error_msg', '您沒有權限存取此頁面');
    res.redirect('/');
  };
};

// 檢查資產權限（部門管理員只能存取自己部門的資產）
const checkAssetPermission = async (req, res, next) => {
  try {
    const user = req.session.user;
    const assetId = req.params.id;
    
    // 管理員可以存取所有資產
    if (user.role === 'admin') {
      return next();
    }
    
    // 部門管理員只能存取自己部門的資產
    if (user.role === 'dept_manager') {
      const Asset = require('../models/Asset');
      const belongs = await Asset.belongsToDepartment(assetId, user.department_id);
      
      if (belongs) {
        return next();
      }
    }
    
    req.flash('error_msg', '您沒有權限存取此資產');
    res.redirect('/assets');
  } catch (error) {
    console.error('Permission check error:', error);
    req.flash('error_msg', '權限檢查發生錯誤');
    res.redirect('/assets');
  }
};

// 檢查部門權限（部門管理員只能存取自己部門）
const checkDepartmentPermission = (req, res, next) => {
  const user = req.session.user;
  
  // 管理員可以存取所有部門
  if (user.role === 'admin') {
    return next();
  }
  
  // 部門管理員只能存取自己部門
  if (user.role === 'dept_manager') {
    const departmentId = parseInt(req.params.id);
    
    if (departmentId === user.department_id) {
      return next();
    }
  }
  
  req.flash('error_msg', '您沒有權限存取此部門');
  res.redirect('/departments');
};

// 檢查使用者權限（管理員可以管理所有使用者，部門管理員只能管理自己部門的使用者）
const checkUserPermission = async (req, res, next) => {
  try {
    const user = req.session.user;
    const targetUserId = parseInt(req.params.id);
    
    // 管理員可以管理所有使用者
    if (user.role === 'admin') {
      return next();
    }
    
    // 部門管理員只能管理自己部門的使用者
    if (user.role === 'dept_manager') {
      const User = require('../models/User');
      const targetUser = await User.findById(targetUserId);
      
      if (targetUser && targetUser.department_id === user.department_id) {
        return next();
      }
    }
    
    req.flash('error_msg', '您沒有權限管理此使用者');
    res.redirect('/users');
  } catch (error) {
    console.error('User permission check error:', error);
    req.flash('error_msg', '權限檢查發生錯誤');
    res.redirect('/users');
  }
};

// 檢查是否為管理員
const isAdmin = checkRole(['admin']);

// 檢查是否為部門管理員或管理員
const isManagerOrAdmin = checkRole(['admin', 'dept_manager']);

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  checkRole,
  checkAssetPermission,
  checkDepartmentPermission,
  checkUserPermission,
  isAdmin,
  isManagerOrAdmin
};