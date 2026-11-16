# API Toko Buah Segar

Base URL: `http://localhost:4000/api` (Compose frontend meneruskan `/api` ke backend). Kecuali login/logout, endpoint memerlukan sesi cookie HttpOnly `toko_session`. JSON request menggunakan `Content-Type: application/json`.

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/auth/login` | Publik | `{ email, password }`; membuat sesi 8 jam. |
| POST | `/auth/logout` | Publik | Menghapus sesi. |
| GET | `/auth/saya` | Sesi | Identitas pengguna dan konfigurasi toko. |
| GET | `/produk` | Sesi | Produk aktif; owner dapat meminta `?all=true`. |
| POST | `/produk` | Owner | Buat produk tanpa mengubah stok. |
| PATCH | `/produk/:id` | Owner | Ubah informasi/status produk. |
| POST | `/penjualan` | Sesi | Buat transaksi dan kurangi stok atomik. |
| GET | `/penjualan?from=&to=&status=` | Sesi | Daftar dan ringkasan transaksi. `status`: `completed` / `cancelled`. |
| GET | `/penjualan/:id` | Sesi | Detail transaksi/struk. |
| POST | `/penjualan/:id/batal` | Sesi | `{ reason }`; pulihkan stok sekali. |
| GET / POST | `/supplier` | Sesi / Owner | Daftar / buat supplier. POST memerlukan `{ name, phone }`. |
| GET | `/stok` | Sesi | Daftar produk dan jumlah stok. |
| GET | `/stok/pergerakan?product_id=` | Sesi | 60 pergerakan terakhir. |
| POST / GET | `/stok-masuk` | Sesi | Simpan / lihat penerimaan barang. |
| POST / GET | `/susut` | Sesi | Catat / lihat barang susut. |
| POST / GET | `/opname` | Sesi | Rekonsiliasi / lihat sesi stock opname. |
| GET / POST / PATCH | `/pengguna[/:id]` | Owner | Kelola akun dan peran tanpa membaca hash password. |
| GET | `/laporan?from=&to=` | Owner | Ringkasan dan rincian laporan database. |

### Bentuk payload penting

```json
POST /penjualan
{
  "items": [{ "product_id": 1, "quantity": 1.25 }],
  "payment_method": "Tunai",
  "amount_received": 50000,
  "discount": 0,
  "idempotency_key": "uuid-unik-per-submit"
}
```

Metode selain Tunai menerima nilai pembayaran tepat sejumlah total. Untuk barang masuk: `{ "supplier_id": 1, "date": "2026-11-15", "notes": "", "items": [{ "product_id": 1, "quantity": 3, "unit_cost": 18000 }] }`. Supplier dapat `null`. Stock opname menerima `{ "notes": "", "items": [{ "product_id": 1, "physical_stock": 4.5 }] }`.

Role kasir mendapat 403 pada `/laporan`, `/produk` mutasi, `/supplier` POST, dan seluruh `/pengguna`. Semua penjualan dan adjustment inventory divalidasi dan ditulis server-side. Pengurangan stok tidak dapat membuat stok negatif.
