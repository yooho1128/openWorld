import { adminPasswordConfigured, createAdminCookie, isMasterNickname, masterClassId, verifyAdminPassword } from '../lib/adminAuth.js';
import { checkRateLimit, clientIp, rejectRateLimited } from '../lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Tight brute-force guard: only 5 nicknames exist and this endpoint is the
  // one place their password gets checked.
  const limit = await checkRateLimit({ bucket: 'admin-login', key: clientIp(req), limit: 5, windowSeconds: 600 });
  if (!limit.allowed) return rejectRateLimited(res, limit.retryAfter);

  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  if (!isMasterNickname(nickname)) return res.status(403).json({ error: 'forbidden' });
  if (!adminPasswordConfigured()) return res.status(503).json({ error: 'Admin password is not configured' });
  if (!verifyAdminPassword(req.body?.password)) return res.status(401).json({ error: 'invalid_password' });

  res.setHeader('Set-Cookie', createAdminCookie(nickname));
  return res.json({ ok: true, classId: masterClassId(nickname) });
}
