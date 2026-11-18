# Toko Buah Segar

Aplikasi kasir dan inventori toko buah berbahasa Indonesia. Frontend menggunakan React dan Vite, API menggunakan Express, dan data disimpan di PostgreSQL. Docker Compose menjalankan ketiga layanan tersebut.

## Persyaratan

- **Semua cara:** Git untuk clone repository, serta port `5173` dan `4000` yang tersedia.
- **Dengan Docker:** Docker Desktop (Windows/macOS) atau Docker Engine (Linux), termasuk Docker Compose v2. Node.js dan PostgreSQL tidak perlu dipasang di komputer host.
- **Tanpa Docker (manual):** Node.js 22 atau lebih baru (termasuk npm), PostgreSQL 16 atau lebih baru, dan alat command-line `psql`. Pastikan server PostgreSQL berjalan sebelum backend.

Pilih salah satu cara: Docker menjalankan database, backend, dan frontend sekaligus; cara manual menjalankan PostgreSQL lokal, lalu backend dan frontend di terminal terpisah.

## Menjalankan dengan Docker

PostgreSQL berjalan di jaringan internal Docker dan tidak membuka port `5432` ke komputer host secara default.

### Jalankan aplikasi

Jika mendapatkan proyek dari GitHub, clone repo (ganti contoh nama di bawah dengan URL dan nama repo Anda):

```sh
git clone https://github.com/MackanzieWijaya/Toko-Nine-ReverseEngineer_AI
cd Toko-Nine-ReverseEngineer_AI
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

## Menjalankan secara manual (tanpa Docker)

Langkah berikut menjalankan PostgreSQL, backend API, dan frontend secara terpisah. Contoh ini memakai database `toko_buah`, user database `toko`, dan password `password`. Anda boleh mengganti nilainya, tetapi gunakan nilai yang sama di semua langkah. Untuk memudahkan setup lokal, contoh password tidak memakai karakter khusus URL seperti `@`, `:`, `/`, atau `#`.

### 1. Pasang dan jalankan PostgreSQL

#### Windows

1. Pasang PostgreSQL untuk Windows. Installer biasanya menyertakan **SQL Shell (psql)** dan mendaftarkan server sebagai Windows service. Catat password yang Anda buat untuk akun administrator `postgres`. Pasang juga Node.js 22+.
2. Pastikan server berjalan. Buka **Services** dari Start menu (atau jalankan `services.msc`), cari layanan seperti `postgresql-x64-16`, lalu pilih **Start** bila belum berjalan. Nama layanan bergantung versi. Dari PowerShell Administrator, Anda juga dapat mencari dan memulainya:

   ```powershell
   Get-Service *postgres*
   Start-Service postgresql-x64-16
   ```

   Ganti nama service pada perintah kedua dengan nama yang ditemukan. Jika PowerShell tidak mengenali `psql`, buka **SQL Shell (psql)** dari Start menu atau tambahkan folder `bin` PostgreSQL ke PATH, misalnya `C:\Program Files\PostgreSQL\16\bin`.

#### macOS

Cara Homebrew: pasang Homebrew jika belum ada, lalu di Terminal jalankan:

```sh
brew install node postgresql@16
brew services start postgresql@16
brew services list
```

Jika versi/formula PostgreSQL yang dipasang berbeda, gunakan nama formula itu pada perintah `brew services`. Cara lain adalah memasang **Postgres.app**, membukanya, lalu klik **Initialize** bila diminta; server akan berjalan selama aplikasi aktif. Buka Terminal untuk memakai `psql`.

#### Linux

Pasang PostgreSQL, paket client yang menyediakan `psql`, dan Node.js 22+ melalui package manager distribusi Anda. Pada distro yang memakai systemd, mulai dan cek server dengan:

```sh
sudo systemctl start postgresql
sudo systemctl status postgresql
```

Nama layanan dan langkah instalasi dapat berbeda antar distribusi.

### 2. Buat user dan database aplikasi

Pastikan PostgreSQL berjalan. Dari terminal, sambungkan sebagai administrator:

```sh
psql -U postgres -h localhost -p 5432
```

Masukkan password administrator `postgres` saat diminta. Jika berhasil, akan tampil prompt `postgres=#`. Jalankan perintah SQL berikut **di dalam psql**:

```sql
CREATE USER toko WITH PASSWORD 'password';
CREATE DATABASE toko_buah OWNER toko;
\q
```

`\q` menutup psql. Di Linux, autentikasi lokal kadang menolak `psql -U postgres`; sebagai gantinya jalankan `sudo -u postgres psql`, lalu masukkan SQL yang sama. Jika user atau database sudah ada, gunakan yang sudah ada dan pastikan user `toko` memiliki password yang diketahui serta menjadi pemilik database `toko_buah`.

Di macOS dengan Homebrew atau Postgres.app, akun admin yang tersedia bisa memakai nama akun macOS Anda, bukan `postgres`. Jika perintah di atas melaporkan role `postgres` tidak ditemukan, coba `psql -d postgres` untuk masuk sebagai akun macOS, lalu jalankan SQL yang sama di prompt psql. Pada instalasi Windows, Anda juga bisa membuka **SQL Shell (psql)** dari Start menu, menekan Enter untuk menerima host `localhost`, port `5432`, dan user `postgres`, lalu memasukkan password admin.

### 3. Muat schema dan data contoh

Buka terminal di **folder root proyek**, yaitu folder yang berisi `database`, `backend`, dan `frontend`. Jalankan perintah berikut; masukkan password user aplikasi (`password` pada contoh) saat diminta:

```sh
psql -h localhost -p 5432 -U toko -d toko_buah -f database/schema.sql
psql -h localhost -p 5432 -U toko -d toko_buah -f database/seed.sql
```

Perintah yang sama berlaku di PowerShell. Schema dan seed hanya perlu dimuat saat membuat database baru. Seed memasukkan akun pengembangan dan data fiktif yang disebutkan pada bagian [Akun pengembangan](#akun-pengembangan).

### 4. Jalankan backend

Buka terminal pertama di root proyek, masuk ke folder backend, pasang dependency, lalu jalankan API. Biarkan terminal ini tetap terbuka.

**Windows PowerShell:**

```powershell
cd backend
npm ci
$env:DATABASE_URL = 'postgres://toko:password@localhost:5432/toko_buah'
$env:JWT_SECRET = 'secret-lokal-panjang-untuk-pengembangan'
npm run dev
```

**macOS / Linux (bash atau zsh):**

```sh
cd backend
npm ci
export DATABASE_URL='postgres://toko:password@localhost:5432/toko_buah'
export JWT_SECRET='secret-lokal-panjang-untuk-pengembangan'
npm run dev
```

Environment variable tersebut berlaku untuk terminal tempat backend berjalan. Jika terminal ditutup, atur kembali variabel saat memulai backend berikutnya. API tersedia di **http://localhost:4000**; periksa **http://localhost:4000/health**.

### 5. Jalankan frontend

Buka terminal kedua di root proyek (backend tetap berjalan), lalu masuk ke folder frontend dan pasang dependency.

**Windows PowerShell:**

```powershell
cd frontend
npm ci
Set-Content -Path .env.local -Value 'VITE_API_URL=http://localhost:4000/api'
npm run dev
```

**macOS / Linux (bash atau zsh):**

```sh
cd frontend
npm ci
cat > .env.local <<'EOF_ENV'
VITE_API_URL=http://localhost:4000/api
EOF_ENV
npm run dev
```

Buka aplikasi di **http://localhost:5173**. Hentikan server frontend dan backend dengan `Ctrl+C` di terminal masing-masing. PostgreSQL dapat tetap berjalan sebagai service. Untuk menghentikannya, gunakan Services di Windows, `brew services stop postgresql@16` pada Homebrew/macOS, atau `sudo systemctl stop postgresql` pada Linux.

### Jika koneksi gagal

- Pastikan PostgreSQL berjalan dan menerima koneksi di `localhost:5432`.
- Pastikan nama database, user, dan password pada `DATABASE_URL` cocok. Untuk setup manual, host harus `localhost` (bukan nama service Docker `db`).
- Jika `psql` tidak dikenali, gunakan SQL Shell/PostgreSQL command prompt atau tambahkan folder executable PostgreSQL ke PATH.
- Jika backend gagal tersambung, periksa error di terminal backend. Jika frontend tidak dapat memanggil API, pastikan backend berjalan dan `VITE_API_URL` berisi `http://localhost:4000/api`.
- Jika port `4000` atau `5173` sudah dipakai, hentikan proses yang menggunakannya.

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
