import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { pool, inTransaction } from './db.js';
import { auth, ownerOnly, issueToken } from './auth.js';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
const api = express.Router();
const num = (v) => Number(v);
const bad = (res, msg, status = 400) => res.status(status).json({ error: msg });
const positive = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
const nonnegative = (v) => Number.isFinite(Number(v)) && Number(v) >= 0;
const id = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
const validDate = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const safeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
});

api.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return bad(res, 'Email dan password wajib diisi.');
    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email)=lower($1)', [
      String(email).trim(),
    ]);
    const user = rows[0];
    if (!user || !user.active || !(await bcrypt.compare(String(password), user.password_hash)))
      return bad(res, 'Email atau password tidak sesuai.', 401);
    res.cookie('toko_session', issueToken(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ user: safeUser(user) });
  } catch (e) {
    next(e);
  }
});
api.post('/auth/logout', (req, res) => {
  res.clearCookie('toko_session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  });
  res.json({ ok: true });
});
api.get('/auth/saya', auth, (req, res) =>
  res.json({
    user: req.user,
    store: {
      name: process.env.STORE_NAME || 'Toko Buah Segar',
      address: process.env.STORE_ADDRESS || 'Jl. Buah Segar No. 12, Jakarta',
    },
  }),
);

api.get('/produk', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM products ${req.query.all === 'true' && req.user.role === 'owner' ? '' : 'WHERE active=true'} ORDER BY name`,
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});
api.post('/produk', auth, ownerOnly, async (req, res, next) => {
  try {
    const { name, category, unit, price, cost, min_stock, active = true } = req.body || {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      !['lokal', 'impor'].includes(category) ||
      !['kg', 'pcs', 'pack'].includes(unit) ||
      ![price, cost, min_stock].every(nonnegative)
    )
      return bad(res, 'Data produk belum valid.');
    const { rows } = await pool.query(
      'INSERT INTO products(name,category,unit,price,cost,min_stock,active) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name.trim(), category, unit, price, cost, min_stock, Boolean(active)],
    );
    res.status(201).json({ data: rows[0] });
  } catch (e) {
    next(e);
  }
});
api.patch('/produk/:id', auth, ownerOnly, async (req, res, next) => {
  try {
    const pid = req.params.id;
    if (!id(pid)) return bad(res, 'Produk tidak ditemukan.', 404);
    const { name, category, unit, price, cost, min_stock, active } = req.body || {};
    if (
      (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
      (category !== undefined && !['lokal', 'impor'].includes(category)) ||
      (unit !== undefined && !['kg', 'pcs', 'pack'].includes(unit)) ||
      ['price', 'cost', 'min_stock'].some(
        (k) => req.body[k] !== undefined && !nonnegative(req.body[k]),
      ) ||
      (active !== undefined && typeof active !== 'boolean')
    )
      return bad(res, 'Data produk belum valid.');
    const { rows } = await pool.query(
      `UPDATE products SET name=COALESCE($2,name),category=COALESCE($3,category),unit=COALESCE($4,unit),price=COALESCE($5,price),cost=COALESCE($6,cost),min_stock=COALESCE($7,min_stock),active=COALESCE($8,active) WHERE id=$1 RETURNING *`,
      [pid, name?.trim(), category, unit, price, cost, min_stock, active],
    );
    if (!rows[0]) return bad(res, 'Produk tidak ditemukan.', 404);
    res.json({ data: rows[0] });
  } catch (e) {
    next(e);
  }
});

async function saleDetails(client, saleId) {
  const { rows } = await client.query(
    `SELECT s.*,u.name cashier_name FROM sales s JOIN users u ON u.id=s.cashier_id WHERE s.id=$1`,
    [saleId],
  );
  if (!rows[0]) return null;
  const items = await client.query('SELECT * FROM sale_items WHERE sale_id=$1 ORDER BY id', [
    saleId,
  ]);
  return {
    ...rows[0],
    items: items.rows,
    store: {
      name: process.env.STORE_NAME || 'Toko Buah Segar',
      address: process.env.STORE_ADDRESS || 'Jl. Buah Segar No. 12, Jakarta',
    },
  };
}
api.post('/penjualan', auth, async (req, res, next) => {
  try {
    const {
      items,
      payment_method,
      amount_received,
      discount = 0,
      idempotency_key,
    } = req.body || {};
    if (!Array.isArray(items) || items.length === 0 || items.length > 100)
      return bad(res, 'Keranjang belum berisi barang.');
    if (!['Tunai', 'QRIS', 'Transfer'].includes(payment_method) || !nonnegative(discount))
      return bad(res, 'Metode pembayaran atau diskon tidak valid.');
    if (
      typeof idempotency_key !== 'string' ||
      !idempotency_key.trim() ||
      idempotency_key.length > 100
    )
      return bad(res, 'Kunci transaksi tidak valid.');
    const detail = await inTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [String(idempotency_key)]);
      const existing = await client.query('SELECT id FROM sales WHERE idempotency_key=$1', [
        idempotency_key,
      ]);
      if (existing.rows[0]) return saleDetails(client, existing.rows[0].id);
      const quantities = new Map();
      for (const item of items) {
        if (!id(item.product_id) || !positive(item.quantity))
          throw Object.assign(new Error('Produk atau jumlah tidak valid.'), { status: 400 });
        quantities.set(
          Number(item.product_id),
          (quantities.get(Number(item.product_id)) || 0) + Number(item.quantity),
        );
      }
      const ids = [...quantities.keys()].sort((a, b) => a - b);
      const { rows: products } = await client.query(
        'SELECT * FROM products WHERE id=ANY($1::int[]) AND active=true ORDER BY id FOR UPDATE',
        [ids],
      );
      if (products.length !== ids.length)
        throw Object.assign(new Error('Ada produk yang tidak tersedia.'), { status: 400 });
      let subtotal = 0;
      for (const p of products) {
        const q = quantities.get(p.id);
        if (num(p.stock) < q)
          throw Object.assign(new Error(`Stok ${p.name} tidak mencukupi.`), { status: 409 });
        subtotal += num(p.price) * q;
      }
      subtotal = Math.round(subtotal * 100) / 100;
      if (Number(discount) > subtotal)
        throw Object.assign(new Error('Diskon tidak boleh melebihi subtotal.'), { status: 400 });
      const total = Math.round((subtotal - Number(discount)) * 100) / 100,
        received = payment_method === 'Tunai' ? Number(amount_received) : total;
      if (!Number.isFinite(received) || received < total)
        throw Object.assign(new Error('Jumlah pembayaran kurang dari total.'), { status: 400 });
      const receipt = `TBS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const sale = await client.query(
        `INSERT INTO sales(receipt_no,cashier_id,subtotal,discount,total,payment_method,amount_received,change_amount,idempotency_key)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          receipt,
          req.user.id,
          subtotal,
          discount,
          total,
          payment_method,
          received,
          Math.max(0, received - total),
          idempotency_key,
        ],
      );
      for (const p of products) {
        const q = quantities.get(p.id),
          line = Math.round(num(p.price) * q * 100) / 100;
        await client.query(
          'INSERT INTO sale_items(sale_id,product_id,product_name,unit,quantity,unit_price,unit_cost,line_total) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
          [sale.rows[0].id, p.id, p.name, p.unit, q, p.price, p.cost, line],
        );
        await client.query('UPDATE products SET stock=stock-$2 WHERE id=$1', [p.id, q]);
        await client.query(
          "INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id) VALUES($1,$2,'Penjualan',$3,'sale',$4)",
          [p.id, req.user.id, -q, sale.rows[0].id],
        );
      }
      return saleDetails(client, sale.rows[0].id);
    });
    res.status(201).json({ data: detail });
  } catch (e) {
    next(e);
  }
});
api.get('/penjualan', auth, async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const filters = [],
      vals = [];
    if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to))
      return bad(res, 'Rentang tanggal tidak valid.');
    if (from) {
      vals.push(from);
      filters.push(`s.created_at >= $${vals.length}::date`);
    }
    if (to) {
      vals.push(to);
      filters.push(`s.created_at < ($${vals.length}::date + interval '1 day')`);
    }
    if (status === 'completed' || status === 'cancelled') {
      vals.push(status);
      filters.push(`s.status=$${vals.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT s.*,u.name cashier_name FROM sales s JOIN users u ON u.id=s.cashier_id ${where} ORDER BY s.created_at DESC LIMIT 300`,
      vals,
    );
    const summaryFilters = [],
      summaryVals = [];
    if (from) {
      summaryVals.push(from);
      summaryFilters.push(`s.created_at >= $${summaryVals.length}::date`);
    }
    if (to) {
      summaryVals.push(to);
      summaryFilters.push(`s.created_at < ($${summaryVals.length}::date + interval '1 day')`);
    }
    const summaryWhere = summaryFilters.length
      ? `WHERE ${summaryFilters.join(' AND ')} AND s.status='completed'`
      : `WHERE s.status='completed'`;
    const sum = await pool.query(
      `SELECT count(*)::int transactions,COALESCE(sum(total),0) total_sales FROM sales s ${summaryWhere}`,
      summaryVals,
    );
    res.json({ data: rows, summary: sum.rows[0] });
  } catch (e) {
    next(e);
  }
});
api.get('/penjualan/:id', auth, async (req, res, next) => {
  try {
    if (!id(req.params.id)) return bad(res, 'Transaksi tidak ditemukan.', 404);
    const detail = await saleDetails(pool, req.params.id);
    if (!detail) return bad(res, 'Transaksi tidak ditemukan.', 404);
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});
api.post('/penjualan/:id/batal', auth, async (req, res, next) => {
  try {
    if (!id(req.params.id)) return bad(res, 'Transaksi tidak ditemukan.', 404);
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return bad(res, 'Alasan pembatalan wajib diisi.');
    const result = await inTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM sales WHERE id=$1 FOR UPDATE', [
        req.params.id,
      ]);
      const sale = rows[0];
      if (!sale) throw Object.assign(new Error('Transaksi tidak ditemukan.'), { status: 404 });
      if (sale.status === 'cancelled')
        throw Object.assign(new Error('Transaksi ini sudah dibatalkan.'), { status: 409 });
      const { rows: items } = await client.query(
        'SELECT * FROM sale_items WHERE sale_id=$1 ORDER BY product_id',
        [sale.id],
      );
      for (const item of items) {
        await client.query('UPDATE products SET stock=stock+$2 WHERE id=$1', [
          item.product_id,
          item.quantity,
        ]);
        await client.query(
          "INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note) VALUES($1,$2,'Pembatalan Transaksi',$3,'sale',$4,$5)",
          [item.product_id, req.user.id, item.quantity, sale.id, reason],
        );
      }
      await client.query(
        "UPDATE sales SET status='cancelled',cancel_reason=$2,cancelled_at=now() WHERE id=$1",
        [sale.id, reason],
      );
      return saleDetails(client, sale.id);
    });
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

api.get('/supplier', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM suppliers ORDER BY name');
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});
api.post('/supplier', auth, ownerOnly, async (req, res, next) => {
  try {
    const { name, phone } = req.body || {};
    if (!name?.trim() || !phone?.trim()) return bad(res, 'Nama dan telepon supplier wajib diisi.');
    const { rows } = await pool.query(
      'INSERT INTO suppliers(name,phone) VALUES($1,$2) RETURNING *',
      [name.trim(), phone.trim()],
    );
    res.status(201).json({ data: rows[0] });
  } catch (e) {
    next(e);
  }
});
api.get('/stok', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY name');
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});
api.get('/stok/pergerakan', auth, async (req, res, next) => {
  try {
    const vals = [],
      where = [];
    if (req.query.product_id) {
      if (!id(req.query.product_id)) return bad(res, 'Produk tidak ditemukan.', 404);
      vals.push(req.query.product_id);
      where.push(`m.product_id=$${vals.length}`);
    }
    const { rows } = await pool.query(
      `SELECT m.*,p.name product_name,p.unit,u.name user_name FROM stock_movements m JOIN products p ON p.id=m.product_id LEFT JOIN users u ON u.id=m.user_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY m.created_at DESC LIMIT 60`,
      vals,
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});
api.post('/stok-masuk', auth, async (req, res, next) => {
  try {
    const { supplier_id, date, notes, items } = req.body || {};
    if (
      !Array.isArray(items) ||
      !items.length ||
      items.some((x) => !id(x.product_id) || !positive(x.quantity) || !nonnegative(x.unit_cost))
    )
      return bad(res, 'Barang masuk belum lengkap.');
    const data = await inTransaction(async (client) => {
      const receipt = await client.query(
        'INSERT INTO stock_receipts(supplier_id,user_id,receipt_date,notes,total) VALUES($1,$2,COALESCE($3::date,CURRENT_DATE),$4,0) RETURNING *',
        [supplier_id || null, req.user.id, date || null, notes || null],
      );
      let total = 0;
      for (const item of items) {
        const { rows: p } = await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [
          item.product_id,
        ]);
        if (!p[0]) throw Object.assign(new Error('Produk tidak ditemukan.'), { status: 404 });
        const q = Number(item.quantity),
          cost = Number(item.unit_cost),
          line = q * cost;
        total += line;
        await client.query(
          'INSERT INTO stock_receipt_items(receipt_id,product_id,quantity,unit_cost,line_total) VALUES($1,$2,$3,$4,$5)',
          [receipt.rows[0].id, item.product_id, q, cost, line],
        );
        await client.query('UPDATE products SET stock=stock+$2,cost=$3 WHERE id=$1', [
          item.product_id,
          q,
          cost,
        ]);
        await client.query(
          "INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id) VALUES($1,$2,'Barang Masuk',$3,'stock_receipt',$4)",
          [item.product_id, req.user.id, q, receipt.rows[0].id],
        );
      }
      await client.query('UPDATE stock_receipts SET total=$2 WHERE id=$1', [
        receipt.rows[0].id,
        total,
      ]);
      return { ...receipt.rows[0], total };
    });
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});
api.get('/stok-masuk', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,s.name supplier_name,u.name user_name, count(i.id)::int item_count, string_agg(p.name||' × '||i.quantity||' '||p.unit, ', ' ORDER BY p.name) items_label FROM stock_receipts r LEFT JOIN suppliers s ON s.id=r.supplier_id JOIN users u ON u.id=r.user_id JOIN stock_receipt_items i ON i.receipt_id=r.id JOIN products p ON p.id=i.product_id GROUP BY r.id,s.name,u.name ORDER BY r.created_at DESC LIMIT 100`,
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});
api.post('/susut', auth, async (req, res, next) => {
  try {
    const { product_id, quantity, reason, notes } = req.body || {};
    const reasons = ['Busuk', 'Rusak', 'Sampel / Dicicipi', 'Hilang', 'Lainnya'];
    if (!id(product_id) || !positive(quantity) || !reasons.includes(reason))
      return bad(res, 'Data susut belum valid.');
    const data = await inTransaction(async (client) => {
      const { rows } = await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [
        product_id,
      ]);
      if (!rows[0]) throw Object.assign(new Error('Produk tidak ditemukan.'), { status: 404 });
      if (Number(rows[0].stock) < Number(quantity))
        throw Object.assign(new Error('Stok tidak mencukupi.'), { status: 409 });
      const { rows: r } = await client.query(
        'INSERT INTO spoilage_records(product_id,user_id,quantity,unit_cost,reason,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
        [product_id, req.user.id, quantity, rows[0].cost, reason, notes || null],
      );
      await client.query('UPDATE products SET stock=stock-$2 WHERE id=$1', [product_id, quantity]);
      await client.query(
        "INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note) VALUES($1,$2,'Susut',$3,'spoilage',$4,$5)",
        [product_id, req.user.id, -Number(quantity), r[0].id, notes || reason],
      );
      return r[0];
    });
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});
api.get('/susut', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT s.*,p.name product_name,p.unit,u.name user_name FROM spoilage_records s JOIN products p ON p.id=s.product_id JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 100',
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});
api.post('/opname', auth, async (req, res, next) => {
  try {
    const { items, notes } = req.body || {};
    if (
      !Array.isArray(items) ||
      !items.length ||
      items.some((x) => !id(x.product_id) || !nonnegative(x.physical_stock)) ||
      new Set(items.map((x) => Number(x.product_id))).size !== items.length
    )
      return bad(res, 'Data stock opname belum valid atau ada buah yang berulang.');
    const result = await inTransaction(async (client) => {
      const opname = await client.query(
        'INSERT INTO stock_opnames(user_id,notes) VALUES($1,$2) RETURNING *',
        [req.user.id, notes || null],
      );
      for (const item of items) {
        const { rows } = await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [
          item.product_id,
        ]);
        if (!rows[0]) throw Object.assign(new Error('Produk tidak ditemukan.'), { status: 404 });
        const system = Number(rows[0].stock),
          physical = Number(item.physical_stock),
          difference = physical - system;
        await client.query(
          'INSERT INTO stock_opname_items(opname_id,product_id,system_stock,physical_stock,difference) VALUES($1,$2,$3,$4,$5)',
          [opname.rows[0].id, item.product_id, system, physical, difference],
        );
        if (difference) {
          await client.query('UPDATE products SET stock=$2 WHERE id=$1', [
            item.product_id,
            physical,
          ]);
          await client.query(
            "INSERT INTO stock_movements(product_id,user_id,movement_type,quantity,reference_type,reference_id,note) VALUES($1,$2,'Stock Opname',$3,'stock_opname',$4,$5)",
            [item.product_id, req.user.id, difference, opname.rows[0].id, notes || null],
          );
        }
      }
      return opname.rows[0];
    });
    res.status(201).json({ data: result });
  } catch (e) {
    next(e);
  }
});
api.get('/opname', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT o.id,i.id item_id,o.created_at,o.notes,u.name user_name,p.name product_name,p.unit,i.system_stock,i.physical_stock,i.difference FROM stock_opnames o JOIN users u ON u.id=o.user_id JOIN stock_opname_items i ON i.opname_id=o.id JOIN products p ON p.id=i.product_id ORDER BY o.created_at DESC,p.name LIMIT 200',
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

api.get('/pengguna', auth, ownerOnly, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at',
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});
api.post('/pengguna', auth, ownerOnly, async (req, res, next) => {
  try {
    const { name, email, password, role = 'cashier' } = req.body || {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof password !== 'string' ||
      password.length < 8 ||
      !['owner', 'cashier'].includes(role)
    )
      return bad(res, 'Nama, email valid, password minimal 8 karakter, dan peran wajib diisi.');
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,active,created_at',
      [name.trim(), email.trim().toLowerCase(), hash, role],
    );
    res.status(201).json({ data: rows[0] });
  } catch (e) {
    if (e.code === '23505') return bad(res, 'Email sudah digunakan.');
    next(e);
  }
});
api.patch('/pengguna/:id', auth, ownerOnly, async (req, res, next) => {
  try {
    const target = Number(req.params.id),
      { name, role, active } = req.body || {};
    if (
      !id(target) ||
      (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
      (role !== undefined && !['owner', 'cashier'].includes(role)) ||
      (active !== undefined && typeof active !== 'boolean')
    )
      return bad(res, 'Data pengguna belum valid.');
    if (target === req.user.id && active === false)
      return bad(res, 'Anda tidak dapat menonaktifkan akun sendiri.');
    const result = await inTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(975310)');
      const { rows } = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [target]);
      if (!rows[0]) throw Object.assign(new Error('Pengguna tidak ditemukan.'), { status: 404 });
      const nextRole = role ?? rows[0].role,
        nextActive = active ?? rows[0].active;
      if (rows[0].role === 'owner' && rows[0].active && (nextRole !== 'owner' || !nextActive)) {
        const count = await client.query(
          "SELECT count(*)::int n FROM users WHERE role='owner' AND active=true",
        );
        if (count.rows[0].n <= 1)
          throw Object.assign(new Error('Setidaknya harus ada satu pemilik aktif.'), {
            status: 409,
          });
      }
      const updated = await client.query(
        'UPDATE users SET name=COALESCE($2,name),role=COALESCE($3,role),active=COALESCE($4,active) WHERE id=$1 RETURNING id,name,email,role,active,created_at',
        [target, name?.trim(), role, active],
      );
      return updated.rows[0];
    });
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

api.get('/laporan', auth, ownerOnly, async (req, res, next) => {
  try {
    const from = req.query.from || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
      to = req.query.to || new Date().toISOString().slice(0, 10);
    if (!validDate(from) || !validDate(to) || from > to)
      return bad(res, 'Rentang tanggal laporan tidak valid.');
    const values = [from, to];
    const daily = await pool.query(
      `WITH sales_day AS (
    SELECT s.created_at::date AS sale_date,count(*)::int AS transactions,sum(s.total) AS sales
    FROM sales s WHERE s.status='completed' AND s.created_at::date BETWEEN $1::date AND $2::date
    GROUP BY s.created_at::date
  ), profit_day AS (
    SELECT s.created_at::date AS sale_date,sum((si.unit_price-si.unit_cost)*si.quantity) AS gross_profit
    FROM sales s JOIN sale_items si ON si.sale_id=s.id
    WHERE s.status='completed' AND s.created_at::date BETWEEN $1::date AND $2::date
    GROUP BY s.created_at::date
  )
  SELECT dates.report_date::date AS report_date,COALESCE(sd.transactions,0)::int AS transactions,
    COALESCE(sd.sales,0) AS sales,COALESCE(pd.gross_profit,0) AS gross_profit
  FROM generate_series($1::timestamp,$2::timestamp,interval '1 day') AS dates(report_date)
  LEFT JOIN sales_day sd ON sd.sale_date=dates.report_date::date
  LEFT JOIN profit_day pd ON pd.sale_date=dates.report_date::date
  ORDER BY dates.report_date`,
      values,
    );
    const cards = await pool.query(
      `WITH sales_sum AS (SELECT COALESCE(sum(total),0) sales,count(*)::int transactions FROM sales WHERE status='completed' AND created_at::date BETWEEN $1::date AND $2::date), profit_sum AS (SELECT COALESCE(sum((si.unit_price-si.unit_cost)*si.quantity),0) gross_profit FROM sales s JOIN sale_items si ON si.sale_id=s.id WHERE s.status='completed' AND s.created_at::date BETWEEN $1::date AND $2::date), spoil_sum AS (SELECT COALESCE(sum(sp.quantity*sp.unit_cost),0) spoilage_cost FROM spoilage_records sp WHERE sp.created_at::date BETWEEN $1::date AND $2::date) SELECT * FROM sales_sum,profit_sum,spoil_sum`,
      values,
    );
    const periodDays =
      Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
    const previousTo = new Date(Date.parse(`${from}T00:00:00Z`) - 86400000)
      .toISOString()
      .slice(0, 10);
    const previousFrom = new Date(Date.parse(`${from}T00:00:00Z`) - periodDays * 86400000)
      .toISOString()
      .slice(0, 10);
    const previous = await pool.query(
      "SELECT COALESCE(sum(total),0) sales FROM sales WHERE status='completed' AND created_at::date BETWEEN $1::date AND $2::date",
      [previousFrom, previousTo],
    );
    const best = await pool.query(
      `SELECT si.product_name name,si.unit,sum(si.quantity) quantity,sum(si.line_total) sales FROM sales s JOIN sale_items si ON si.sale_id=s.id WHERE s.status='completed' AND s.created_at::date BETWEEN $1::date AND $2::date GROUP BY si.product_name,si.unit ORDER BY sales DESC LIMIT 8`,
      values,
    );
    const payments = await pool.query(
      `SELECT payment_method method,count(*)::int transactions,sum(total) total FROM sales WHERE status='completed' AND created_at::date BETWEEN $1::date AND $2::date GROUP BY payment_method ORDER BY payment_method`,
      values,
    );
    const low = await pool.query(
      'SELECT id,name,stock,min_stock,unit FROM products WHERE active=true AND stock<=min_stock ORDER BY CASE WHEN min_stock>0 THEN stock/min_stock END NULLS LAST,name',
    );
    const c = cards.rows[0],
      previousSales = num(previous.rows[0].sales),
      sales = num(c.sales);
    res.json({
      data: {
        from,
        to,
        summary: {
          sales,
          gross_profit: num(c.gross_profit),
          transactions: c.transactions,
          after_spoilage: num(c.gross_profit) - num(c.spoilage_cost),
          spoilage_cost: num(c.spoilage_cost),
          previous_sales: previousSales,
          sales_change_percent: previousSales
            ? Math.round(((sales - previousSales) / previousSales) * 1000) / 10
            : null,
        },
        daily: daily.rows.map((x) => ({
          date: x.report_date,
          sales: num(x.sales),
          gross_profit: num(x.gross_profit),
          transactions: x.transactions,
        })),
        best_sellers: best.rows,
        payments: payments.rows,
        low_stock: low.rows,
      },
    });
  } catch (e) {
    next(e);
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.status ? err.message : 'Terjadi kesalahan pada server.' });
});
export { app };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`Toko Buah API listening on ${port}`));
}
