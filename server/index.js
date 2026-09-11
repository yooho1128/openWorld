import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { NPCS } from './npcs.js';

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic();

// npcId -> Anthropic.MessageParam[] (in-memory only; resets on server restart)
const conversations = new Map();
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;

app.post('/api/npc/:npcId/chat', async (req, res) => {
  const { npcId } = req.params;
  const { message } = req.body ?? {};
  const npc = NPCS[npcId];

  if (!npc) {
    return res.status(404).json({ error: 'Unknown NPC' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const history = conversations.get(npcId) ?? [];
  history.push({ role: 'user', content: message.slice(0, MAX_MESSAGE_LENGTH) });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 400,
      system: npc.system,
      output_config: { effort: 'low' },
      messages: history,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const reply = textBlock?.text ?? '...';

    history.push({ role: 'assistant', content: reply });
    if (history.length > MAX_HISTORY_MESSAGES) {
      history.splice(0, history.length - MAX_HISTORY_MESSAGES);
    }
    conversations.set(npcId, history);

    res.json({ reply });
  } catch (err) {
    console.error('NPC chat error:', err);
    res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`NPC server listening on http://localhost:${PORT}`);
});
