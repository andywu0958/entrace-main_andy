const AssetCategory = require('../models/AssetCategory');

const assetCategoryController = {
  // 列表頁
  index: async (req, res) => {
    try {
      const categories = await AssetCategory.getAll();
      res.render('assetCategories/index', {
        title: '資產類別管理',
        categories,
        success_msg: req.query.success || '',
        error_msg: req.query.error || ''
      });
    } catch (error) {
      console.error('取得資產類別列表錯誤:', error);
      res.status(500).render('error', {
        title: '錯誤',
        message: '無法取得資產類別列表'
      });
    }
  },

  // 新增頁面
  create: (req, res) => {
    res.render('assetCategories/create', {
      title: '新增資產類別',
      category: {},
      error_msg: ''
    });
  },

  // 新增處理
  store: async (req, res) => {
    try {
      const { code, name, acct_code, acct_name, ad_code, ad_name, dep_code, dep_name, dep_meth, useful_mo, remark } = req.body;

      // 驗證
      if (!code || !code.trim()) {
        return res.render('assetCategories/create', {
          title: '新增資產類別',
          error_msg: '類別代號為必填'
        });
      }

      if (!name || !name.trim()) {
        return res.render('assetCategories/create', {
          title: '新增資產類別',
          error_msg: '類別名稱為必填'
        });
      }

      if (!dep_meth || !dep_meth.trim()) {
        return res.render('assetCategories/create', {
          title: '新增資產類別',
          error_msg: '折舊方法為必填'
        });
      }

      // 檢查代號是否重複
      const codeExists = await AssetCategory.codeExists(code.trim());
      if (codeExists) {
        return res.render('assetCategories/create', {
          title: '新增資產類別',
          error_msg: '此類別代號已存在'
        });
      }

      // 檢查名稱是否重複
      const nameExists = await AssetCategory.nameExists(name.trim());
      if (nameExists) {
        return res.render('assetCategories/create', {
          title: '新增資產類別',
          error_msg: '此類別名稱已存在'
        });
      }

      await AssetCategory.create({
        code: code.trim(),
        name: name.trim(),
        acct_code: acct_code ? acct_code.trim() : null,
        acct_name: acct_name ? acct_name.trim() : null,
        ad_code: ad_code ? ad_code.trim() : null,
        ad_name: ad_name ? ad_name.trim() : null,
        dep_code: dep_code ? dep_code.trim() : null,
        dep_name: dep_name ? dep_name.trim() : null,
        dep_meth: dep_meth ? dep_meth.trim() : null,
        useful_mo: useful_mo ? parseInt(useful_mo) : null,
        remark: remark ? remark.trim() : null
      });

      res.redirect('/asset-categories?success=類別新增成功');
    } catch (error) {
      console.error('新增資產類別錯誤:', error);
      res.render('assetCategories/create', {
        title: '新增資產類別',
        error_msg: '新增失敗，請稍後再試'
      });
    }
  },

  // 檢視頁面
  show: async (req, res) => {
    try {
      const category = await AssetCategory.getById(req.params.code);
      if (!category) {
        return res.status(404).render('error', {
          title: '錯誤',
          message: '找不到此類別'
        });
      }

      res.render('assetCategories/show', {
        title: `類別：${category.name}`,
        category,
        success_msg: req.query.success || '',
        error_msg: req.query.error || ''
      });
    } catch (error) {
      console.error('檢視資產類別錯誤:', error);
      res.status(500).render('error', {
        title: '錯誤',
        message: '無法取得類別資訊'
      });
    }
  },

  // 編輯頁面
  edit: async (req, res) => {
    try {
      const category = await AssetCategory.getById(req.params.code);
      if (!category) {
        return res.status(404).render('error', {
          title: '錯誤',
          message: '找不到此類別'
        });
      }

      res.render('assetCategories/edit', {
        title: `編輯類別：${category.name}`,
        category,
        error_msg: ''
      });
    } catch (error) {
      console.error('編輯資產類別錯誤:', error);
      res.status(500).render('error', {
        title: '錯誤',
        message: '無法取得類別資訊'
      });
    }
  },

  // 更新處理
  update: async (req, res) => {
    try {
      const { name, acct_code, acct_name, ad_code, ad_name, dep_code, dep_name, dep_meth, useful_mo, remark } = req.body;
      const categoryCode = req.params.code;

      // 驗證
      if (!name || !name.trim()) {
        const category = await AssetCategory.getById(categoryCode);
        return res.render('assetCategories/edit', {
          title: `編輯類別：${category.name}`,
          category,
          error_msg: '類別名稱為必填'
        });
      }

      // 檢查名稱是否重複（排除自己）
      const nameExists = await AssetCategory.nameExists(name.trim(), categoryCode);
      if (nameExists) {
        const category = await AssetCategory.getById(categoryCode);
        return res.render('assetCategories/edit', {
          title: `編輯類別：${category.name}`,
          category,
          error_msg: '此類別名稱已存在'
        });
      }

      await AssetCategory.update(categoryCode, {
        name: name.trim(),
        acct_code: acct_code ? acct_code.trim() : null,
        acct_name: acct_name ? acct_name.trim() : null,
        ad_code: ad_code ? ad_code.trim() : null,
        ad_name: ad_name ? ad_name.trim() : null,
        dep_code: dep_code ? dep_code.trim() : null,
        dep_name: dep_name ? dep_name.trim() : null,
        dep_meth: dep_meth ? dep_meth.trim() : null,
        useful_mo: useful_mo ? parseInt(useful_mo) : null,
        remark: remark ? remark.trim() : null
      });

      res.redirect(`/asset-categories/${categoryCode}?success=類別更新成功`);
    } catch (error) {
      console.error('更新資產類別錯誤:', error);
      const category = await AssetCategory.getById(req.params.code);
      res.render('assetCategories/edit', {
        title: `編輯類別：${category.name}`,
        category,
        error_msg: '更新失敗，請稍後再試'
      });
    }
  },

  // 刪除處理
  destroy: async (req, res) => {
    try {
      const categoryCode = req.params.code;

      // 檢查類別是否存在
      const category = await AssetCategory.getById(categoryCode);
      if (!category) {
        return res.redirect('/asset-categories?error=找不到此類別');
      }

      // 檢查該類別下是否有資產
      const assetCount = await AssetCategory.getAssetCount(categoryCode);
      if (assetCount > 0) {
        return res.redirect(`/asset-categories?error=此類別下還有 ${assetCount} 項資產，無法刪除`);
      }

      await AssetCategory.delete(categoryCode);
      res.redirect('/asset-categories?success=類別刪除成功');
    } catch (error) {
      console.error('刪除資產類別錯誤:', error);
      res.redirect('/asset-categories?error=刪除失敗，請稍後再試');
    }
  },

  // 搜尋處理
  search: async (req, res) => {
    try {
      const { code, name, acct_code } = req.query;
      let categories = [];

      if (code || name || acct_code) {
        categories = await AssetCategory.search({
          code: code ? code.trim() : '',
          name: name ? name.trim() : '',
          acct_code: acct_code ? acct_code.trim() : ''
        });
      }

      res.render('assetCategories/search', {
        title: '搜尋資產類別',
        categories,
        query: {
          code: code || '',
          name: name || '',
          acct_code: acct_code || ''
        },
        searched: !!(code || name || acct_code)
      });
    } catch (error) {
      console.error('搜尋資產類別錯誤:', error);
      res.status(500).render('error', {
        title: '錯誤',
        message: '搜尋失敗，請稍後再試'
      });
    }
  }
};

module.exports = assetCategoryController;
