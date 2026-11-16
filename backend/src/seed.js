import bcrypt from 'bcryptjs';
import { pool } from './db.js';
const hash = await bcrypt.hash('BuahSegar123!', 10);
await pool.query(
  "UPDATE users SET password_hash=$1 WHERE email IN ('owner@tokobuah.local','kasir@tokobuah.local')",
  [hash],
);
console.log('Dev account passwords updated.');
await pool.end();
