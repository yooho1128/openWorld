import { adminPasswordConfigured, createAdminCookie, isMasterNickname, masterClassId, verifyAdminPassword } from '../lib/adminAuth.js';
import { checkRateLimit, clientIp, rejectRateLimited } from '../lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Tight brute-force guard, shared with every other endpoint that checks
  // this same admin password (admin-coupon/admin-mail/admin-title-mail) -
  // otherwise guessing could just move to whichever of those isn't limited.
  const limit = await checkRateLimit({ bucket: 'admin-password', key: clientIp(req), limit: 5, windowSeconds: 600 });
  if (!limit.allowed) return rejectRateLimited(res, limit.retryAfter);

  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  if (!isMasterNickname(nickname)) return res.status(403).json({ error: 'forbidden' });
  if (!adminPasswordConfigured()) return res.status(503).json({ error: 'Admin password is not configured' });
  if (!verifyAdminPassword(req.body?.password)) return res.status(401).json({ error: 'invalid_password' });

  res.setHeader('Set-Cookie', createAdminCookie(nickname));
  return res.json({ ok: true, classId: masterClassId(nickname) });
}
