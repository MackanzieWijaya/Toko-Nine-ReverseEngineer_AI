import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

test(
  'sale, idempotency, cancellation and inventory adjustments are atomic',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'integration-test-secret-with-sufficient-length';
    const { pool } = await import('../src/db.js');
    const { app } = await import('../src/app.js');
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const marker = `test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let ownerId, cashierId, productId;
    async function request(path, { method = 'GET', body, cookie } = {}) {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(cookie ? { cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
    }
    try {
      const password_hash = await bcrypt.hash('TestPass123!', 4);
      ownerId = (
        await pool.query(
          'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',
          [marker + ' owner', `${marker}@owner.local`, password_hash, 'owner'],
        )
      ).rows[0].id;
      cashierId = (
        await pool.query(
          'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',
          [marker + ' cashier', `${marker}@cashier.local`, password_hash, 'cashier'],
        )
      ).rows[0].id;
      productId = (
        await pool.query(
          "INSERT INTO products(name,category,unit,price,cost,stock,min_stock) VALUES($1,'lokal','kg',100,60,10,2) RETURNING id",
          [marker + ' Alpukat'],
        )
      ).rows[0].id;
      const login = await request('/auth/login', {
        method: 'POST',
        body: { email: `${marker}@owner.local`, password: 'TestPass123!' },
      });
      assert.equal(login.response.status, 200);
      const ownerCookie = login.cookie;
      assert.ok(ownerCookie);
      const salePayload = {
        items: [{ product_id: productId, quantity: 2 }],
        payment_method: 'Tunai',
        amount_received: 500,
        discount: 0,
        idempotency_key: marker,
      };
      const shortPayment = await request('/penjualan', {
        method: 'POST',
        body: { ...salePayload, amount_received: 199, idempotency_key: marker + '-short' },
        cookie: ownerCookie,
      });
      assert.equal(shortPayment.response.status, 400);
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        10,
      );
      const sold = await request('/penjualan', {
        method: 'POST',
        body: salePayload,
        cookie: ownerCookie,
      });
      assert.equal(sold.response.status, 201);
      assert.equal(Number(sold.data.data.total), 200);
      assert.equal(Number(sold.data.data.change_amount), 300);
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        8,
      );
      const duplicate = await request('/penjualan', {
        method: 'POST',
        body: salePayload,
        cookie: ownerCookie,
      });
      assert.equal(duplicate.data.data.id, sold.data.data.id);
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        8,
      );
      const cancelled = await request(`/penjualan/${sold.data.data.id}/batal`, {
        method: 'POST',
        body: { reason: 'Tes pembatalan' },
        cookie: ownerCookie,
      });
      assert.equal(cancelled.response.status, 200);
      assert.equal(cancelled.data.data.status, 'cancelled');
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        10,
      );
      const again = await request(`/penjualan/${sold.data.data.id}/batal`, {
        method: 'POST',
        body: { reason: 'Tidak boleh dua kali' },
        cookie: ownerCookie,
      });
      assert.equal(again.response.status, 409);
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        10,
      );
      const incoming = await request('/stok-masuk', {
        method: 'POST',
        body: { items: [{ product_id: productId, quantity: 3, unit_cost: 50 }] },
        cookie: ownerCookie,
      });
      assert.equal(incoming.response.status, 201);
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        13,
      );
      const spoil = await request('/susut', {
        method: 'POST',
        body: { product_id: productId, quantity: 1, reason: 'Busuk' },
        cookie: ownerCookie,
      });
      assert.equal(spoil.response.status, 201);
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        12,
      );
      const opname = await request('/opname', {
        method: 'POST',
        body: { items: [{ product_id: productId, physical_stock: 9.5 }] },
        cookie: ownerCookie,
      });
      assert.equal(opname.response.status, 201);
      assert.equal(
        Number(
          (await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock,
        ),
        9.5,
      );
      const movements = (
        await pool.query(
          'SELECT movement_type,quantity FROM stock_movements WHERE product_id=$1 ORDER BY id',
          [productId],
        )
      ).rows;
      assert.deepEqual(
        movements.map((m) => m.movement_type),
        ['Penjualan', 'Pembatalan Transaksi', 'Barang Masuk', 'Susut', 'Stock Opname'],
      );
      assert.deepEqual(
        movements.map((m) => Number(m.quantity)),
        [-2, 2, 3, -1, -2.5],
      );
      const reportDate = new Date().toISOString().slice(0, 10);
      const report = await request(`/laporan?from=${reportDate}&to=${reportDate}`, {
        cookie: ownerCookie,
      });
      assert.equal(report.response.status, 200);
      assert.ok(Array.isArray(report.data.data.daily));
      const cashierLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: `${marker}@cashier.local`, password: 'TestPass123!' },
      });
      const denied = await request('/laporan', { cookie: cashierLogin.cookie });
      assert.equal(denied.response.status, 403);
    } finally {
      if (productId) {
        await pool.query('DELETE FROM stock_movements WHERE product_id=$1', [productId]);
        await pool.query('DELETE FROM sale_items WHERE product_id=$1', [productId]);
        await pool.query('DELETE FROM spoilage_records WHERE product_id=$1', [productId]);
        await pool.query('DELETE FROM stock_receipts WHERE user_id=ANY($1::int[])', [
          [ownerId, cashierId].filter(Boolean),
        ]);
        await pool.query('DELETE FROM stock_opnames WHERE user_id=ANY($1::int[])', [
          [ownerId, cashierId].filter(Boolean),
        ]);
        await pool.query('DELETE FROM sales WHERE cashier_id=ANY($1::int[])', [
          [ownerId, cashierId].filter(Boolean),
        ]);
        await pool.query('DELETE FROM products WHERE id=$1', [productId]);
      }
      if (ownerId || cashierId)
        await pool.query('DELETE FROM users WHERE id=ANY($1::int[])', [
          [ownerId, cashierId].filter(Boolean),
        ]);
      server.closeAllConnections();
      server.close();
      await pool.end();
    }
  },
);
