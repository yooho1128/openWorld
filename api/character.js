import { neon } from '@neondatabase/serverless';
import { hasValidAdminSession, isMasterNickname } from '../lib/adminAuth.js';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

const CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric', 'rogue'];
const BASE_ADVANCEMENT_IDS = ['berserker', 'guardian', 'archmage', 'frostweaver', 'sniper', 'beastmaster', 'paladin', 'oracle', 'assassin', 'trickster'];
const POTION_IDS = ['potion-hp-small', 'potion-hp-medium', 'potion-hp-large', 'potion-hp-superior', 'potion-mp-small', 'potion-mp-large', 'potion-elixir'];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS characters (
      nickname TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

function safeNickname(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 20);
  return trimmed || null;
}

function clampInt(value, min, max, fallback = min) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value, maxLength) {
  return Array.isArray(value) ? value.slice(0, maxLength) : [];
}

function isAdvancementId(value) {
  if (BASE_ADVANCEMENT_IDS.includes(value)) return true;
  return BASE_ADVANCEMENT_IDS.some((baseId) => new RegExp(`^${baseId}-t[2-5]-[ab]$`).test(value));
}

// Potions used to be a single flat counter; a legacy client could still POST
// that shape mid-rollout, so anything that isn't a per-type object just
// yields an empty stash instead of crashing the save.
function sanitizePotions(value, isMaster) {
  const src = asPlainObject(value);
  const cap = isMaster ? 999 : 9999;
  const out = {};
  for (const id of POTION_IDS) {
    const n = clampInt(src[id], 0, cap, 0);
    if (n > 0) out[id] = n;
  }
  return out;
}

// rings/earrings are spread (...equipment.rings) by the client, so they must
// always be real arrays or a tampered save would crash the game on load.
function sanitizeEquipment(value) {
  const eq = asPlainObject(value);
  const out = {};
  for (const slot of ['helmet', 'armor', 'gloves', 'boots', 'weapon', 'necklace']) {
    out[slot] = eq[slot] && typeof eq[slot] === 'object' && !Array.isArray(eq[slot]) ? eq[slot] : null;
  }
  for (const key of ['rings', 'earrings']) {
    const pair = asArray(eq[key], 2);
    while (pair.length < 2) pair.push(null);
    out[key] = pair;
  }
  return out;
}

// The client resolves combat entirely on its own and just POSTs the resulting
// save, so this can't verify a number was "earned legitimately" - that would
// need a server-authoritative rewrite of the whole battle system. What this
// does do is reject obviously malformed/absurd payloads (wrong types, insane
// numbers, invented classes, self-granted admin) before they hit the DB and
// the public leaderboard, which stops casual tampering via the network tab.
function sanitizeCharacter(input, nickname) {
  const c = asPlainObject(input);
  const isMaster = isMasterNickname(nickname);
  const classId = CLASS_IDS.includes(c.classId) ? c.classId : null;
  const level = clampInt(c.level, 1, 999, 1);

  const out = {
    version: 'rpg-1',
    nickname,
    name: typeof c.name === 'string' ? c.name.trim().slice(0, 12) || nickname : nickname,
    gender: c.gender === 'female' ? 'female' : c.gender === 'master' && isMaster ? 'master' : 'male',
    classId,
    advancementId: level >= 10 && isAdvancementId(c.advancementId) ? c.advancementId : null,
    advancementHistory: asArray(c.advancementHistory, 5).filter((id) => typeof id === 'string' && isAdvancementId(id)),
    isAdmin: isMaster ? true : false,
    level,
    xp: clampNumber(c.xp, 0, 10_000_000, 0),
    gold: clampNumber(c.gold, 0, 1_000_000_000, 0),
    goldEarnedTotal: clampNumber(c.goldEarnedTotal, 0, 1_000_000_000, 0),
    hp: clampNumber(c.hp, 0, 10_000_000, 1),
    maxHp: clampNumber(c.maxHp, 1, 10_000_000, 1),
    mp: clampNumber(c.mp, 0, 10_000_000, 0),
    maxMp: clampNumber(c.maxMp, 0, 10_000_000, 0),
    attack: clampNumber(c.attack, 0, 1_000_000, 0),
    defense: clampNumber(c.defense, 0, 1_000_000, 0),
    agility: clampNumber(c.agility, 0, 1_000_000, 10),
    potions: sanitizePotions(c.potions, isMaster),
    victories: clampInt(c.victories, 0, 10_000_000, 0),
    defeats: clampInt(c.defeats, 0, 10_000_000, 0),
    inventory: asArray(c.inventory, 3000),
    companions: asArray(c.companions, 50).filter((id) => typeof id === 'string'),
    companionProgress: asPlainObject(c.companionProgress),
    activeCompanionId: typeof c.activeCompanionId === 'string' ? c.activeCompanionId : null,
    equipment: sanitizeEquipment(c.equipment),
    affinity: asPlainObject(c.affinity),
    dialogueHistory: asPlainObject(c.dialogueHistory),
    hunted: asPlainObject(c.hunted),
    quests: asPlainObject(c.quests),
    mailbox: asArray(c.mailbox, 200),
    mailboxWelcomeGranted: c.mailboxWelcomeGranted === true,
    level200WeaponGranted: c.level200WeaponGranted === true,
    redeemedCoupons: asArray(c.redeemedCoupons, 50).filter((code) => typeof code === 'string'),
    createdAt: Number.isFinite(Number(c.createdAt)) ? Number(c.createdAt) : Date.now(),
  };
  // maxHp/maxMp contain only the character's base values. Equipped gear is
  // applied on the client, so clamping current vitals here made geared heroes
  // lose HP/MP whenever a mobile browser reloaded after being backgrounded.
  // The client clamps these values against its equipment-inclusive combat stats.
  return out;
}

export default async function handler(req, res) {
  if (!sql) {
    return res.status(503).json({ error: 'Save database is not configured (DATABASE_URL missing)' });
  }

  if (req.method === 'GET') {
    const nickname = safeNickname(req.query.nickname);
    if (!nickname) return res.status(400).json({ error: 'nickname is required' });
    if (isMasterNickname(nickname) && !hasValidAdminSession(req, nickname)) {
      return res.status(401).json({ error: 'admin_auth_required' });
    }

    try {
      await ensureTable();
      const rows = await sql`SELECT data FROM characters WHERE nickname = ${nickname}`;
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      return res.json({ character: rows[0].data });
    } catch (err) {
      console.error('Character GET failed:', err);
      return res.status(502).json({ error: 'Save unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { nickname: rawNickname, character } = req.body ?? {};
    const nickname = safeNickname(rawNickname);
    if (!nickname) return res.status(400).json({ error: 'nickname is required' });
    if (isMasterNickname(nickname) && !hasValidAdminSession(req, nickname)) {
      return res.status(401).json({ error: 'admin_auth_required' });
    }
    if (!character || typeof character !== 'object') {
      return res.status(400).json({ error: 'character is required' });
    }
    const safeCharacter = sanitizeCharacter(character, nickname);

    try {
      await ensureTable();
      await sql`
        INSERT INTO characters (nickname, data, updated_at)
        VALUES (${nickname}, ${JSON.stringify(safeCharacter)}, now())
        ON CONFLICT (nickname) DO UPDATE SET data = excluded.data, updated_at = now()
      `;
      return res.json({ ok: true });
    } catch (err) {
      console.error('Character POST failed:', err);
      return res.status(502).json({ error: 'Failed to save character' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
