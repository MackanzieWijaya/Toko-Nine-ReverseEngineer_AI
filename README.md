# Toko Buah Segar

POS dan inventori berbahasa Indonesia untuk toko buah. Aplikasi memiliki frontend React + Vite, REST API Express, dan PostgreSQL. Semua perubahan stok dicatat sebagai pergerakan; penjualan, pembatalan, barang masuk, susut, dan stock opname berjalan dalam transaksi database.

## Menjalankan dengan Docker Compose

Perlu Docker Desktop / Docker Engine dan Docker Compose.

```sh
cp .env.example .env
docker compose up --build
```

Buka **http://localhost:5173**. API tersedia di **http://localhost:4000** dan pemeriksaan kesehatan di `/health`.

Untuk berhenti: `docker compose down`. Untuk menghapus database lokal dan membuat ulang data seed fiktif: `docker compose down -v`, lalu jalankan kembali `docker compose up --build`.

Seed pertama membuat dua akun lokal berikut. Keduanya memakai kata sandi sementara yang sama; ubah atau hapus akun setelah demo lokal.

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Pemilik | `owner@tokobuah.local` | `BuahSegar123!` |
| Kasir | `kasir@tokobuah.local` | `BuahSegar123!` |

Seluruh produk dan pengguna seed adalah data fiktif. Data masuk database hanya saat volume PostgreSQL dibuat pertama kali.

## Menjalankan frontend dan backend terpisah

1. Siapkan PostgreSQL dan buat database, lalu jalankan `database/schema.sql` dan `database/seed.sql`.
2. Di `backend`, set `DATABASE_URL`, `JWT_SECRET`, dan opsional `STORE_NAME` / `STORE_ADDRESS`. Jalankan `npm install`, `npm run seed` untuk menyamakan password seed dengan `BuahSegar123!`, lalu `npm run dev`.
3. Di `frontend`, jalankan `npm install` dan `npm run dev`. Vite berjalan di port 5173. Bila API berada di origin lain, set `VITE_API_URL`, misalnya `http://localhost:4000/api`.

## Fitur

- **Kasir:** katalog dan filter kategori, nota, kuantitas unit-aware (kg / pcs / pack), diskon Rupiah, pembayaran tunai / QRIS / transfer, kembalian, struk cetak, dan idempotency key.
- **Riwayat:** filter tanggal/status, ringkasan penjualan selesai, detail struk, pembatalan beralasan, serta pemulihan stok satu kali.
- **Stok:** stok saat ini dan kartu pergerakan, barang masuk multi-item, supplier, susut, dan stock opname dengan selisih tercatat.
- **Laporan:** agregasi database berdasarkan periode, grafik harian, laba kotor, transaksi, metode pembayaran, buah terlaris, dan stok minimum.
- **Produk dan Pengguna:** owner dapat mengubah katalog, status jual, akun, dan peran. Stok produk tidak dapat ditimpa melalui edit katalog.
- **Akses:** sesi JWT pada cookie HttpOnly 8 jam, validasi akun di backend, dan middleware khusus owner untuk endpoint owner.

Harga disimpan sebagai `NUMERIC(14,2)` dan kuantitas sebagai `NUMERIC(14,3)`. Satuan jual dipertahankan apa adanya; aplikasi tidak mengarang rasio konversi antar kg, pcs, dan pack. Zona waktu database menggunakan timestamp dengan zona waktu; tanggal filter menggunakan tanggal lokal yang dikirim browser.

## Variabel lingkungan

Lihat [.env.example](.env.example). `JWT_SECRET` wajib diganti untuk deployment. Cookie secure diaktifkan dengan `COOKIE_SECURE=true` saat API berada di HTTPS. Nilai Compose bawaan ditujukan hanya untuk pengembangan lokal.

## Tes

Tes backend memakai Node test runner. Compose membuat database terpisah `toko_buah_test` untuk tes integrasi. Jalankan tes melalui service backend agar database tidak perlu membuka port ke host:

```sh
docker compose run --rm -e TEST_DATABASE_URL=postgres://toko:toko_dev_password@db:5432/toko_buah_test backend npm test
```

Tes memakai API pada port lokal dan menghapus baris uji setelah selesai. Database tes hanya dibuat saat volume PostgreSQL baru diinisialisasi.

Build frontend dapat diperiksa dengan `npm run build` dari `frontend`. Backend dapat diperiksa dengan `npm test` dari `backend`.

## API

Semua endpoint berada di bawah `/api`, mengembalikan JSON `{ data }` untuk hasil data dan `{ error }` untuk kesalahan. Login membuat cookie HttpOnly, logout menghapusnya. Detail request, respons, aturan akses, serta validasi ada di [docs/API.md](docs/API.md).
