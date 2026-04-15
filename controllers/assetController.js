const Asset = require('../models/Asset');
const Department = require('../models/Department');

const assetController = {
  // 顯示所有資產
  index: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      const filters = {
        departmentId: req.query.department_id,
        category: req.query.category,
        status: req.query.status,
        search: req.query.search,
        limit,
        offset
      };
      
      // 如果是部門管理員，只能看到自己部門的資產
      if (req.session.user.role === 'dept_manager') {
        filters.departmentId = req.session.user.department_id;
      }
      
      const assets = await Asset.findAll(filters);
      const totalAssets = await Asset.count(filters);
      const totalPages = Math.ceil(totalAssets / limit);
      
      const departments = await Department.findAll();
      const categories = await Asset.getCategories();
      
      // 建立查詢字串
      const queryParams = [];
      if (filters.departmentId) queryParams.push(`department_id=${filters.departmentId}`);
      if (filters.category) queryParams.push(`category=${filters.category}`);
      if (filters.status) queryParams.push(`status=${filters.status}`);
      if (filters.search) queryParams.push(`search=${encodeURIComponent(filters.search)}`);
      const queryString = queryParams.length > 0 ? `&${queryParams.join('&')}` : '';
      
      res.render('assets/index', {
        title: '資產管理',
        assets,
        departments,
        categories,
        currentPage: page,
        totalPages,
        limit,
        total: totalAssets,
        queryString,
        user: req.session.user,
        filters: {
          department_id: filters.departmentId,
          category: filters.category,
          status: filters.status,
          search: filters.search
        }
      });
    } catch (error) {
      console.error('Assets index error:', error);
      req.flash('error_msg', '載入資產列表時發生錯誤');
      res.redirect('/');
    }
  },

  // 顯示新增資產表單
  create: async (req, res) => {
    try {
      const departments = await Department.findAll();
      const categories = await Asset.getCategories();
      
      // 如果是部門管理員，只能選擇自己的部門
      let availableDepartments = departments;
      if (req.session.user.role === 'dept_manager') {
        availableDepartments = departments.filter(
          dept => dept.id === req.session.user.department_id
        );
      }
      
      res.render('assets/create', {
        title: '新增資產',
        departments: availableDepartments,
        categories
      });
    } catch (error) {
      console.error('Create asset form error:', error);
      req.flash('error_msg', '載入新增資產表單時發生錯誤');
      res.redirect('/assets');
    }
  },

  // 儲存新資產
  store: async (req, res) => {
    try {
      const { name, category, department_id, status } = req.body;
      
      // 驗證輸入
      if (!name || !category || !department_id) {
        req.flash('error_msg', '請填寫所有必填欄位');
        return res.redirect('/assets/create');
      }
      
      // 如果是部門管理員，只能新增到自己部門
      if (req.session.user.role === 'dept_manager') {
        if (parseInt(department_id) !== req.session.user.department_id) {
          req.flash('error_msg', '您只能新增資產到自己的部門');
          return res.redirect('/assets/create');
        }
      }
      
      const assetData = {
        name,
        category,
        departmentId: department_id,
        status: status || 'active'
      };
      
      const result = await Asset.create(assetData);
      
      req.flash('success_msg', '資產新增成功');
      res.redirect(`/assets/${result.id}`);
    } catch (error) {
      console.error('Store asset error:', error);
      req.flash('error_msg', '新增資產時發生錯誤');
      res.redirect('/assets/create');
    }
  },

  // 顯示單一資產
  show: async (req, res) => {
    try {
      const asset = await Asset.findById(req.params.id);
      
      if (!asset) {
        req.flash('error_msg', '資產不存在');
        return res.redirect('/assets');
      }
      
      res.render('assets/show', {
        title: `資產: ${asset.name}`,
        asset,
        appUrl: process.env.APP_URL || 'http://localhost:3000'
      });
    } catch (error) {
      console.error('Show asset error:', error);
      req.flash('error_msg', '載入資產詳細資訊時發生錯誤');
      res.redirect('/assets');
    }
  },

  // 顯示編輯資產表單
  edit: async (req, res) => {
    try {
      const asset = await Asset.findById(req.params.id);
      
      if (!asset) {
        req.flash('error_msg', '資產不存在');
        return res.redirect('/assets');
      }
      
      const departments = await Department.findAll();
      const categories = await Asset.getCategories();
      
      // 如果是部門管理員，只能選擇自己的部門
      let availableDepartments = departments;
      if (req.session.user.role === 'dept_manager') {
        availableDepartments = departments.filter(
          dept => dept.id === req.session.user.department_id
        );
      }
      
      res.render('assets/edit', {
        title: `編輯資產: ${asset.name}`,
        asset,
        departments: availableDepartments,
        categories
      });
    } catch (error) {
      console.error('Edit asset form error:', error);
      req.flash('error_msg', '載入編輯資產表單時發生錯誤');
      res.redirect('/assets');
    }
  },

  // 更新資產
  update: async (req, res) => {
    try {
      const { name, category, department_id, status } = req.body;
      const assetId = req.params.id;
      
      // 驗證輸入
      if (!name || !category || !department_id) {
        req.flash('error_msg', '請填寫所有必填欄位');
        return res.redirect(`/assets/${assetId}/edit`);
      }
      
      // 如果是部門管理員，只能更新到自己部門
      if (req.session.user.role === 'dept_manager') {
        if (parseInt(department_id) !== req.session.user.department_id) {
          req.flash('error_msg', '您只能將資產移動到自己的部門');
          return res.redirect(`/assets/${assetId}/edit`);
        }
      }
      
      const assetData = {
        name,
        category,
        departmentId: department_id,
        status: status || 'active'
      };
      
      await Asset.update(assetId, assetData);
      
      req.flash('success_msg', '資產更新成功');
      res.redirect(`/assets/${assetId}`);
    } catch (error) {
      console.error('Update asset error:', error);
      req.flash('error_msg', '更新資產時發生錯誤');
      res.redirect(`/assets/${assetId}/edit`);
    }
  },

  // 刪除資產
  destroy: async (req, res) => {
    try {
      await Asset.delete(req.params.id);
      
      req.flash('success_msg', '資產刪除成功');
      res.redirect('/assets');
    } catch (error) {
      console.error('Delete asset error:', error);
      req.flash('error_msg', '刪除資產時發生錯誤');
      res.redirect('/assets');
    }
  },

  // 顯示資產唯讀頁面（用於 QR Code 掃描）
  view: async (req, res) => {
    try {
      const asset = await Asset.findById(req.params.id);
      
      if (!asset) {
        return res.status(404).render('error', {
          title: '404 - 資產不存在',
          message: '抱歉，您尋找的資產不存在。'
        });
      }
      
      res.render('assets/view', {
        title: `資產: ${asset.name}`,
        asset,
        layout: false // 不使用佈局，適合行動裝置檢視
      });
    } catch (error) {
      console.error('View asset error:', error);
      res.status(500).render('error', {
        title: '500 - 伺服器錯誤',
        message: '抱歉，載入資產資訊時發生錯誤。'
      });
    }
  },

  // 重新生成 QR Code
  regenerateQR: async (req, res) => {
    try {
      const assetId = req.params.id;
      const qrCodeUrl = await Asset.generateQRCode(assetId);
      
      if (qrCodeUrl) {
        await Asset.updateQRCode(assetId, qrCodeUrl);
        req.flash('success_msg', 'QR Code 重新生成成功');
      } else {
        req.flash('error_msg', 'QR Code 生成失敗');
      }
      
      res.redirect(`/assets/${assetId}`);
    } catch (error) {
      console.error('Regenerate QR error:', error);
      req.flash('error_msg', '重新生成 QR Code 時發生錯誤');
      res.redirect(`/assets/${assetId}`);
    }
  },

  // 取得資產統計資料
  stats: async (req, res) => {
    try {
      const departmentStats = await Asset.getDepartmentStats();
      const categoryStats = await Asset.getCategoryStats();
      const recentAssets = await Asset.getRecentAssets(5);
      
      res.render('assets/stats', {
        title: '資產統計',
        departmentStats,
        categoryStats,
        recentAssets
      });
    } catch (error) {
      console.error('Assets stats error:', error);
      req.flash('error_msg', '載入資產統計時發生錯誤');
      res.redirect('/assets');
    }
  }
};

module.exports = assetController;