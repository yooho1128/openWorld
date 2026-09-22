import { neon } from '@neondatabase/serverless';
import { hasValidAdminSession, isMasterNickname } from '../lib/adminAuth.js';
import { checkRateLimit, clientIp, rejectRateLimited } from '../lib/rateLimit.js';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

const CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric', 'rogue'];
const BASE_ADVANCEMENT_IDS = ['berserker', 'guardian', 'archmage', 'frostweaver', 'sniper', 'beastmaster', 'paladin', 'oracle', 'assassin', 'trickster'];
const POTION_IDS = ['potion-hp-small', 'potion-hp-medium', 'potion-hp-large', 'potion-hp-superior', 'potion-mp-small', 'potion-mp-large', 'potion-elixir'];
const COMPANION_IDS = ['kael', 'luna', 'eris', 'seraph', 'nyx', 'brom'];
const GLOBAL_TITLE_IDS = ['lucky-lottery'];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS characters (
      nickname TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      save_version INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Kept separate from the CREATE above so installs from before save_version
  // existed still pick up the column (CREATE TABLE IF NOT EXISTS is a no-op
  // against an existing table).
  await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS save_version INTEGER NOT NULL DEFAULT 1`;
}

// Compare-and-swap write: a save only applies if the client's last-known
// save_version still matches what's stored, so two tabs autosaving the same
// character can't silently clobber each other - the loser gets a 409 with
// the current version instead. A null clientVersion (nothing loaded yet, ie.
// a brand-new character) always writes unconditionally.
async function saveWithVersion(nickname, data, clientVersion) {
  const payload = JSON.stringify(data);
  if (clientVersion !== null) {
    const updated = await sql`
      UPDATE characters SET data = ${payload}, save_version = save_version + 1, updated_at = now()
      WHERE nickname = ${nickname} AND save_version = ${clientVersion}
      RETURNING save_version
    `;
    if (updated.length) return { ok: true, version: updated[0].save_version };
    const existing = await sql`SELECT save_version FROM characters WHERE nickname = ${nickname}`;
    if (existing.length) return { ok: false, currentVersion: existing[0].save_version };
    // Row vanished between load and save (shouldn't normally happen) - fall
    // through to an unconditional insert rather than stranding the client.
  }
  const inserted = await sql`
    INSERT INTO characters (nickname, data, save_version, updated_at)
    VALUES (${nickname}, ${payload}, 1, now())
    ON CONFLICT (nickname) DO UPDATE SET data = excluded.data, save_version = characters.save_version + 1, updated_at = now()
    RETURNING save_version
  `;
  return { ok: true, version: inserted[0].save_version };
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

function sanitizeBlessings(value) {
  const src = asPlainObject(value);
  return Object.fromEntries(['small', 'normal', 'great'].map((key) => [key, clampInt(src[key], 0, 9999, 0)]));
}

function sanitizeCompanionProgress(value) {
  const src = asPlainObject(value);
  return Object.fromEntries(COMPANION_IDS.filter((id) => src[id]).map((id) => {
    const progress = asPlainObject(src[id]);
    const level = clampInt(progress.level, 1, 999, 1);
    return [id, { level, xp: level >= 999 ? 0 : clampNumber(progress.xp, 0, 10_000_000, 0) }];
  }));
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
  const unlockedTitles = [...new Set([
    ...asArray(c.unlockedTitles, 100).filter((id) => typeof id === 'string').map((id) => id.slice(0, 60)),
    ...GLOBAL_TITLE_IDS,
  ])];
  const blessingKeys = ['small', 'normal', 'great'];

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
    enhancementBlessings: sanitizeBlessings(c.enhancementBlessings),
    enhancementScrolls: clampInt(c.enhancementScrolls, 0, 9999, 0),
    activeEnhancementBlessing: blessingKeys.includes(c.activeEnhancementBlessing) ? c.activeEnhancementBlessing : null,
    astrologerDaily: asPlainObject(c.astrologerDaily),
    victories: clampInt(c.victories, 0, 10_000_000, 0),
    defeats: clampInt(c.defeats, 0, 10_000_000, 0),
    bossVictories: clampInt(c.bossVictories, 0, 10_000_000, 0),
    worldBossVictories: clampInt(c.worldBossVictories, 0, 10_000_000, 0),
    attendanceDays: clampInt(c.attendanceDays, 0, 7, 0),
    highestEnhancement: clampInt(c.highestEnhancement, 0, 20, 0),
    unlockedTitles,
    equippedTitle: unlockedTitles.includes(c.equippedTitle) ? c.equippedTitle : null,
    inventory: asArray(c.inventory, 3000),
    companions: asArray(c.companions, 50).filter((id) => typeof id === 'string'),
    companionProgress: sanitizeCompanionProgress(c.companionProgress),
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

  const ip = clientIp(req);

  if (req.method === 'GET') {
    const nickname = safeNickname(req.query.nickname);
    if (!nickname) return res.status(400).json({ error: 'nickname is required' });
    if (isMasterNickname(nickname) && !hasValidAdminSession(req, nickname)) {
      return res.status(401).json({ error: 'admin_auth_required' });
    }
    const limit = await checkRateLimit({ bucket: 'character-get', key: ip, limit: 30, windowSeconds: 60 });
    if (!limit.allowed) return rejectRateLimited(res, limit.retryAfter);

    try {
      await ensureTable();
      const rows = await sql`SELECT data, save_version FROM characters WHERE nickname = ${nickname}`;
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      return res.json({ character: rows[0].data, saveVersion: rows[0].save_version });
    } catch (err) {
      console.error('Character GET failed:', err);
      return res.status(502).json({ error: 'Save unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { nickname: rawNickname, character, saveVersion } = req.body ?? {};
    const nickname = safeNickname(rawNickname);
    if (!nickname) return res.status(400).json({ error: 'nickname is required' });
    if (isMasterNickname(nickname) && !hasValidAdminSession(req, nickname)) {
      return res.status(401).json({ error: 'admin_auth_required' });
    }
    if (!character || typeof character !== 'object') {
      return res.status(400).json({ error: 'character is required' });
    }
    // Autosaves fire on nearly every player action (each battle turn, gear
    // change, dialogue choice...), so this stays generous - it's here to
    // stop scripted abuse, not to throttle normal play.
    const limit = await checkRateLimit({ bucket: 'character-post', key: `${ip}:${nickname}`, limit: 120, windowSeconds: 60 });
    if (!limit.allowed) return rejectRateLimited(res, limit.retryAfter);
    const safeCharacter = sanitizeCharacter(character, nickname);
    const clientVersion = Number.isInteger(saveVersion) ? saveVersion : null;

    try {
      await ensureTable();
      const result = await saveWithVersion(nickname, safeCharacter, clientVersion);
      if (!result.ok) {
        return res.status(409).json({ error: 'save_conflict', saveVersion: result.currentVersion });
      }
      return res.json({ ok: true, saveVersion: result.version });
    } catch (err) {
      console.error('Character POST failed:', err);
      return res.status(502).json({ error: 'Failed to save character' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
