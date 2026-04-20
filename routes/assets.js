const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { isAuthenticated, isManagerOrAdmin, checkAssetPermission } = require('../middleware/auth');

// 所有資產路由都需要登入
router.use(isAuthenticated);

// 資產列表
router.get('/', assetController.index);

// 新增資產表單
router.get('/create', isManagerOrAdmin, assetController.create);

// 儲存新資產
router.post('/', isManagerOrAdmin, assetController.store);

// 資產統計
router.get('/stats', assetController.stats);

// 顯示單一資產
router.get('/:id', assetController.show);

// 編輯資產表單
router.get('/:id/edit', checkAssetPermission, assetController.edit);

// 更新資產
router.put('/:id', checkAssetPermission, assetController.update);

// 刪除資產
router.delete('/:id', checkAssetPermission, assetController.destroy);

// 資產唯讀頁面（用於 QR Code 掃描）
router.get('/:id/view', assetController.view);

// 重新生成 QR Code
router.post('/:id/regenerate-qr', checkAssetPermission, assetController.regenerateQR);

module.exports = router;
