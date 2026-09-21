import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

let tableReady = null;
function ensureTable() {
  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket TEXT NOT NULL,
      key TEXT NOT NULL,
      window_start BIGINT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (bucket, key)
    )
  `.catch((err) => { tableReady = null; throw err; });
  return tableReady;
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Fixed-window limiter backed by Postgres, since Vercel serverless functions
// don't share memory across invocations/instances - an in-process counter
// would reset constantly and give no real protection. Fails open (allows
// the request) when no DB is configured or the limiter query itself errors;
// a broken limiter should never be the reason the game goes down.
export async function checkRateLimit({ bucket, key, limit, windowSeconds }) {
  if (!sql) return { allowed: true };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  try {
    await ensureTable();
    const rows = await sql`
      INSERT INTO rate_limits (bucket, key, window_start, count)
      VALUES (${bucket}, ${key}, ${windowStart}, 1)
      ON CONFLICT (bucket, key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start = ${windowStart} THEN rate_limits.count + 1 ELSE 1 END,
        window_start = ${windowStart}
      RETURNING count
    `;
    const count = rows[0]?.count ?? 1;
    if (count > limit) {
      return { allowed: false, retryAfter: Math.max(1, windowStart + windowSeconds - nowSeconds) };
    }
    return { allowed: true };
  } catch (err) {
    console.error(`Rate limit check failed (${bucket}):`, err);
    return { allowed: true };
  }
}

export function rejectRateLimited(res, retryAfter) {
  res.setHeader('Retry-After', String(retryAfter));
  return res.status(429).json({ error: 'rate_limited' });
}
