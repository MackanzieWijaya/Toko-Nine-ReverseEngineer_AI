# Toko Buah Segar

Aplikasi kasir dan inventori toko buah berbahasa Indonesia. Frontend menggunakan React dan Vite, API menggunakan Express, dan data disimpan di PostgreSQL. Docker Compose menjalankan ketiga layanan tersebut.

## Menjalankan dengan Docker

### Persyaratan

- Docker Desktop (Windows/macOS) atau Docker Engine (Linux)
- Docker Compose v2
- Port `5173` dan `4000` tersedia

PostgreSQL berjalan di jaringan internal Docker dan tidak membuka port `5432` ke komputer host secara default.

### Jalankan aplikasi

Jika mendapatkan proyek dari GitHub, clone repo (ganti contoh nama di bawah dengan URL dan nama repo Anda):

```sh
git clone https://github.com/USERNAME/NAMA-REPO.git
cd NAMA-REPO
[ -f .env ] || cp .env.example .env
docker compose up -d --build
```

Baris pembuatan `.env` hanya membuat file jika belum ada, sehingga konfigurasi lokal yang sudah ada tidak tertimpa. Di Windows PowerShell, gunakan `if (!(Test-Path .env)) { Copy-Item .env.example .env }` sebagai pengganti baris tersebut.

Untuk menjalankan Docker, tidak perlu memasang Node.js atau menjalankan `npm install` di host.

Tunggu sampai layanan sehat, lalu buka:

- Aplikasi: **http://localhost:5173**
- API: **http://localhost:4000/api**
- Pemeriksaan API: **http://localhost:4000/health**

Compose menunggu PostgreSQL sehat sebelum menjalankan backend, lalu menunggu backend sehat sebelum menjalankan frontend.

### Akun pengembangan

Database seed menyediakan akun lokal sementara berikut:

| Peran   | Email                  | Kata sandi      |
| ------- | ---------------------- | --------------- |
| Pemilik | `owner@tokobuah.local` | `BuahSegar123!` |
| Kasir   | `kasir@tokobuah.local` | `BuahSegar123!` |

Akun dan seluruh produk/transaksi seed bersifat fiktif. Jangan gunakan kredensial ini untuk deployment atau data sungguhan.

### Mengelola layanan dan data

```sh
docker compose ps                 # status layanan
docker compose logs -f            # ikuti log semua layanan
docker compose logs -f backend     # log API saja
docker compose down               # hentikan layanan; data PostgreSQL tetap ada
```

Data PostgreSQL tersimpan di Docker volume bernama `postgres_data` pada komputer masing-masing. GitHub membagikan kode, bukan database atau transaksi lokal.

> **Menghapus data:** `docker compose down -v` menghapus volume database. Saat aplikasi dijalankan lagi, database dibuat ulang dan data seed fiktif dimasukkan kembali. Perintah ini menghapus semua transaksi/inventori lokal secara permanen.

Schema dan seed hanya dijalankan otomatis saat volume PostgreSQL pertama kali dibuat. Mengubah `database/schema.sql` atau `database/seed.sql` tidak mengubah database yang sudah ada. Untuk database pengembangan yang bisa dihapus, jalankan `docker compose down -v` lalu `docker compose up -d --build`.

### Jika layanan gagal mulai

- Periksa status dengan `docker compose ps` dan log dengan `docker compose logs db backend`.
- Jika muncul `address already in use`, port aplikasi `5173` atau `4000` sedang digunakan. Hentikan proses yang memakai port tersebut. Compose saat ini tidak memublikasikan port PostgreSQL `5432` ke host.
- Jika backend `unhealthy`, pastikan database `healthy` terlebih dahulu. Backend baru dinyatakan sehat jika dapat terhubung ke PostgreSQL.
- Setelah mengubah kode, jalankan ulang `docker compose up -d --build` agar image diperbarui.

## Menjalankan tanpa Docker

Mode ini memerlukan Node.js 22+, PostgreSQL, dan `psql`.

1. Buat database PostgreSQL, lalu jalankan schema dan seed:

   ```sh
   psql "postgres://toko:password@localhost:5432/toko_buah" -f database/schema.sql
   psql "postgres://toko:password@localhost:5432/toko_buah" -f database/seed.sql
   ```

   Ganti `toko`, `password`, dan `toko_buah` sesuai database lokal Anda.

2. Di terminal pertama, atur variabel backend agar `DATABASE_URL` menunjuk ke PostgreSQL host (`localhost`, bukan nama layanan Docker `db`), lalu jalankan API:

   ```sh
   cd backend
   npm ci
   export DATABASE_URL='postgres://toko:password@localhost:5432/toko_buah'
   export JWT_SECRET='secret-lokal-panjang-untuk-pengembangan'
   npm run dev
   ```

   Di PowerShell, atur variabel dengan `$env:DATABASE_URL = '...'` dan `$env:JWT_SECRET = '...'`.

3. Di terminal kedua, atur URL API untuk Vite dan jalankan frontend:

   ```sh
   cd frontend
   npm ci
   ```

   Buat `frontend/.env.local` berisi:

   ```env
   VITE_API_URL=http://localhost:4000/api
   ```

   Lalu jalankan:

   ```sh
   npm run dev
   ```

   Buka **http://localhost:5173**. CORS backend secara default mengizinkan alamat tersebut.

## Konfigurasi

Docker Compose membaca `.env` di folder proyek. Mulai dari `.env.example`. Variabel yang umum diubah:

| Variabel                              | Kegunaan                                                     |
| ------------------------------------- | ------------------------------------------------------------ |
| `POSTGRES_DB`                         | Nama database aplikasi di Docker                             |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Kredensial database lokal                                    |
| `JWT_SECRET`                          | Kunci sesi; gunakan nilai acak yang panjang untuk deployment |
| `COOKIE_SECURE`                       | Gunakan `true` jika API disajikan melalui HTTPS              |
| `STORE_NAME` / `STORE_ADDRESS`        | Nama dan alamat yang dicetak pada struk                      |

Compose menyusun `DATABASE_URL` backend dari `POSTGRES_*` dan memakai jaringan internal Docker. `VITE_API_URL` digunakan saat menjalankan Vite secara terpisah; frontend Compose memakai path `/api` yang diteruskan Nginx ke backend.

> Nilai bawaan `.env.example` hanya untuk pengembangan lokal. Jangan commit file `.env`; `.gitignore` sudah mengecualikannya. Commit `.env.example` agar pengguna lain tahu variabel yang diperlukan.

## Fitur

- **Kasir:** katalog/filter, nota, diskon Rupiah, tunai/QRIS/transfer, kembalian, struk cetak, serta pencegahan submit ganda.
- **Riwayat:** filter tanggal/status, ringkasan transaksi selesai, detail struk, dan pembatalan dengan pemulihan stok satu kali.
- **Stok:** daftar stok, kartu pergerakan, penerimaan multi-item, supplier, pencatatan susut, dan stock opname.
- **Laporan:** ringkasan dan grafik berbasis data transaksi/inventori, penjualan harian, buah terlaris, metode pembayaran, dan stok minimum.
- **Produk:** pengelolaan katalog, harga, status jual, dan stok minimum. Edit produk tidak menimpa jumlah stok.
- **Pengguna:** pengelolaan akun dan peran dengan pembatasan akses di frontend serta backend.

Kuantitas memakai satuan produk (`kg`, `pcs`, atau `pack`) tanpa rasio konversi buatan. Harga dan kuantitas disimpan sebagai tipe numerik PostgreSQL. Perubahan stok dicatat sebagai pergerakan inventori.

## Tes dan pemeriksaan

Tes backend menguji penjualan, idempotensi, pembatalan, penyesuaian stok, dan akses peran. Tes memerlukan database khusus `toko_buah_test`; jangan arahkan `TEST_DATABASE_URL` ke database yang menyimpan data yang ingin dipertahankan.

Dengan Docker Compose dan konfigurasi lokal bawaan:

```sh
docker compose run --rm \
  -e TEST_DATABASE_URL=postgres://toko:toko_dev_password@db:5432/toko_buah_test \
  backend npm test
```

Database tes dibuat ketika volume PostgreSQL pertama kali diinisialisasi. Jika kredensial database di `.env` diubah, sesuaikan URL tes tersebut. Tanpa `TEST_DATABASE_URL`, `npm test` melewati tes integrasi.

Build frontend:

```sh
cd frontend
npm ci
npm run build
```

## API

Semua endpoint memakai prefix `/api` dan JSON. Endpoint terlindungi memakai cookie sesi HttpOnly yang kedaluwarsa setelah 8 jam. Daftar endpoint, payload, validasi, dan akses peran ada di [dokumentasi API](docs/API.md).
