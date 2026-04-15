const User = require('../models/User');

const authController = {
  // 顯示登入頁面
  showLogin: (req, res) => {
    res.render('auth/login', { title: '登入', layout: false });
  },

  // 處理登入
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // 驗證輸入
      if (!username || !password) {
        req.flash('error_msg', '請輸入使用者名稱和密碼');
        return res.redirect('/auth/login');
      }
      
      // 尋找使用者
      const user = await User.findByUsername(username);
      if (!user) {
        req.flash('error_msg', '使用者名稱或密碼錯誤');
        return res.redirect('/auth/login');
      }
      
      // 驗證密碼
      const isMatch = await User.comparePassword(password, user.password);
      if (!isMatch) {
        req.flash('error_msg', '使用者名稱或密碼錯誤');
        return res.redirect('/auth/login');
      }
      
      // 設定 session
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        department_id: user.department_id
      };
      
      req.flash('success_msg', '登入成功');
      res.redirect('/');
    } catch (error) {
      console.error('Login error:', error);
      req.flash('error_msg', '登入時發生錯誤');
      res.redirect('/auth/login');
    }
  },

  // 顯示註冊頁面（僅管理員可用）
  showRegister: async (req, res) => {
    try {
      const Department = require('../models/Department');
      const departments = await Department.findAll();
      
      res.render('auth/register', {
        title: '註冊新使用者',
        departments
      });
    } catch (error) {
      console.error('Show register error:', error);
      req.flash('error_msg', '載入註冊頁面時發生錯誤');
      res.redirect('/');
    }
  },

  // 處理註冊
  register: async (req, res) => {
    try {
      const { username, password, confirmPassword, role, department_id } = req.body;
      const departmentId = department_id; // map to local variable
      
      // 驗證輸入
      if (!username || !password || !confirmPassword || !role) {
        req.flash('error_msg', '請填寫所有必填欄位');
        return res.redirect('/auth/register');
      }
      
      if (password !== confirmPassword) {
        req.flash('error_msg', '密碼確認不一致');
        return res.redirect('/auth/register');
      }
      
      if (password.length < 6) {
        req.flash('error_msg', '密碼長度至少需要6個字元');
        return res.redirect('/auth/register');
      }
      
      // 檢查使用者名稱是否已存在
      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        req.flash('error_msg', '使用者名稱已存在');
        return res.redirect('/auth/register');
      }
      
      // 部門管理員必須選擇部門
      if (role === 'dept_manager' && !departmentId) {
        req.flash('error_msg', '部門管理員必須選擇部門');
        return res.redirect('/auth/register');
      }
      
      // 建立使用者
      await User.create(username, password, role, departmentId || null);
      
      req.flash('success_msg', '使用者註冊成功');
      res.redirect('/users');
    } catch (error) {
      console.error('Register error:', error);
      req.flash('error_msg', '註冊時發生錯誤');
      res.redirect('/auth/register');
    }
  },

  // 登出
  logout: (req, res) => {
    // 在销毁会话之前设置 flash 消息
    req.flash('success_msg', '您已成功登出');
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        req.flash('error_msg', '登出時發生錯誤');
        return res.redirect('/');
      }

      res.redirect('/');
    });
  },

  // 顯示個人資料
  showProfile: async (req, res) => {
    try {
      const user = await User.findById(req.session.user.id);
      const Department = require('../models/Department');
      const departments = await Department.findAll();
      
      res.render('auth/profile', {
        title: '個人資料',
        user,
        departments
      });
    } catch (error) {
      console.error('Show profile error:', error);
      req.flash('error_msg', '載入個人資料時發生錯誤');
      res.redirect('/');
    }
  },

  // 更新個人資料
  updateProfile: async (req, res) => {
    try {
      const { username, currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.session.user.id;
      
      // 檢查使用者名稱是否已存在（排除自己）
      const usernameExists = await User.usernameExists(username, userId);
      if (usernameExists) {
        req.flash('error_msg', '使用者名稱已存在');
        return res.redirect('/auth/profile');
      }
      
      // 如果要變更密碼
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          req.flash('error_msg', '新密碼確認不一致');
          return res.redirect('/auth/profile');
        }
        
        if (newPassword.length < 6) {
          req.flash('error_msg', '新密碼長度至少需要6個字元');
          return res.redirect('/auth/profile');
        }
        
        // 驗證當前密碼
        const user = await User.findById(userId);
        const isMatch = await User.comparePassword(currentPassword, user.password);
        if (!isMatch) {
          req.flash('error_msg', '當前密碼錯誤');
          return res.redirect('/auth/profile');
        }
        
        // 更新密碼
        await User.updatePassword(userId, newPassword);
      }
      
      // 更新使用者名稱
      await User.update(userId, { username, role: req.session.user.role, departmentId: req.session.user.department_id });
      
      // 更新 session
      req.session.user.username = username;
      
      req.flash('success_msg', '個人資料更新成功');
      res.redirect('/auth/profile');
    } catch (error) {
      console.error('Update profile error:', error);
      req.flash('error_msg', '更新個人資料時發生錯誤');
      res.redirect('/auth/profile');
    }
  }
};

module.exports = authController;
