const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// 建立 Express 應用程式
const app = express();
const PORT = process.env.PORT || 3000;

// 資料庫連線（不強制要求，允許使用模擬資料庫）
try {
  require('./config/database');
  console.log('Database module loaded');
} catch (error) {
  console.log('Database module loaded with mock data');
}

// 設定視圖引擎
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// 中介軟體
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session 設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24小時
  }
}));

// Flash 訊息
app.use(flash());

// 全域變數
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.user || null;
  next();
});

// 路由
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/assets', require('./routes/assets'));
app.use('/departments', require('./routes/departments'));
app.use('/api', require('./routes/api'));

// 404 錯誤處理
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - 頁面不存在',
    message: '抱歉，您尋找的頁面不存在。'
  });
});

// 錯誤處理中介軟體
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500 - 伺服器錯誤',
    message: '抱歉，伺服器發生錯誤。'
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
});