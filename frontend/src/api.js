const BASE = import.meta.env.VITE_API_URL || '/api';
export async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let body = {};
  try {
    body = await res.json();
  } catch {}
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'));
    throw new Error(body.error || 'Permintaan gagal.');
  }
  return body;
}
export const money = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const dateTime = (value) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
export const today = () => new Date().toLocaleDateString('en-CA');
