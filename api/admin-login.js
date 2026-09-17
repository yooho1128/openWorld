import { adminPasswordConfigured, createAdminCookie, isMasterNickname, verifyAdminPassword } from '../lib/adminAuth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  if (!isMasterNickname(nickname)) return res.status(403).json({ error: 'forbidden' });
  if (!adminPasswordConfigured()) return res.status(503).json({ error: 'Admin password is not configured' });
  if (!verifyAdminPassword(req.body?.password)) return res.status(401).json({ error: 'invalid_password' });

  res.setHeader('Set-Cookie', createAdminCookie(nickname));
  return res.json({ ok: true });
}
