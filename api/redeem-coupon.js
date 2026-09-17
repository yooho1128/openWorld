import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

// Legacy thematic coupons, seeded into the coupons table on first run so
// every code path (redemption + the admin management tool) reads from one
// place instead of a hardcoded object here.
const SEED_COUPONS = [
  { code: '최유호는 너무 멋져', effect: 'weapon', amount: null },
  { code: '최유호는 아쿠마다', effect: 'drain', amount: null },
  { code: '황금폭풍', effect: 'gold', amount: 30000 },
];

function safeNickname(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 20);
  return trimmed || null;
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS characters (
      nickname TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
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
  for (const seed of SEED_COUPONS) {
    await sql`
      INSERT INTO coupons (code, effect, amount)
      VALUES (${seed.code}, ${seed.effect}, ${seed.amount})
      ON CONFLICT (code) DO NOTHING
    `;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, reason: 'method_not_allowed' });
  }
  if (!sql) return res.status(503).json({ ok: false, reason: 'unavailable' });

  const nickname = safeNickname(req.body?.nickname);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim().slice(0, 60) : '';
  if (!nickname || !code) return res.status(400).json({ ok: false, reason: 'invalid_request' });

  try {
    await ensureTables();
    const couponRows = await sql`SELECT effect, amount, reusable FROM coupons WHERE code = ${code} AND enabled = true`;
    if (!couponRows.length) return res.json({ ok: false, reason: 'invalid' });
    const coupon = couponRows[0];

    const rows = await sql`SELECT data FROM characters WHERE nickname = ${nickname}`;
    if (!rows.length) return res.status(404).json({ ok: false, reason: 'not_found' });
    const character = rows[0].data ?? {};
    const redeemed = Array.isArray(character.redeemedCoupons) ? character.redeemedCoupons : [];

    if (!coupon.reusable) {
      if (redeemed.includes(code)) return res.json({ ok: false, reason: 'used' });
      const updatedData = { ...character, redeemedCoupons: [...redeemed, code].slice(-50) };
      await sql`UPDATE characters SET data = ${JSON.stringify(updatedData)}, updated_at = now() WHERE nickname = ${nickname}`;
    }

    return res.json({ ok: true, effect: coupon.effect, amount: coupon.amount ?? null });
  } catch (err) {
    console.error('Coupon redeem failed:', err);
    return res.status(502).json({ ok: false, reason: 'server_error' });
  }
}
