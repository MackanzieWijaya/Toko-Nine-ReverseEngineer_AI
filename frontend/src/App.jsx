import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Apple,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  FileText,
  LogOut,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, dateTime, money, today } from './api.js';

const links = [
  ['/kasir', 'Kasir', ShoppingCart],
  ['/riwayat', 'Riwayat', Clock3],
  ['/stok', 'Stok', Boxes],
  ['/laporan', 'Laporan', BarChart3],
  ['/produk', 'Produk', Package],
  ['/pengguna', 'Pengguna', Users],
];
const titleFor = (path) => links.find((x) => x[0] === path)?.[1] || 'Kasir';
function Modal({ title, onClose, children, wide = false, className = '' }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        className={`modal ${wide ? 'modal-wide' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({ title = 'Belum ada data', text = 'Data akan tampil di sini setelah tersedia.' }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Package size={21} />
      </div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
function ErrorBox({ message }) {
  return message ? (
    <div className="error-box">
      <CircleAlert size={16} />
      {message}
    </div>
  ) : null;
}

export default function App() {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true),
    [sessionError, setSessionError] = useState('');
  const nav = useNavigate(),
    loc = useLocation();
  async function loadSession() {
    try {
      const r = await api('/auth/saya');
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    loadSession();
    const expire = () => {
      setUser(null);
      setSessionError('Sesi berakhir. Silakan masuk kembali.');
    };
    window.addEventListener('session-expired', expire);
    return () => window.removeEventListener('session-expired', expire);
  }, []);
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      nav('/login');
    }
  }
  if (checking)
    return (
      <div className="app-loading">
        <span className="spinner" />
        Memuat Toko Buah Segar…
      </div>
    );
  if (!user)
    return (
      <Login
        onLogin={(data) => {
          setUser(data.user);
          setSessionError('');
          nav('/kasir');
        }}
        message={sessionError}
      />
    );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-fruit" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div>
            <strong>Toko Buah Segar</strong>
          </div>
        </div>
        <div className="nav-caption">MENU UTAMA</div>
        <nav>
          {links
            .filter(
              ([path]) =>
                user.role === 'owner' || !['/laporan', '/produk', '/pengguna'].includes(path),
            )
            .map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
                {path === '/kasir' && <span className="nav-dot" />}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="store-status">
            <span className="status-dot" />
            Toko sedang buka
          </div>
          <div className="profile">
            <div className="avatar">
              {user.name
                ?.split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="profile-copy">
              <strong>{user.name}</strong>
              <span>{user.role === 'owner' ? 'Pemilik Toko' : 'Kasir'}</span>
            </div>
            <button className="logout-btn" onClick={logout} title="Keluar">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="crumb">
            <span>Ruang kerja</span>
            <ChevronRight size={14} />
            <strong>{titleFor(loc.pathname)}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-chip">
              {new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
            </span>
            <div className="mini-avatar">{user.name?.[0]}</div>
          </div>
        </header>
        <div className="page-wrap">
          <Routes>
            <Route path="/" element={<Navigate to="/kasir" replace />} />
            <Route path="/kasir" element={<Kasir />} />
            <Route path="/riwayat" element={<Riwayat user={user} />} />
            <Route path="/stok" element={<Stok user={user} />} />
            <Route
              path="/laporan"
              element={user.role === 'owner' ? <Laporan /> : <Navigate to="/kasir" replace />}
            />
            <Route
              path="/produk"
              element={user.role === 'owner' ? <Produk /> : <Navigate to="/kasir" replace />}
            />
            <Route
              path="/pengguna"
              element={
                user.role === 'owner' ? (
                  <Pengguna currentUser={user} />
                ) : (
                  <Navigate to="/kasir" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/kasir" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin, message }) {
  const [email, setEmail] = useState('owner@tokobuah.local'),
    [password, setPassword] = useState('BuahSegar123!'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(message || '');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(
        await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-art">
        <div className="login-logo">
          <Apple size={25} fill="currentColor" />
        </div>
        <div className="login-copy">
          <span className="eyebrow">SEGAR SETIAP HARI</span>
          <h1>
            Kelola toko buah
            <br />
            <i>jadi lebih mudah.</i>
          </h1>
          <p>Kasir, stok, dan laporan dalam satu ruang kerja yang rapi.</p>
        </div>
        <div className="fruit-orbit">
          🍊　🍎　🍐
          <br />
          　🥭　🍇　🍋
        </div>
        <span className="login-foot">Toko Buah Segar · Sistem Kasir & Inventori</span>
      </div>
      <form className="login-form" onSubmit={submit}>
        <div className="login-mobile-brand">
          <Apple size={20} /> Toko Buah Segar
        </div>
        <span className="eyebrow">SELAMAT DATANG KEMBALI</span>
        <h2>Masuk ke akun Anda</h2>
        <p className="muted">Gunakan email dan kata sandi yang terdaftar.</p>
        <ErrorBox message={error} />
        <Field label="Email">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Kata sandi">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <button className="btn btn-primary login-submit" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner spinner-white" />
              Memeriksa…
            </>
          ) : (
            'Masuk ke dashboard'
          )}
        </button>
        <div className="demo-info">
          <strong>Akun demo lokal</strong>
          <span>
            Pemilik atau Kasir · kata sandi <code>BuahSegar123!</code>
          </span>
        </div>
      </form>
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Kasir() {
  const [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('semua'),
    [cart, setCart] = useState([]),
    [pulse, setPulse] = useState({}),
    [discount, setDiscount] = useState(0),
    [method, setMethod] = useState('Tunai'),
    [received, setReceived] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [receipt, setReceipt] = useState(null);
  const refresh = () =>
    api('/produk')
      .then((r) => setProducts(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    refresh();
  }, []);
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'semua' || p.category === category),
  );
  const subtotal = cart.reduce((s, x) => s + Number(x.price) * x.qty, 0),
    disc = Math.min(Number(discount) || 0, subtotal),
    total = Math.max(0, subtotal - disc),
    cash = Number(received) || 0;
  function add(p) {
    if (Number(p.stock) <= 0) return;
    setCart((curr) => {
      const found = curr.find((x) => x.id === p.id);
      if (found) {
        if (found.qty + 1 > Number(p.stock)) return curr;
        return curr.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...curr, { ...p, qty: 1 }];
    });
  }
  function selectProduct(p) {
    add(p);
    setPulse((current) => ({ ...current, [p.id]: (current[p.id] || 0) + 1 }));
  }
  function updateQty(id, qty) {
    const product = products.find((p) => p.id === id);
    if (qty <= 0) {
      setCart((c) => c.filter((x) => x.id !== id));
      return;
    }
    if (qty <= Number(product.stock))
      setCart((c) => c.map((x) => (x.id === id ? { ...x, qty } : x)));
  }
  async function complete() {
    setError('');
    if (!cart.length) return setError('Tambahkan produk ke nota terlebih dahulu.');
    if (method === 'Tunai' && cash < total) return setError('Uang yang diterima belum mencukupi.');
    setBusy(true);
    try {
      const data = await api('/penjualan', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((x) => ({ product_id: x.id, quantity: x.qty })),
          payment_method: method,
          amount_received: method === 'Tunai' ? cash : total,
          discount: disc,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      setReceipt(data.data);
      setCart([]);
      setDiscount(0);
      setReceived('');
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="pos-layout">
        <section className="catalog-panel">
          <div className="catalog-head">
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label="Cari buah"
                placeholder="Cari nama buah…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="text-icon" onClick={() => setQuery('')}>
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="filter-pills">
              {[
                ['semua', 'Semua'],
                ['lokal', 'Buah lokal'],
                ['impor', 'Buah impor'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  className={category === v ? 'selected' : ''}
                  onClick={() => setCategory(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="center-loading">
              <span className="spinner" />
              Memuat produk…
            </div>
          ) : filtered.length ? (
            <div className="product-grid">
              {filtered.map((p, i) => {
                const count = cart.find((x) => x.id === p.id)?.qty || 0;
                return (
                  <button
                    key={`${p.id}-${pulse[p.id] || 0}`}
                    className={`product-card fruit-${i % 8} ${Number(p.stock) <= Number(p.min_stock) ? 'low' : ''} ${pulse[p.id] ? 'just-added' : ''}`}
                    onClick={() => selectProduct(p)}
                    disabled={!Number(p.stock)}
                  >
                    <div className="product-indicator">
                      <i />
                    </div>
                    {count > 0 && (
                      <span key={pulse[p.id]} className="added-count">
                        {count}
                      </span>
                    )}
                    <div className="product-category">
                      {p.category === 'lokal' ? 'Buah lokal' : 'Buah impor'}
                    </div>
                    <strong>{p.name}</strong>
                    <div className="product-price">
                      {money(p.price)}
                      <span>/{p.unit}</span>
                    </div>
                    <div className="product-stock">
                      <span
                        className={
                          Number(p.stock) <= Number(p.min_stock) ? 'warning-dot' : 'stock-dot'
                        }
                      />
                      {Number(p.stock) <= Number(p.min_stock) ? 'Tinggal ' : ''}
                      {Number(p.stock)} {p.unit}
                    </div>
                    <span className="add-symbol">
                      <Plus size={15} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              title="Buah tidak ditemukan"
              text="Coba kata kunci atau kategori yang berbeda."
            />
          )}
        </section>
        <aside className="cart-panel">
          <div className="cart-header">
            <div>
              <span className="eyebrow">TRANSAKSI BARU</span>
              <h2>
                Nota <span className="cart-count">{cart.length}</span>
              </h2>
            </div>
            <button
              className="btn btn-quiet btn-sm"
              onClick={() => {
                setCart([]);
                setDiscount(0);
                setError('');
              }}
              disabled={!cart.length}
            >
              <Trash2 size={14} /> Kosongkan
            </button>
          </div>
          <div className="cart-items">
            {cart.length ? (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-head">
                    <strong>{item.name}</strong>
                    <span>
                      {money(item.price)}/{item.unit}
                    </span>
                  </div>
                  <div className="cart-item-controls">
                    <div className="qty-control">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Kurangi">
                        <Minus size={13} />
                      </button>
                      <input
                        aria-label={`Jumlah ${item.name}`}
                        type="number"
                        step="0.001"
                        min="0.001"
                        max={item.stock}
                        value={item.qty}
                        onChange={(e) => updateQty(item.id, Number(e.target.value))}
                      />
                      <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Tambah">
                        <Plus size={13} />
                      </button>
                    </div>
                    <strong className="line-price">{money(item.price * item.qty)}</strong>
                    <button
                      className="cart-remove"
                      onClick={() => updateQty(item.id, 0)}
                      aria-label={`Hapus ${item.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="cart-empty">
                <div>
                  <ShoppingBag size={23} />
                </div>
                <strong>Nota masih kosong</strong>
                <span>
                  Pilih buah dari katalog
                  <br />
                  untuk mulai bertransaksi.
                </span>
              </div>
            )}
          </div>
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="discount-row">
              <span>Diskon</span>
              <label className="discount-input">
                Rp
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  aria-label="Diskon rupiah"
                />
              </label>
            </div>
            <div className="summary-row total-row">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
          <div className="payment-section">
            <span className="section-label">METODE PEMBAYARAN</span>
            <div className="payment-options">
              {['Tunai', 'QRIS', 'Transfer'].map((x, i) => (
                <button
                  className={method === x ? 'chosen' : ''}
                  key={x}
                  onClick={() => setMethod(x)}
                >
                  {i === 0 ? '◉' : i === 1 ? '▦' : '⇄'} {x}
                </button>
              ))}
            </div>
            {method === 'Tunai' && (
              <>
                <Field label="Uang diterima">
                  <div className="money-field">
                    <span>Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={received}
                      onChange={(e) => setReceived(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </Field>
                <div className="quick-cash">
                  {[total, 30000, 50000, 100000].map((v, i) => (
                    <button key={i} onClick={() => setReceived(String(v))}>
                      {i === 0 ? 'Uang pas' : money(v).replace('Rp', '').trim()}
                    </button>
                  ))}
                </div>
                <small className="payment-hint">Isi uang yang diterima.</small>
                <div className="change-line">
                  <span>Kembalian</span>
                  <strong className={cash < total ? 'muted' : ''}>
                    {money(Math.max(0, cash - total))}
                  </strong>
                </div>
              </>
            )}
          </div>
          <ErrorBox message={error} />
          <button
            className="btn btn-primary checkout-btn"
            disabled={busy || !cart.length}
            onClick={complete}
          >
            {busy ? (
              <>
                <span className="spinner spinner-white" />
                Memproses…
              </>
            ) : (
              <>
                Selesaikan Penjualan <ChevronRight size={17} />
              </>
            )}
          </button>
          <div className="secure-note">
            <span>⌁</span> Transaksi tersimpan aman dan stok terbarui otomatis
          </div>
        </aside>
      </div>
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

function ReceiptModal({ receipt, onClose }) {
  return (
    <Modal title="Transaksi berhasil" onClose={onClose}>
      <div className="receipt" id="print-receipt">
        <div className="receipt-brand">
          <div className="brand-mark">
            <Apple size={20} fill="currentColor" />
          </div>
          <h3>{receipt.store?.name || 'Toko Buah Segar'}</h3>
          <span>{receipt.store?.address}</span>
        </div>
        <div className="receipt-meta">
          <span>No. Struk</span>
          <strong>{receipt.receipt_no}</strong>
          <span>Waktu</span>
          <strong>{dateTime(receipt.created_at)}</strong>
          <span>Kasir</span>
          <strong>{receipt.cashier_name}</strong>
        </div>
        <div className="receipt-items">
          {receipt.items?.map((i) => (
            <div key={i.id}>
              <span>
                {i.product_name}
                <small>
                  {i.quantity} {i.unit} × {money(i.unit_price)}
                </small>
              </span>
              <strong>{money(i.line_total)}</strong>
            </div>
          ))}
        </div>
        <div className="receipt-totals">
          <div>
            <span>Subtotal</span>
            <strong>{money(receipt.subtotal)}</strong>
          </div>
          <div>
            <span>Diskon</span>
            <strong>− {money(receipt.discount)}</strong>
          </div>
          <div className="receipt-grand">
            <span>Total</span>
            <strong>{money(receipt.total)}</strong>
          </div>
          <div>
            <span>{receipt.payment_method}</span>
            <strong>{money(receipt.amount_received)}</strong>
          </div>
          {receipt.payment_method === 'Tunai' && (
            <div>
              <span>Kembalian</span>
              <strong>{money(receipt.change_amount)}</strong>
            </div>
          )}
        </div>
        <div className="receipt-thanks">
          Terima kasih telah berbelanja!
          <br />
          Buah segar, hati senang 🍊
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <FileText size={16} /> Cetak
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          Transaksi Baru
        </button>
      </div>
    </Modal>
  );
}

function Riwayat({ user }) {
  const [rows, setRows] = useState([]),
    [summary, setSummary] = useState({ transactions: 0, total_sales: 0 }),
    [from, setFrom] = useState(today()),
    [to, setTo] = useState(today()),
    [status, setStatus] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [selected, setSelected] = useState(null),
    [cancel, setCancel] = useState(null),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const r = await api(`/penjualan?from=${from}&to=${to}${status ? `&status=${status}` : ''}`);
      setRows(r.data);
      setSummary(r.summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [from, to, status]);
  function preset(kind) {
    const d = new Date();
    if (kind === 'kemarin') d.setDate(d.getDate() - 1);
    const a = d.toLocaleDateString('en-CA');
    setFrom(a);
    setTo(a);
    if (kind === '7hari') {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      setFrom(start.toLocaleDateString('en-CA'));
      setTo(today());
    }
  }
  async function open(id) {
    try {
      const r = await api(`/penjualan/${id}`);
      setSelected(r.data);
    } catch (e) {
      setError(e.message);
    }
  }
  async function doCancel() {
    setBusy(true);
    setError('');
    try {
      await api(`/penjualan/${cancel.id}/batal`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setCancel(null);
      setReason('');
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="RIWAYAT TRANSAKSI"
        title="Riwayat"
        description="Semua transaksi toko. Ketuk baris untuk melihat struk."
      />
      <section className="panel">
        <div className="filter-toolbar">
          <div className="date-filters">
            <Field label="Dari">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Sampai">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Semua</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </Field>
            <div className="preset-group">
              <button onClick={() => preset('hari')}>Hari ini</button>
              <button onClick={() => preset('kemarin')}>Kemarin</button>
              <button onClick={() => preset('7hari')}>7 hari</button>
            </div>
          </div>
        </div>
        <div className="history-summary">
          <div>
            <span>Transaksi selesai</span>
            <strong>{summary.transactions}</strong>
          </div>
          <div>
            <span>Total penjualan</span>
            <strong>{money(summary.total_sales)}</strong>
          </div>
        </div>
        <ErrorBox message={error} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>No. struk</th>
                <th>Jam</th>
                <th>Kasir</th>
                <th>Metode</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => open(r.id)} className="click-row">
                  <td>
                    <strong className="receipt-code">{r.receipt_no}</strong>
                  </td>
                  <td>{dateTime(r.created_at)}</td>
                  <td>{r.cashier_name}</td>
                  <td>
                    <span className="method-label">{r.payment_method}</span>
                  </td>
                  <td>
                    <strong>{money(r.total)}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${r.status === 'completed' ? 'badge-green' : 'badge-gray'}`}
                    >
                      {r.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                    </span>
                  </td>
                  <td>
                    <ChevronRight size={16} className="table-chevron" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !rows.length && (
            <Empty
              title="Belum ada transaksi"
              text="Transaksi pada rentang tanggal ini akan tampil di sini."
            />
          )}
          {loading && (
            <div className="table-loading">
              <span className="spinner" />
            </div>
          )}
        </div>
        <div className="table-footer">
          Menampilkan <strong>{rows.length}</strong> transaksi terbaru{' '}
          <span>Maksimal 300 data</span>
        </div>
      </section>
      {selected && (
        <Modal title="Detail transaksi" onClose={() => setSelected(null)}>
          <div className="receipt">
            <div className="receipt-brand">
              <h3>{selected.store?.name}</h3>
              <span>{selected.store?.address}</span>
            </div>
            <div className="receipt-meta">
              <span>No. Struk</span>
              <strong>{selected.receipt_no}</strong>
              <span>Waktu</span>
              <strong>{dateTime(selected.created_at)}</strong>
              <span>Kasir</span>
              <strong>{selected.cashier_name}</strong>
            </div>
            <div className="receipt-items">
              {selected.items?.map((i) => (
                <div key={i.id}>
                  <span>
                    {i.product_name}
                    <small>
                      {i.quantity} {i.unit} × {money(i.unit_price)}
                    </small>
                  </span>
                  <strong>{money(i.line_total)}</strong>
                </div>
              ))}
            </div>
            <div className="receipt-totals">
              <div>
                <span>Subtotal</span>
                <strong>{money(selected.subtotal)}</strong>
              </div>
              <div>
                <span>Diskon</span>
                <strong>{money(selected.discount)}</strong>
              </div>
              <div className="receipt-grand">
                <span>Total</span>
                <strong>{money(selected.total)}</strong>
              </div>
              <div>
                <span>Metode bayar</span>
                <strong>{selected.payment_method}</strong>
              </div>
            </div>
            {selected.status === 'cancelled' && (
              <div className="cancel-note">
                <strong>Transaksi dibatalkan</strong>
                <span>{selected.cancel_reason}</span>
              </div>
            )}
          </div>
          <div className="modal-actions">
            {selected.status === 'completed' && (
              <button
                className="btn btn-danger-outline"
                onClick={() => {
                  setCancel(selected);
                  setSelected(null);
                }}
              >
                Batalkan transaksi
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <FileText size={16} /> Cetak
            </button>
          </div>
        </Modal>
      )}
      {cancel && (
        <Modal title={`Batalkan ${cancel.receipt_no}`} onClose={() => setCancel(null)}>
          <p className="modal-description">
            Stok dari transaksi ini akan dikembalikan ke inventori. Tindakan ini tidak dapat
            diulang.
          </p>
          <Field label="Alasan pembatalan">
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: transaksi salah input"
            />
          </Field>
          <ErrorBox message={error} />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setCancel(null)}>
              Batal
            </button>
            <button className="btn btn-danger" disabled={busy || !reason.trim()} onClick={doCancel}>
              {busy ? 'Memproses…' : 'Batalkan Transaksi'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Stok({ user }) {
  const [tab, setTab] = useState('current'),
    [products, setProducts] = useState([]),
    [suppliers, setSuppliers] = useState([]),
    [movements, setMovements] = useState([]),
    [receipts, setReceipts] = useState([]),
    [spoil, setSpoil] = useState([]),
    [opnames, setOpnames] = useState([]),
    [query, setQuery] = useState(''),
    [detail, setDetail] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [supplierModal, setSupplierModal] = useState(false);
  const [supplier, setSupplier] = useState(''),
    [date, setDate] = useState(today()),
    [notes, setNotes] = useState(''),
    [receiptItems, setReceiptItems] = useState([{ product_id: '', quantity: '', unit_cost: '' }]);
  const [spoiled, setSpoiled] = useState({
    product_id: '',
    quantity: '',
    reason: 'Busuk',
    notes: '',
  });
  const [physical, setPhysical] = useState({}),
    [opnameNotes, setOpnameNotes] = useState('');
  async function load() {
    setError('');
    try {
      const [p, s, m, r, sp, o] = await Promise.all([
        api('/stok'),
        api('/supplier'),
        api('/stok/pergerakan'),
        api('/stok-masuk'),
        api('/susut'),
        api('/opname'),
      ]);
      setProducts(p.data);
      setSuppliers(s.data);
      setMovements(m.data);
      setReceipts(r.data);
      setSpoil(sp.data);
      setOpnames(o.data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const visible = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  async function saveReceipt(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/stok-masuk', {
        method: 'POST',
        body: JSON.stringify({ supplier_id: supplier || null, date, notes, items: receiptItems }),
      });
      setReceiptItems([{ product_id: '', quantity: '', unit_cost: '' }]);
      setNotes('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveSpoilage(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/susut', { method: 'POST', body: JSON.stringify(spoiled) });
      setSpoiled({ product_id: '', quantity: '', reason: 'Busuk', notes: '' });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveOpname(e) {
    e.preventDefault();
    const counted = products.filter(
      (p) => p.active && physical[p.id] !== undefined && physical[p.id] !== '',
    );
    if (!counted.length) {
      setError('Isi stok fisik untuk setidaknya satu buah.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/opname', {
        method: 'POST',
        body: JSON.stringify({
          notes: opnameNotes,
          items: counted.map((p) => ({ product_id: p.id, physical_stock: Number(physical[p.id]) })),
        }),
      });
      setPhysical({});
      setOpnameNotes('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function newSupplier(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const f = new FormData(e.target);
      const r = await api('/supplier', {
        method: 'POST',
        body: JSON.stringify({ name: f.get('name'), phone: f.get('phone') }),
      });
      setSuppliers((s) => [...s, r.data]);
      setSupplier(String(r.data.id));
      setSupplierModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function showDetails(p) {
    setDetail(p);
    try {
      const m = await api(`/stok/pergerakan?product_id=${p.id}`);
      setMovements(m.data);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="INVENTORI"
        title="Stok"
        description="Pantau persediaan dan catat setiap perubahan stok."
      />
      <section className="panel stock-panel">
        <div className="tabs">
          {[
            ['current', 'Stok saat ini'],
            ['in', 'Barang masuk'],
            ['spoil', 'Susut'],
            ['opname', 'Stock opname'],
          ].map(([v, label]) => (
            <button
              key={v}
              className={tab === v ? 'active' : ''}
              onClick={() => {
                setTab(v);
                setError('');
              }}
            >
              {label}
              {v === 'current' && products.some((p) => Number(p.stock) <= Number(p.min_stock)) && (
                <i />
              )}
            </button>
          ))}
        </div>
        <ErrorBox message={error} />
        {tab === 'current' && (
          <>
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  placeholder="Cari buah…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <span className="muted">
                Ketuk baris untuk melihat kartu stok (riwayat keluar-masuk).
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Buah</th>
                    <th>Stok</th>
                    <th>Minimum</th>
                    <th>Kondisi</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p, i) => (
                    <tr key={p.id} className="click-row" onClick={() => showDetails(p)}>
                      <td>
                        <span className={`table-fruit color-${i % 5}`}>●</span>
                        <strong>{p.name}</strong>
                      </td>
                      <td>
                        <strong>
                          {Number(p.stock)} {p.unit}
                        </strong>
                      </td>
                      <td>
                        {Number(p.min_stock)} {p.unit}
                      </td>
                      <td>
                        <span
                          className={`badge ${Number(p.stock) > Number(p.min_stock) ? 'badge-green' : 'badge-amber'}`}
                        >
                          {Number(p.stock) > Number(p.min_stock) ? 'Aman' : 'Menipis'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <Empty />}
            </div>
          </>
        )}
        {tab === 'in' && (
          <div className="stock-tab-content">
            <div className="form-card stock-form-card">
              <div className="section-heading">
                <h2>Catat barang masuk</h2>
              </div>
              <form onSubmit={saveReceipt}>
                <div className="form-grid form-grid-2 incoming-meta">
                  <Field label="Tanggal">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Supplier">
                    <div className="select-with-action">
                      <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                        <option value="">Tanpa supplier</option>
                        {suppliers.map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {user.role === 'owner' && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setSupplierModal(true)}
                        >
                          Baru
                        </button>
                      )}
                    </div>
                  </Field>
                </div>
                <div className="receipt-form-lines">
                  {receiptItems.map((item, i) => (
                    <div className="receipt-form-line" key={i}>
                      <Field label="Buah">
                        <select
                          value={item.product_id}
                          onChange={(e) =>
                            setReceiptItems((a) =>
                              a.map((x, j) => (j === i ? { ...x, product_id: e.target.value } : x)),
                            )
                          }
                          required
                        >
                          <option value="">Pilih buah…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Jumlah">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            setReceiptItems((a) =>
                              a.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)),
                            )
                          }
                          required
                          placeholder="Jumlah"
                        />
                      </Field>
                      <Field label="Harga beli">
                        <div className="purchase-input">
                          <span>Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={item.unit_cost}
                            onChange={(e) =>
                              setReceiptItems((a) =>
                                a.map((x, j) =>
                                  j === i ? { ...x, unit_cost: e.target.value } : x,
                                ),
                              )
                            }
                            required
                            placeholder="0"
                          />
                        </div>
                      </Field>
                      <button
                        type="button"
                        className="icon-btn danger-icon"
                        disabled={receiptItems.length === 1}
                        onClick={() => setReceiptItems((a) => a.filter((_, j) => j !== i))}
                        aria-label="Hapus barang"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-outline add-line"
                  onClick={() =>
                    setReceiptItems((a) => [...a, { product_id: '', quantity: '', unit_cost: '' }])
                  }
                >
                  <Plus size={15} /> Tambah barang
                </button>
                <Field label="Catatan">
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opsional"
                  />
                </Field>
                <div className="form-bottom">
                  <span>
                    Total pembelian{' '}
                    <strong>
                      {money(
                        receiptItems.reduce(
                          (n, x) => n + (Number(x.quantity) || 0) * (Number(x.unit_cost) || 0),
                          0,
                        ),
                      )}
                    </strong>
                  </span>
                  <button className="btn btn-primary" disabled={busy}>
                    {busy ? 'Menyimpan…' : 'Simpan barang masuk'}
                  </button>
                </div>
              </form>
            </div>
            <h3 className="subsection-title">Riwayat barang masuk</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Supplier</th>
                    <th>Barang</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {new Date(r.receipt_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>{r.supplier_name || 'Tanpa supplier'}</td>
                      <td>{r.items_label}</td>
                      <td>
                        <strong>{money(r.total)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!receipts.length && <Empty title="Belum ada barang masuk" />}
            </div>
          </div>
        )}
        {tab === 'spoil' && (
          <div className="stock-tab-content">
            <div className="form-card stock-form-card compact-form">
              <div className="section-heading">
                <div>
                  <h2>Catat susut</h2>
                  <p>Untuk buah yang busuk, rusak, hilang, atau dipakai sebagai sampel.</p>
                </div>
              </div>
              <form onSubmit={saveSpoilage}>
                <div className="form-grid form-grid-3 spoil-grid">
                  <Field label="Buah">
                    <select
                      value={spoiled.product_id}
                      onChange={(e) => setSpoiled((s) => ({ ...s, product_id: e.target.value }))}
                      required
                    >
                      <option value="">Pilih buah…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Jumlah">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={spoiled.quantity}
                      onChange={(e) => setSpoiled((s) => ({ ...s, quantity: e.target.value }))}
                      required
                      placeholder="Jumlah"
                    />
                  </Field>
                  <Field label="Alasan">
                    <select
                      value={spoiled.reason}
                      onChange={(e) => setSpoiled((s) => ({ ...s, reason: e.target.value }))}
                    >
                      {['Busuk', 'Rusak', 'Sampel / Dicicipi', 'Hilang', 'Lainnya'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Catatan">
                    <input
                      value={spoiled.notes}
                      onChange={(e) => setSpoiled((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Opsional"
                    />
                  </Field>
                  <div className="form-submit-cell">
                    <button className="btn btn-primary" disabled={busy}>
                      {busy ? 'Menyimpan…' : 'Catat susut'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <h3 className="subsection-title">Riwayat susut</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Buah</th>
                    <th>Jumlah</th>
                    <th>Alasan</th>
                    <th>Dicatat oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {spoil.map((s) => (
                    <tr key={s.id}>
                      <td>{dateTime(s.created_at)}</td>
                      <td>
                        <strong>{s.product_name}</strong>
                      </td>
                      <td className="negative">
                        − {s.quantity} {s.unit}
                      </td>
                      <td>{s.reason}</td>
                      <td>{s.user_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!spoil.length && <Empty title="Belum ada susut tercatat" />}
            </div>
          </div>
        )}
        {tab === 'opname' && (
          <div className="stock-tab-content opname-content">
            <div className="section-heading opname-heading">
              <div>
                <h2>Stock opname</h2>
                <p>
                  Hitung stok sebenarnya di toko, isi di kolom Stok fisik. Buah yang dibiarkan
                  kosong tidak diubah.
                </p>
              </div>
            </div>
            <form onSubmit={saveOpname}>
              <div className="table-scroll">
                <table className="opname-table">
                  <thead>
                    <tr>
                      <th>Buah</th>
                      <th>Stok sistem</th>
                      <th>Stok fisik</th>
                      <th>Selisih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products
                      .filter((p) => p.active)
                      .map((p, i) => {
                        const entered = physical[p.id] !== undefined && physical[p.id] !== '';
                        const diff = entered ? Number(physical[p.id]) - Number(p.stock) : null;
                        return (
                          <tr key={p.id}>
                            <td>
                              <span className={`table-fruit color-${i % 5}`}>●</span>
                              <strong>{p.name}</strong>
                            </td>
                            <td>
                              {Number(p.stock)} {p.unit}
                            </td>
                            <td>
                              <div className="opname-physical">
                                <input
                                  className="table-input"
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  placeholder="Belum dihitung"
                                  value={physical[p.id] ?? ''}
                                  onChange={(e) =>
                                    setPhysical((v) => ({ ...v, [p.id]: e.target.value }))
                                  }
                                  aria-label={`Stok fisik ${p.name}`}
                                />
                                <small>{p.unit}</small>
                              </div>
                            </td>
                            <td
                              className={
                                !entered ? '' : diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''
                              }
                            >
                              {entered ? `${diff > 0 ? '+' : ''}${diff} ${p.unit}` : ''}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div className="opname-footer">
                <Field label="Catatan">
                  <input
                    value={opnameNotes}
                    onChange={(e) => setOpnameNotes(e.target.value)}
                    placeholder="Opsional, mis. hitung ulang akhir bulan"
                  />
                </Field>
                <button
                  className="btn btn-primary"
                  disabled={
                    busy ||
                    !products.some(
                      (p) => p.active && physical[p.id] !== undefined && physical[p.id] !== '',
                    )
                  }
                >
                  {busy ? 'Menyimpan…' : 'Simpan hasil hitung'}
                </button>
              </div>
            </form>
            <h3 className="subsection-title">Riwayat penyesuaian</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Buah</th>
                    <th>Sistem</th>
                    <th>Fisik</th>
                    <th>Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {opnames.map((o) => (
                    <tr key={o.item_id}>
                      <td>{dateTime(o.created_at)}</td>
                      <td>
                        <strong>{o.product_name}</strong>
                      </td>
                      <td>
                        {o.system_stock} {o.unit}
                      </td>
                      <td>
                        {o.physical_stock} {o.unit}
                      </td>
                      <td
                        className={
                          Number(o.difference) > 0
                            ? 'positive'
                            : Number(o.difference) < 0
                              ? 'negative'
                              : ''
                        }
                      >
                        {Number(o.difference) > 0 ? '+' : ''}
                        {o.difference} {o.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!opnames.length && <Empty title="Belum ada penyesuaian stok" />}
            </div>
          </div>
        )}
      </section>
      {detail && (
        <Modal title={`Detail stok · ${detail.name}`} onClose={() => setDetail(null)} wide>
          <div className="stock-detail-hero">
            <div>
              <span>STOK SAAT INI</span>
              <strong>
                {Number(detail.stock)} <small>{detail.unit}</small>
              </strong>
            </div>
            <div>
              <span>STOK MINIMUM</span>
              <strong>
                {Number(detail.min_stock)} <small>{detail.unit}</small>
              </strong>
            </div>
            <span
              className={`badge ${Number(detail.stock) > Number(detail.min_stock) ? 'badge-green' : 'badge-amber'}`}
            >
              {Number(detail.stock) > Number(detail.min_stock) ? 'Aman' : 'Menipis'}
            </span>
          </div>
          <h3 className="subsection-title">60 pergerakan terakhir</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Jenis</th>
                  <th>Jumlah</th>
                  <th>Dicatat oleh</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{dateTime(m.created_at)}</td>
                    <td>{m.movement_type}</td>
                    <td className={Number(m.quantity) > 0 ? 'positive' : 'negative'}>
                      {Number(m.quantity) > 0 ? '+' : ''}
                      {m.quantity} {m.unit}
                    </td>
                    <td>{m.user_name || 'Sistem'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!movements.length && <Empty title="Belum ada pergerakan" />}
          </div>
        </Modal>
      )}
      {supplierModal && (
        <Modal title="Supplier baru" onClose={() => setSupplierModal(false)}>
          <form onSubmit={newSupplier}>
            <Field label="Nama supplier">
              <input name="name" required autoFocus />
            </Field>
            <Field label="Telepon">
              <input name="phone" required />
            </Field>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSupplierModal(false)}
              >
                Batal
              </button>
              <button className="btn btn-primary" disabled={busy}>
                Simpan supplier
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Laporan() {
  const [from, setFrom] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toLocaleDateString('en-CA');
    }),
    [to, setTo] = useState(today()),
    [mode, setMode] = useState('sales'),
    [report, setReport] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [showTable, setShowTable] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const r = await api(`/laporan?from=${from}&to=${to}`);
      setReport(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [from, to]);
  function range(kind) {
    const d = new Date();
    if (kind === '7') d.setDate(d.getDate() - 6);
    else if (kind === '30') d.setDate(d.getDate() - 29);
    else d.setDate(1);
    setFrom(d.toLocaleDateString('en-CA'));
    setTo(today());
  }
  const metrics = report?.daily || [];
  const margin = report?.summary.sales
    ? Math.round((report.summary.gross_profit / report.summary.sales) * 1000) / 10
    : 0;
  const average = report?.summary.transactions
    ? report.summary.sales / report.summary.transactions
    : 0;
  const delta = report?.summary.sales_change_percent;
  const salesTrend =
    delta === null ? (
      'Belum ada data periode sebelumnya'
    ) : (
      <span className={delta < 0 ? 'trend-down' : 'trend-up'}>
        {delta < 0 ? '▼ Turun' : '▲ Naik'} {Math.abs(delta)}% dari periode sebelumnya
      </span>
    );
  const bestMax = Math.max(1, ...(report?.best_sellers || []).map((p) => Number(p.sales)));
  const paymentTotal = (report?.payments || []).reduce((sum, p) => sum + Number(p.total), 0);
  return (
    <>
      <PageTitle
        eyebrow="ANALITIK TOKO"
        title="Laporan"
        description="Ringkasan penjualan, laba, dan stok toko."
      />
      <div className="report-filter-row">
        <div className="range-tools">
          <Field label="Dari">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Sampai">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="range-shortcuts">
          <button onClick={() => range('7')}>7 hari</button>
          <button onClick={() => range('30')}>30 hari</button>
          <button onClick={() => range('month')}>Bulan ini</button>
        </div>
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <div className="center-loading">
          <span className="spinner" />
          Menghitung laporan…
        </div>
      ) : (
        report && (
          <>
            <div className="metric-grid">
              <Metric
                label="Penjualan"
                value={money(report.summary.sales)}
                icon={TrendingUp}
                tone="green"
                note={salesTrend}
              />
              <Metric
                label="Laba kotor"
                value={money(report.summary.gross_profit)}
                icon={BarChart3}
                tone="plum"
                note={report.summary.sales ? `Margin ${margin}%` : 'Belum ada penjualan'}
              />
              <Metric
                label="Transaksi"
                value={report.summary.transactions}
                icon={ShoppingBag}
                tone="gold"
                note={
                  report.summary.transactions
                    ? `Rata-rata ${money(average)}`
                    : 'Belum ada transaksi'
                }
              />
              <Metric
                label="Laba setelah susut"
                value={money(report.summary.after_spoilage)}
                icon={CircleAlert}
                tone="peach"
                note={`Susut ${money(report.summary.spoilage_cost)}`}
              />
            </div>
            <section className="panel chart-panel">
              <div className="section-heading">
                <div>
                  <h2>Penjualan harian</h2>
                  <p>Ringkasan penjualan per hari pada periode ini.</p>
                </div>
                <div className="chart-toggle">
                  <button
                    className={mode === 'sales' ? 'selected' : ''}
                    onClick={() => setMode('sales')}
                  >
                    Penjualan
                  </button>
                  <button
                    className={mode === 'profit' ? 'selected' : ''}
                    onClick={() => setMode('profit')}
                  >
                    Laba kotor
                  </button>
                </div>
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#dce3d8" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                      }
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#62675f' }}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(0)} jt`
                          : v >= 1000
                            ? `${Math.round(v / 1000)} rb`
                            : v
                      }
                      tickLine={false}
                      axisLine={false}
                      width={45}
                      tick={{ fontSize: 11, fill: '#62675f' }}
                    />
                    <Tooltip
                      formatter={(v) => money(v)}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString('id-ID', { dateStyle: 'full' })
                      }
                    />
                    <Bar
                      dataKey={mode === 'sales' ? 'sales' : 'gross_profit'}
                      fill="#287b50"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="panel daily-panel">
              <button
                className="collapse-toggle"
                onClick={() => setShowTable((x) => !x)}
                aria-expanded={showTable}
                aria-controls="daily-sales-table"
              >
                <ChevronRight size={16} className={showTable ? 'rotated' : ''} />
                <span>Lihat data harian sebagai tabel</span>
              </button>
              {showTable && (
                <div className="table-scroll" id="daily-sales-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Transaksi</th>
                        <th>Penjualan</th>
                        <th>Laba kotor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((d) => (
                        <tr key={d.date}>
                          <td>
                            {new Date(d.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                          </td>
                          <td>{d.transactions}</td>
                          <td>{money(d.sales)}</td>
                          <td>{money(d.gross_profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <div className="report-grid">
              <section className="panel report-card best-sellers-card">
                <div className="section-heading">
                  <h2>Buah terlaris</h2>
                  <p>Berdasarkan nilai penjualan</p>
                </div>
                {report.best_sellers.length ? (
                  report.best_sellers.map((p, i) => (
                    <div className="rank-row" key={`${p.name}-${p.unit}`}>
                      <div className="rank-row-main">
                        <span className="rank-number">{i + 1}.</span>
                        <span className="rank-name">
                          <strong>{p.name}</strong>
                        </span>
                        <b>
                          {Number(p.quantity)} {p.unit} · {money(p.sales)}
                        </b>
                      </div>
                      <div className="rank-progress">
                        <i
                          style={{ width: `${Math.max(4, (Number(p.sales) / bestMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="Belum ada penjualan"
                    text="Data buah terlaris tampil setelah ada transaksi."
                  />
                )}
              </section>
              <div className="report-side-column">
                <section className="panel report-card payment-card">
                  <div className="section-heading">
                    <h2>Metode pembayaran</h2>
                  </div>
                  <div className="payment-stack">
                    {[
                      ['Tunai', '#347ed1'],
                      ['QRIS', '#e45e34'],
                      ['Transfer', '#26a37c'],
                    ].map(([method, color]) => {
                      const value = report.payments.find((x) => x.method === method)?.total || 0;
                      return (
                        <i
                          key={method}
                          style={{
                            width: `${paymentTotal ? (Number(value) / paymentTotal) * 100 : 0}%`,
                            background: color,
                          }}
                        />
                      );
                    })}
                  </div>
                  {['Tunai', 'QRIS', 'Transfer'].map((method) => {
                    const p = report.payments.find((x) => x.method === method),
                      total = paymentTotal,
                      percent = total ? (Number(p?.total || 0) / total) * 100 : 0;
                    return (
                      <div className="payment-report-row" key={method}>
                        <div className="payment-report-title">
                          <strong>
                            <i className={`payment-dot payment-dot-${method.toLowerCase()}`} />
                            {method}
                          </strong>
                          <span>{p?.transactions || 0} transaksi</span>
                          <span className="payment-percent">
                            {percent.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
                          </span>
                          <b>{money(p?.total || 0)}</b>
                        </div>
                      </div>
                    );
                  })}
                </section>
                <section className="panel low-stock-panel">
                  <div className="section-heading">
                    <h2>Perlu diisi ulang</h2>
                  </div>
                  {report.low_stock.length ? (
                    <div className="low-stock-list">
                      {report.low_stock.map((p) => (
                        <div key={p.id}>
                          <strong>{p.name}</strong>
                          <b className="low-stock-quantity">
                            Sisa {p.stock} {p.unit}
                          </b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="safe-stock">
                      <span>✓</span> Semua stok berada di atas batas minimum.
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}
function Metric({ label, value, icon: Icon, tone, note }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Produk() {
  const [products, setProducts] = useState([]),
    [showInactive, setShowInactive] = useState(false),
    [query, setQuery] = useState(''),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function load() {
    try {
      const r = await api('/produk?all=true');
      setProducts(r.data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const rows = products.filter(
    (p) => (showInactive || p.active) && p.name.toLowerCase().includes(query.toLowerCase()),
  );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.target),
      payload = {
        name: f.get('name'),
        category: f.get('category'),
        unit: f.get('unit'),
        price: Number(f.get('price')),
        cost: Number(f.get('cost')),
        min_stock: Number(f.get('min_stock')),
        active: f.get('active') === 'on',
      };
    try {
      if (modal.id)
        await api(`/produk/${modal.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/produk', { method: 'POST', body: JSON.stringify(payload) });
      setModal(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="KATALOG INVENTORI"
        title="Produk"
        description="Atur daftar buah, harga jual, dan harga modal. Stok diubah lewat menu Stok."
        action={
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={16} /> Produk baru
          </button>
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Cari buah…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />{' '}
            Tampilkan yang nonaktif
          </label>
        </div>
        <ErrorBox message={error} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Buah</th>
                <th>Harga jual</th>
                <th>Harga modal</th>
                <th>Margin</th>
                <th>Stok</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr className="click-row" key={p.id} onClick={() => setModal(p)}>
                  <td>
                    <span className={`table-fruit color-${i % 5}`}>●</span>
                    <strong>{p.name}</strong>
                    <small className="unit-small">
                      {p.category === 'lokal' ? 'Buah lokal' : 'Buah impor'}
                    </small>
                  </td>
                  <td>
                    {money(p.price)}/{p.unit}
                  </td>
                  <td>{money(p.cost)}</td>
                  <td className="positive">
                    {Math.round(
                      ((Number(p.price) - Number(p.cost)) / Math.max(1, Number(p.price))) * 100,
                    )}
                    %
                  </td>
                  <td>
                    {Number(p.stock)} {p.unit}
                  </td>
                  <td>
                    <span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>
                      {p.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty title="Produk tidak ditemukan" />}
        </div>
      </section>
      {modal && (
        <Modal
          title={modal.id ? `Ubah ${modal.name}` : 'Produk baru'}
          onClose={() => setModal(null)}
          className="product-edit-modal"
        >
          <form onSubmit={save}>
            <Field label="Nama buah">
              <input name="name" defaultValue={modal.name || ''} required autoFocus />
            </Field>
            <div className="form-grid form-grid-2">
              <Field label="Kategori">
                <select name="category" defaultValue={modal.category || 'lokal'} required>
                  <option value="lokal">Buah lokal</option>
                  <option value="impor">Buah impor</option>
                </select>
              </Field>
              <Field label="Satuan jual">
                <select name="unit" defaultValue={modal.unit || 'kg'} required>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="pcs">Buah / biji (pcs)</option>
                  <option value="pack">Kemasan (pack)</option>
                </select>
              </Field>
              <Field label="Harga jual (Rp)">
                <input
                  name="price"
                  type="number"
                  min="0"
                  defaultValue={modal.price || ''}
                  required
                />
              </Field>
              <Field label="Harga modal (Rp)">
                <input name="cost" type="number" min="0" defaultValue={modal.cost || ''} required />
                <small>Harga beli per satuan. Hanya terlihat oleh pemilik.</small>
              </Field>
            </div>
            <p className="product-margin-note">
              Untung {money(Number(modal.price || 0) - Number(modal.cost || 0))} per{' '}
              {modal.unit || 'kg'} (
              {modal.price
                ? Math.round(
                    ((Number(modal.price) - Number(modal.cost || 0)) / Number(modal.price)) * 100,
                  )
                : 0}
              %).
            </p>
            <div className="form-grid form-grid-2 product-min-row">
              <Field label="Stok minimum">
                <input
                  name="min_stock"
                  type="number"
                  min="0"
                  step="0.001"
                  defaultValue={modal.min_stock ?? ''}
                  required
                />
                <small>Di bawah angka ini buah ditandai menipis.</small>
              </Field>
              <label className="checkbox-label product-active">
                <input name="active" type="checkbox" defaultChecked={modal.active !== false} />{' '}
                Dijual (tampil di kasir)
              </label>
            </div>
            <ErrorBox message={error} />
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
                Batal
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Pengguna({ currentUser }) {
  const [users, setUsers] = useState([]),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function load() {
    try {
      const r = await api('/pengguna');
      setUsers(r.data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.target);
    try {
      if (modal.id) {
        await api(`/pengguna/${modal.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: f.get('name'),
            role: f.get('role'),
            active: f.get('active') === 'on',
          }),
        });
      } else {
        await api('/pengguna', {
          method: 'POST',
          body: JSON.stringify({
            name: f.get('name'),
            email: f.get('email'),
            password: f.get('password'),
            role: f.get('role'),
          }),
        });
      }
      setModal(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="AKSES TIM TOKO"
        title="Pengguna"
        description="Akun yang bisa masuk ke aplikasi. Ketuk baris untuk mengubah peran atau menonaktifkan."
        action={
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={16} /> Pengguna baru
          </button>
        }
      />
      <section className="panel">
        <ErrorBox message={error} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Peran</th>
                <th>Status</th>
                <th>Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr className="click-row" key={u.id} onClick={() => setModal(u)}>
                  <td>
                    <strong>
                      {u.name}
                      {u.id === currentUser.id && <small className="you-tag">(Anda)</small>}
                    </strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-pill ${u.role}`}>
                      {u.role === 'owner' ? 'Pemilik' : 'Kasir'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-green' : 'badge-gray'}`}>
                      {u.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    {new Date(u.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <Empty title="Belum ada pengguna" />}
        </div>
      </section>
      {modal && (
        <Modal
          title={modal.id ? `Ubah ${modal.name}` : 'Pengguna baru'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={save}>
            {modal.id && <p className="account-email">{modal.email}</p>}
            <Field label="Nama">
              <input name="name" defaultValue={modal.name || ''} required autoFocus />
            </Field>
            {!modal.id && (
              <>
                <Field label="Email">
                  <input type="email" name="email" required />
                </Field>
                <Field label="Kata sandi">
                  <input type="password" name="password" minLength="8" required />
                  <small>Minimal 8 karakter.</small>
                </Field>
              </>
            )}
            <Field label="Peran">
              <select name="role" defaultValue={modal.role || 'cashier'}>
                <option value="cashier">Kasir</option>
                <option value="owner">Pemilik</option>
              </select>
            </Field>
            {modal.id && (
              <label className="checkbox-label product-active">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={modal.active}
                  disabled={modal.id === currentUser.id && !modal.active}
                />{' '}
                Akun aktif
                {modal.id === currentUser.id && (
                  <small> Anda tidak dapat menonaktifkan akun sendiri.</small>
                )}
              </label>
            )}
            <ErrorBox message={error} />
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
                Batal
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
