const express = require('express');
const router = express.Router();
const assetCategoryController = require('../controllers/assetCategoryController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// 所有路由都需要管理員權限
router.use(isAuthenticated, isAdmin);

// 列表頁
router.get('/', assetCategoryController.index);

// 搜尋
router.get('/search', assetCategoryController.search);

// 新增頁面
router.get('/create', assetCategoryController.create);

// 新增處理
router.post('/store', assetCategoryController.store);

// 檢視頁面
router.get('/:code', assetCategoryController.show);

// 編輯頁面
router.get('/:code/edit', assetCategoryController.edit);

// 更新處理
router.post('/:code/update', assetCategoryController.update);

// 刪除處理
router.post('/:code/delete', assetCategoryController.destroy);

module.exports = router;
