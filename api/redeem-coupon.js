import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

// Server-only: the client never sees these strings. It only learns which
// *effect* a code grants after the server has already validated it, which
// is enough for the client to apply the (non-secret) reward locally.
const COUPONS = {
  '최유호는 너무 멋져': { effect: 'weapon' },
  '최유호는 아쿠마다': { effect: 'drain' },
  '황금폭풍': { effect: 'gold', amount: 30000 },
  'EG-KGLA-XKCW-AMSE': { effect: 'gold', amount: 200000 },
};

function safeNickname(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 20);
  return trimmed || null;
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS characters (
      nickname TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, reason: 'method_not_allowed' });
  }
  if (!sql) return res.status(503).json({ ok: false, reason: 'unavailable' });

  const nickname = safeNickname(req.body?.nickname);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim().slice(0, 40) : '';
  if (!nickname || !code) return res.status(400).json({ ok: false, reason: 'invalid_request' });

  const coupon = COUPONS[code];
  if (!coupon) return res.json({ ok: false, reason: 'invalid' });

  try {
    await ensureTable();
    const rows = await sql`SELECT data FROM characters WHERE nickname = ${nickname}`;
    if (!rows.length) return res.status(404).json({ ok: false, reason: 'not_found' });
    const character = rows[0].data ?? {};
    const redeemed = Array.isArray(character.redeemedCoupons) ? character.redeemedCoupons : [];
    if (redeemed.includes(code)) return res.json({ ok: false, reason: 'used' });

    const updatedData = { ...character, redeemedCoupons: [...redeemed, code].slice(-50) };
    await sql`UPDATE characters SET data = ${JSON.stringify(updatedData)}, updated_at = now() WHERE nickname = ${nickname}`;

    return res.json({ ok: true, effect: coupon.effect, amount: coupon.amount ?? null });
  } catch (err) {
    console.error('Coupon redeem failed:', err);
    return res.status(502).json({ ok: false, reason: 'server_error' });
  }
}
