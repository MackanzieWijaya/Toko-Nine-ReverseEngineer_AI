-- Fictional development seed data. Passwords are disposable local accounts.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO users(name,email,password_hash,role) VALUES
('Ayu Pratama','owner@tokobuah.local',crypt('BuahSegar123!',gen_salt('bf')),'owner'),
('Budi Santoso','kasir@tokobuah.local',crypt('BuahSegar123!',gen_salt('bf')),'cashier')
ON CONFLICT(email) DO NOTHING;
INSERT INTO products(name,category,unit,price,cost,stock,min_stock) VALUES
('Alpukat Mentega','lokal','kg',28000,18000,24,8),('Anggur Hijau','impor','kg',68000,49000,7,8),
('Apel Fuji','impor','kg',42000,30000,19,7),('Buah Naga Merah','lokal','kg',22000,14000,16,6),
('Jambu Kristal','lokal','kg',18000,11000,14,5),('Jeruk Mandarin','impor','kg',48000,34000,11,6),
('Jeruk Medan','lokal','kg',24000,15000,21,8),('Kiwi Hijau','impor','pcs',12000,8000,18,6),
('Mangga Harum Manis','lokal','kg',32000,21000,12,5),('Melon','lokal','kg',19000,12000,9,4),
('Nanas Madu','lokal','pcs',16000,9500,13,5),('Pepaya California','lokal','kg',14000,8500,20,6),
('Pir Century','impor','kg',39000,27000,6,7),('Pisang Cavendish','lokal','pack',25000,17000,15,5),
('Salak Pondoh','lokal','kg',17000,10000,18,6),('Semangka','lokal','kg',12000,7000,22,8),
('Stroberi','impor','pack',35000,24000,5,6)
ON CONFLICT DO NOTHING;
-- Opening stock movements plus fictional recent sales keep seed inventory auditable.
INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,note)
SELECT p.id,u.id,'Barang Masuk',p.stock + CASE p.name WHEN 'Alpukat Mentega' THEN 2 WHEN 'Kiwi Hijau' THEN 4 WHEN 'Apel Fuji' THEN 1 WHEN 'Mangga Harum Manis' THEN 1.5 ELSE 0 END,'seed','Stok awal fiktif'
FROM products p CROSS JOIN users u WHERE u.email='owner@tokobuah.local';
INSERT INTO sales(receipt_no,cashier_id,subtotal,discount,total,payment_method,amount_received,change_amount,created_at)
SELECT 'TBS-SEED-001',id,104000,4000,100000,'Tunai',100000,0,now()-interval '2 hours' FROM users WHERE email='kasir@tokobuah.local'
ON CONFLICT(receipt_no) DO NOTHING;
INSERT INTO sale_items(sale_id,product_id,product_name,unit,quantity,unit_price,unit_cost,line_total)
SELECT s.id,p.id,p.name,p.unit,2,p.price,p.cost,56000 FROM sales s JOIN products p ON p.name='Alpukat Mentega' WHERE s.receipt_no='TBS-SEED-001'
UNION ALL SELECT s.id,p.id,p.name,p.unit,4,p.price,p.cost,48000 FROM sales s JOIN products p ON p.name='Kiwi Hijau' WHERE s.receipt_no='TBS-SEED-001';
UPDATE products SET stock=stock-2 WHERE name='Alpukat Mentega';
UPDATE products SET stock=stock-4 WHERE name='Kiwi Hijau';
INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note)
SELECT p.id,s.cashier_id,'Penjualan',CASE p.name WHEN 'Alpukat Mentega' THEN -2 ELSE -4 END,'sale',s.id,'Seed transaksi fiktif'
FROM sales s JOIN products p ON p.name IN ('Alpukat Mentega','Kiwi Hijau') WHERE s.receipt_no='TBS-SEED-001';
INSERT INTO sales(receipt_no,cashier_id,subtotal,discount,total,payment_method,amount_received,change_amount,created_at)
SELECT 'TBS-SEED-002',id,42000,0,42000,'QRIS',42000,0,now()-interval '3 days' FROM users WHERE email='owner@tokobuah.local'
ON CONFLICT(receipt_no) DO NOTHING;
INSERT INTO sale_items(sale_id,product_id,product_name,unit,quantity,unit_price,unit_cost,line_total)
SELECT s.id,p.id,p.name,p.unit,1,p.price,p.cost,42000 FROM sales s JOIN products p ON p.name='Apel Fuji' WHERE s.receipt_no='TBS-SEED-002';
UPDATE products SET stock=stock-1 WHERE name='Apel Fuji';
INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note)
SELECT p.id,s.cashier_id,'Penjualan',-1,'sale',s.id,'Seed transaksi fiktif' FROM sales s JOIN products p ON p.name='Apel Fuji' WHERE s.receipt_no='TBS-SEED-002';
INSERT INTO sales(receipt_no,cashier_id,subtotal,discount,total,payment_method,amount_received,change_amount,created_at)
SELECT 'TBS-SEED-003',id,48000,3000,45000,'Transfer',45000,0,now()-interval '6 days' FROM users WHERE email='kasir@tokobuah.local'
ON CONFLICT(receipt_no) DO NOTHING;
INSERT INTO sale_items(sale_id,product_id,product_name,unit,quantity,unit_price,unit_cost,line_total)
SELECT s.id,p.id,p.name,p.unit,1.5,p.price,p.cost,48000 FROM sales s JOIN products p ON p.name='Mangga Harum Manis' WHERE s.receipt_no='TBS-SEED-003';
UPDATE products SET stock=stock-1.5 WHERE name='Mangga Harum Manis';
INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note)
SELECT p.id,s.cashier_id,'Penjualan',-1.5,'sale',s.id,'Seed transaksi fiktif' FROM sales s JOIN products p ON p.name='Mangga Harum Manis' WHERE s.receipt_no='TBS-SEED-003';
INSERT INTO sales(receipt_no,cashier_id,subtotal,discount,total,payment_method,amount_received,change_amount,status,cancel_reason,cancelled_at,created_at)
SELECT 'TBS-SEED-004',id,68000,0,68000,'Tunai',70000,2000,'cancelled','Contoh pembatalan seed',now()-interval '1 hour',now()-interval '1 hour' FROM users WHERE email='kasir@tokobuah.local'
ON CONFLICT(receipt_no) DO NOTHING;
INSERT INTO sale_items(sale_id,product_id,product_name,unit,quantity,unit_price,unit_cost,line_total)
SELECT s.id,p.id,p.name,p.unit,1,p.price,p.cost,68000 FROM sales s JOIN products p ON p.name='Anggur Hijau' WHERE s.receipt_no='TBS-SEED-004';
INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note)
SELECT p.id,s.cashier_id,'Penjualan',-1,'sale',s.id,'Seed transaksi fiktif dibatalkan' FROM sales s JOIN products p ON p.name='Anggur Hijau' WHERE s.receipt_no='TBS-SEED-004';
INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note)
SELECT p.id,s.cashier_id,'Pembatalan Transaksi',1,'sale',s.id,'Pemulihan seed transaksi dibatalkan' FROM sales s JOIN products p ON p.name='Anggur Hijau' WHERE s.receipt_no='TBS-SEED-004';
INSERT INTO suppliers(name,phone) SELECT 'Kebun Segar Nusantara','0812-0000-1234' WHERE NOT EXISTS (SELECT 1 FROM suppliers);
