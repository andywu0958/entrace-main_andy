const User = require('../models/User');
const Department = require('../models/Department');

const userController = {
  // 顯示使用者列表（僅管理員可用）
  index: async (req, res) => {
    try {
      const users = await User.findAll();
      
      res.render('users/index', {
        title: '使用者管理',
        users
      });
    } catch (error) {
      console.error('Users index error:', error);
      req.flash('error_msg', '載入使用者列表時發生錯誤');
      res.redirect('/');
    }
  },

  // 顯示編輯使用者表單（僅管理員可用）
  edit: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        req.flash('error_msg', '使用者不存在');
        return res.redirect('/users');
      }
      
      const departments = await Department.findAll();
      
      res.render('users/edit', {
        title: `編輯使用者: ${user.username}`,
        editUser: user, // 避免與 res.locals.user 衝突
        departments
      });
    } catch (error) {
      console.error('Edit user form error:', error);
      req.flash('error_msg', '載入編輯使用者表單時發生錯誤');
      res.redirect('/users');
    }
  },

  // 更新使用者（僅管理員可用）
  update: async (req, res) => {
    try {
      const { username, role, department_id, password } = req.body;
      const userId = req.params.id;
      
      // 驗證輸入
      if (!username || !role) {
        req.flash('error_msg', '請填寫所有必填欄位');
        return res.redirect(`/users/${userId}/edit`);
      }
      
      // 部門管理員必須選擇部門
      if (role === 'dept_manager' && !department_id) {
        req.flash('error_msg', '部門管理員必須選擇部門');
        return res.redirect(`/users/${userId}/edit`);
      }
      
      // 檢查使用者名稱是否已存在（排除自己）
      const usernameExists = await User.usernameExists(username, userId);
      if (usernameExists) {
        req.flash('error_msg', '使用者名稱已存在');
        return res.redirect(`/users/${userId}/edit`);
      }
      
      // 更新基本資料
      const userData = {
        username,
        role,
        departmentId: department_id || null
      };
      
      await User.update(userId, userData);
      
      // 如果有填寫新密碼，更新密碼
      if (password && password.trim() !== '') {
        if (password.length < 6) {
          req.flash('error_msg', '密碼長度至少需要6個字元，使用者基本資料已更新');
          return res.redirect(`/users/${userId}/edit`);
        }
        await User.updatePassword(userId, password);
      }
      
      req.flash('success_msg', '使用者更新成功');
      res.redirect('/users');
    } catch (error) {
      console.error('Update user error:', error);
      req.flash('error_msg', '更新使用者時發生錯誤');
      res.redirect(`/users/${req.params.id}/edit`);
    }
  },

  // 刪除使用者（僅管理員可用）
  destroy: async (req, res) => {
    try {
      const userId = req.params.id;
      
      // 檢查是否刪除自己
      if (userId === String(req.session.user.id)) {
        req.flash('error_msg', '您不能刪除自己的帳號');
        return res.redirect('/users');
      }
      
      await User.delete(userId);
      
      req.flash('success_msg', '使用者刪除成功');
      res.redirect('/users');
    } catch (error) {
      console.error('Delete user error:', error);
      req.flash('error_msg', '刪除使用者時發生錯誤');
      res.redirect('/users');
    }
  }
};

module.exports = userController;
