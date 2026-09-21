import { neon } from '@neondatabase/serverless';
import { hasValidAdminSession, isMasterNickname } from '../lib/adminAuth.js';
import { checkRateLimit, clientIp, rejectRateLimited } from '../lib/rateLimit.js';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;
const CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric', 'rogue'];
const CLASS_WEAPONS = {
  warrior: { name: '창세의 대검', color: 0xff4c55, attack: 138, agility: 8 },
  mage: { name: '성좌의 마도 지팡이', color: 0xb16cff, attack: 152, agility: 10 },
  ranger: { name: '천공의 장궁', color: 0x6ee68a, attack: 145, agility: 18 },
  cleric: { name: '새벽의 성전 철퇴', color: 0xffd45f, attack: 128, agility: 7 },
  rogue: { name: '영원의 쌍단검', color: 0x8b72df, attack: 148, agility: 22 },
};

function safeNickname(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 20);
  return trimmed || null;
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS attendance_claims (
      nickname TEXT NOT NULL,
      attendance_date DATE NOT NULL,
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (nickname, attendance_date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS attendance_rewards (
      nickname TEXT PRIMARY KEY,
      rewarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

function attendanceWeapon(classId, level) {
  const weapon = CLASS_WEAPONS[classId];
  if (!weapon) return null;
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: `attendance-7day-${classId}-${unique}`,
    catalogId: `attendance-7day-${classId}`,
    name: `칠일의 맹세 · ${weapon.name}`,
    type: 'equipment', slot: 'weapon', rarity: 'mythic', biome: 'celestial', color: weapon.color,
    classId, enhancement: 11, level, stats: { attack: weapon.attack, defense: 0, hp: 0, mp: 18, agility: weapon.agility },
    value: 280000, source: 'attendance-7day', quantity: 1, durability: 100, maxDurability: 100,
  };
}

async function statusFor(nickname) {
  const rows = await sql`
    SELECT
      LEAST((SELECT COUNT(*)::int FROM attendance_claims WHERE nickname = ${nickname}), 7) AS days,
      EXISTS(
        SELECT 1 FROM attendance_claims
        WHERE nickname = ${nickname} AND attendance_date = (now() AT TIME ZONE 'Asia/Seoul')::date
      ) AS today_claimed,
      EXISTS(SELECT 1 FROM attendance_rewards WHERE nickname = ${nickname}) AS reward_claimed,
      to_char((now() AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS server_date
  `;
  return rows[0];
}

export default async function handler(req, res) {
  if (!sql) return res.status(503).json({ error: 'Attendance database is not configured' });
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const nickname = safeNickname(req.method === 'GET' ? req.query.nickname : req.body?.nickname);
  if (!nickname) return res.status(400).json({ error: 'nickname is required' });
  if (isMasterNickname(nickname) && !hasValidAdminSession(req, nickname)) return res.status(401).json({ error: 'admin_auth_required' });
  const limit = await checkRateLimit({ bucket: 'attendance', key: `${clientIp(req)}:${nickname}`, limit: 20, windowSeconds: 60 });
  if (!limit.allowed) return rejectRateLimited(res, limit.retryAfter);

  try {
    await ensureTables();
    if (req.method === 'GET') {
      const [stored] = await sql`SELECT data FROM characters WHERE nickname = ${nickname}`;
      if (!stored) return res.status(404).json({ error: 'character_not_found' });
      const status = await statusFor(nickname);
      let repairedCharacter = null;
      const inventory = Array.isArray(stored.data?.inventory) ? stored.data.inventory : [];
      const hasReward = inventory.some((item) => item?.source === 'attendance-7day');
      if (status.reward_claimed && !hasReward && CLASS_IDS.includes(stored.data?.classId)) {
        const level = Math.max(1, Math.min(999, Math.round(Number(stored.data?.level) || 1)));
        const restoredReward = attendanceWeapon(stored.data.classId, level);
        const [updated] = await sql`
          UPDATE characters
          SET data = jsonb_set(data, '{inventory}', ${JSON.stringify([restoredReward])}::jsonb || COALESCE(data->'inventory', '[]'::jsonb), true),
              updated_at = now()
          WHERE nickname = ${nickname}
          RETURNING data
        `;
        repairedCharacter = updated?.data ?? null;
      }
      return res.json({
        days: Number(status.days), todayClaimed: status.today_claimed, rewardClaimed: status.reward_claimed,
        serverDate: status.server_date, character: repairedCharacter,
      });
    }

    const [stored] = await sql`SELECT data FROM characters WHERE nickname = ${nickname}`;
    if (!stored) return res.status(404).json({ error: 'character_not_found' });
    const classId = CLASS_IDS.includes(stored.data?.classId) ? stored.data.classId : null;
    if (!classId) return res.status(409).json({ error: 'class_required' });
    const level = Math.max(1, Math.min(999, Math.round(Number(stored.data?.level) || 1)));
    const reward = attendanceWeapon(classId, level);
    const rewardArray = JSON.stringify([reward]);

    const rows = await sql`
      WITH new_claim AS (
        INSERT INTO attendance_claims (nickname, attendance_date)
        VALUES (${nickname}, (now() AT TIME ZONE 'Asia/Seoul')::date)
        ON CONFLICT DO NOTHING
        RETURNING 1
      ), claim_total AS (
        SELECT LEAST(
          (SELECT COUNT(*)::int FROM attendance_claims WHERE nickname = ${nickname})
          + (SELECT COUNT(*)::int FROM new_claim),
          7
        ) AS days
      ), new_reward AS (
        INSERT INTO attendance_rewards (nickname)
        SELECT ${nickname} FROM claim_total WHERE days >= 7
        ON CONFLICT DO NOTHING
        RETURNING 1
      ), updated_character AS (
        UPDATE characters
        SET data = CASE WHEN EXISTS(SELECT 1 FROM new_reward)
          THEN jsonb_set(data, '{inventory}', ${rewardArray}::jsonb || COALESCE(data->'inventory', '[]'::jsonb), true)
          ELSE data END,
          updated_at = now()
        WHERE nickname = ${nickname}
        RETURNING data
      )
      SELECT
        EXISTS(SELECT 1 FROM new_claim) AS claimed,
        (SELECT days FROM claim_total) AS days,
        EXISTS(SELECT 1 FROM new_reward) AS reward_granted,
        (EXISTS(SELECT 1 FROM new_reward) OR EXISTS(SELECT 1 FROM attendance_rewards WHERE nickname = ${nickname})) AS reward_claimed,
        (SELECT data FROM updated_character) AS character,
        to_char((now() AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS server_date
    `;
    const result = rows[0];
    return res.json({
      claimed: result.claimed,
      days: Number(result.days),
      todayClaimed: true,
      rewardGranted: result.reward_granted,
      rewardClaimed: result.reward_claimed,
      reward: result.reward_granted ? reward : null,
      character: result.character,
      serverDate: result.server_date,
    });
  } catch (err) {
    console.error('Attendance failed:', err);
    return res.status(502).json({ error: 'Attendance unavailable' });
  }
}
