import jwt from 'jsonwebtoken';
import { pool } from './db.js';
const secret = () => process.env.JWT_SECRET || 'local-only-change-me-please-32-characters';
export async function auth(req, res, next) {
  try {
    const token = req.cookies?.toko_session || req.get('authorization')?.replace(/^Bearer /, '');
    if (!token) return res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' });
    const payload = jwt.verify(token, secret());
    const { rows } = await pool.query('SELECT id,name,email,role,active FROM users WHERE id=$1', [
      payload.sub,
    ]);
    if (!rows[0]?.active) return res.status(401).json({ error: 'Akun tidak aktif.' });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Sesi berakhir. Silakan masuk kembali.' });
  }
}
export const ownerOnly = (req, res, next) =>
  req.user?.role === 'owner'
    ? next()
    : res.status(403).json({ error: 'Akses hanya untuk pemilik.' });
export function issueToken(user) {
  return jwt.sign({ sub: user.id }, secret(), { expiresIn: '8h' });
}
