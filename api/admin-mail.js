import { neon } from '@neondatabase/serverless';
import { adminPasswordConfigured, verifyAdminPassword } from '../lib/adminAuth.js';
import { checkRateLimit, clientIp, rejectRateLimited } from '../lib/rateLimit.js';
import { classCouponWeapon, mythicAccessoryCoupon, mythicWeaponCoupon } from '../src/data/equipment.js';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

const ITEM_PRESETS = ['none', 'gacha', 'class-weapon', 'mythic-weapon', 'mythic-accessory'];

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

// 우편함에 직접 편지를 꽂아 넣는 운영자 도구. 아이템 프리셋은 대상 캐릭터의
// classId/level을 DB에서 읽어와 그 자리에서 실제 장비 오브젝트를 만든다
// (직업 전용 무기는 직업이 없는 계정에는 지급할 수 없다).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!sql) return res.status(503).json({ ok: false, error: 'database_not_configured' });
  // This checks the admin password directly (no session cookie shortcut),
  // so it shares admin-login's brute-force budget rather than opening a
  // second, unguarded way to guess it.
  const limit = await checkRateLimit({ bucket: 'admin-password', key: clientIp(req), limit: 5, windowSeconds: 600 });
  if (!limit.allowed) return rejectRateLimited(res, limit.retryAfter);
  if (!adminPasswordConfigured()) return res.status(503).json({ ok: false, error: 'admin_password_not_configured' });
  if (!verifyAdminPassword(req.body?.password)) return res.status(401).json({ ok: false, error: 'invalid_password' });

  const nickname = safeNickname(req.body?.nickname);
  if (!nickname) return res.status(400).json({ ok: false, error: 'invalid_request' });
  const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim().slice(0, 60) : '길드의 선물';
  const body = typeof req.body?.body === 'string' && req.body.body.trim() ? req.body.body.trim().slice(0, 240) : '운영자가 보낸 선물입니다.';
  const gold = req.body?.gold != null && req.body.gold !== '' ? Math.max(0, Math.round(Number(req.body.gold))) : 0;
  const itemPreset = ITEM_PRESETS.includes(req.body?.itemPreset) ? req.body.itemPreset : 'none';

  try {
    await ensureTable();
    const rows = await sql`SELECT data FROM characters WHERE nickname = ${nickname}`;
    if (!rows.length) return res.status(404).json({ ok: false, error: 'not_found' });
    const character = rows[0].data ?? {};
    const classId = character.classId ?? null;
    const level = character.level ?? 1;

    let item = null;
    if (itemPreset === 'class-weapon') {
      item = classCouponWeapon(classId, level);
      if (!item) return res.status(400).json({ ok: false, error: 'no_class' });
    } else if (itemPreset === 'mythic-weapon') {
      item = mythicWeaponCoupon(classId, level);
    } else if (itemPreset === 'mythic-accessory') {
      item = mythicAccessoryCoupon(level);
    }

    const mailbox = Array.isArray(character.mailbox) ? character.mailbox : [];
    const mailEntry = {
      id: `mail-admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body,
      createdAt: Date.now(),
      ...(gold > 0 ? { gold } : {}),
      ...(itemPreset === 'gacha' ? { gachaEquipment: true } : {}),
      ...(item ? { item } : {}),
    };
    const updatedData = { ...character, mailbox: [...mailbox, mailEntry].slice(-200) };
    await sql`UPDATE characters SET data = ${JSON.stringify(updatedData)}, updated_at = now() WHERE nickname = ${nickname}`;

    return res.json({ ok: true, mail: mailEntry });
  } catch (err) {
    console.error('Admin mail send failed:', err);
    return res.status(502).json({ ok: false, error: 'server_error' });
  }
}
