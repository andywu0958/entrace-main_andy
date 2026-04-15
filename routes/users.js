const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// 所有使用者管理路由都需要登入且為管理員
router.use(isAuthenticated, isAdmin);

// 顯示使用者列表
router.get('/', userController.index);

// 顯示編輯使用者表單
router.get('/:id/edit', userController.edit);

// 更新使用者
router.put('/:id', userController.update);

// 刪除使用者
router.delete('/:id', userController.destroy);

module.exports = router;
