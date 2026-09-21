import { neon } from '@neondatabase/serverless';
import { adminPasswordConfigured, hasValidAdminSession, isMasterNickname, verifyAdminPassword } from '../lib/adminAuth.js';
import { checkRateLimit, clientIp, rejectRateLimited } from '../lib/rateLimit.js';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

const VALID_EFFECTS = ['gold', 'weapon', 'mythic-weapon', 'mythic-accessory', 'drain', 'enhance', 'levelup'];
const AMOUNT_REQUIRED_EFFECTS = ['gold', 'enhance', 'levelup'];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      effect TEXT NOT NULL,
      amount INTEGER,
      reusable BOOLEAN NOT NULL DEFAULT false,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

// Reusable coupon-management tool: create/update, list, or disable coupon
// codes directly against the coupons table, without a code deploy. Two ways
// in: the same admin-login session cookie the in-game Settings screen
// already holds for a logged-in master account, or the raw admin password
// for scripting/curl use outside the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!sql) return res.status(503).json({ ok: false, error: 'database_not_configured' });

  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  const hasSession = nickname && isMasterNickname(nickname) && hasValidAdminSession(req, nickname);
  const hasPassword = adminPasswordConfigured() && verifyAdminPassword(req.body?.password);
  if (!hasSession && !hasPassword) {
    // Only a failed/absent credential spends the shared admin-login budget -
    // admin.html resends the (correct) password on every single action
    // (list/create/disable/...), so limiting successes too would lock
    // legitimate use out after a handful of clicks.
    const limit = await checkRateLimit({ bucket: 'admin-password', key: clientIp(req), limit: 5, windowSeconds: 600 });
    if (!limit.allowed) return rejectRateLimited(res, limit.retryAfter);
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  await ensureTable();
  const action = typeof req.body?.action === 'string' ? req.body.action : 'create';

  if (action === 'list') {
    const rows = await sql`SELECT code, effect, amount, reusable, enabled, created_at FROM coupons ORDER BY created_at DESC`;
    return res.json({ ok: true, coupons: rows });
  }

  if (action === 'disable') {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) return res.status(400).json({ ok: false, error: 'invalid_request' });
    await sql`UPDATE coupons SET enabled = false WHERE code = ${code}`;
    return res.json({ ok: true });
  }

  // action === 'create' (default): insert a new coupon, or update+re-enable an existing one.
  const code = typeof req.body?.code === 'string' ? req.body.code.trim().slice(0, 60) : '';
  const effect = typeof req.body?.effect === 'string' ? req.body.effect : '';
  const amount = req.body?.amount != null && req.body.amount !== '' ? Math.max(0, Math.round(Number(req.body.amount))) : null;
  const reusable = req.body?.reusable === true;
  if (!code || !VALID_EFFECTS.includes(effect)) return res.status(400).json({ ok: false, error: 'invalid_request' });
  if (AMOUNT_REQUIRED_EFFECTS.includes(effect) && !(amount > 0)) return res.status(400).json({ ok: false, error: 'amount_required' });

  await sql`
    INSERT INTO coupons (code, effect, amount, reusable, enabled)
    VALUES (${code}, ${effect}, ${amount}, ${reusable}, true)
    ON CONFLICT (code) DO UPDATE SET effect = excluded.effect, amount = excluded.amount, reusable = excluded.reusable, enabled = true
  `;
  return res.json({ ok: true, code, effect, amount, reusable });
}
