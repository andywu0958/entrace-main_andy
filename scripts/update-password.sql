USE pm;
GO

-- 更新管理員密碼為正確的雜湊值
UPDATE users 
SET password = '$2b$10$nvDRbpkwiN8nUcEEz3FxSOx4w0vgBa26yEYTdy4J7mrSeH5Lc7Um.'
WHERE username = 'admin';

PRINT '密碼已更新成功！';