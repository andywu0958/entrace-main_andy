const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated, isNotAuthenticated, isAdmin } = require('../middleware/auth');

// 登入頁面
router.get('/login', isNotAuthenticated, authController.showLogin);

// 處理登入
router.post('/login', isNotAuthenticated, authController.login);

// 註冊頁面（僅管理員可用）
router.get('/register', isAuthenticated, isAdmin, authController.showRegister);

// 處理註冊
router.post('/register', isAuthenticated, isAdmin, authController.register);

// 登出
router.get('/logout', isAuthenticated, authController.logout);

// 個人資料頁面
router.get('/profile', isAuthenticated, authController.showProfile);

// 更新個人資料
router.post('/profile', isAuthenticated, authController.updateProfile);

module.exports = router;