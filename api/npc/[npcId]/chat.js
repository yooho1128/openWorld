import Anthropic from '@anthropic-ai/sdk';
import { NPCS } from '../../../lib/npcs.js';

const client = new Anthropic();
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;

// Vercel functions are stateless (multiple instances, cold starts), so
// conversation history can't live in server memory. The client sends back
// the history it was given and we round-trip the updated version.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { npcId } = req.query;
  const { message, history } = req.body ?? {};
  const npc = NPCS[npcId];

  if (!npc) {
    return res.status(404).json({ error: 'Unknown NPC' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const messages = sanitizeHistory(history);
  messages.push({ role: 'user', content: message.slice(0, MAX_MESSAGE_LENGTH) });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: npc.system,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const reply = textBlock?.text ?? '...';

    messages.push({ role: 'assistant', content: reply });
    if (messages.length > MAX_HISTORY_MESSAGES) {
      messages.splice(0, messages.length - MAX_HISTORY_MESSAGES);
    }

    res.json({ reply, history: messages });
  } catch (err) {
    console.error('NPC chat error:', err);
    res.status(502).json({ error: 'Failed to reach Claude API' });
  }
}
