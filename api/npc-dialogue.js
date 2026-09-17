import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const clamp = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';

function parseJson(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.reply || !Array.isArray(parsed.choices)) throw new Error('invalid dialogue shape');
  return {
    reply: clamp(parsed.reply, 240),
    choices: parsed.choices.slice(0, 4).map((choice) => ({
      text: clamp(choice.text, 90),
      effect: Math.max(-3, Math.min(3, Number(choice.effect) || 0)),
    })).filter((choice) => choice.text),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { npc = {}, player = {}, affinity = 0, history = [], selectedChoice } = req.body ?? {};
  const npcName = clamp(npc.name, 30) || 'NPC';
  const role = clamp(npc.role, 50);
  const persona = clamp(npc.persona, 400);
  const safeHistory = Array.isArray(history) ? history.slice(-6).map((entry) => ({
    player: clamp(entry?.player, 100), npc: clamp(entry?.npc, 180), effect: Number(entry?.effect) || 0,
  })) : [];

  const system = `당신은 판타지 RPG의 NPC "${npcName}"(${role})이다.
성격: ${persona}
플레이어와의 우호도는 ${Math.max(-50, Math.min(50, Number(affinity) || 0))}이며, 과거 대화를 기억하고 자연스럽게 반응한다.
반드시 순수 JSON만 출력한다. 형식:
{"reply":"NPC의 1~3문장 대사","choices":[{"text":"플레이어가 선택할 자연스러운 대답","effect":1}]}
규칙:
- choices는 반드시 3개 또는 4개다.
- 선택지는 현재 대화 문맥에 직접 이어져야 하며 서로 다른 태도(친절, 호기심, 중립, 무례)를 담는다.
- effect는 우호도 변화이며 -3부터 3 사이 정수다. 아첨만으로 큰 보상을 주지 않는다.
- 플레이어가 직접 입력해야 하는 선택지는 만들지 않는다.
- 같은 문장을 반복하지 않는다.`;

  const context = {
    player: { name: clamp(player.name, 30), classId: clamp(player.classId, 30), level: Number(player.level) || 1, victories: Number(player.victories) || 0 },
    previousConversations: safeHistory,
    latestPlayerChoice: clamp(selectedChoice, 120) || null,
  };

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5', max_tokens: 500, system,
      messages: [{ role: 'user', content: JSON.stringify(context) }],
    });
    const text = response.content.find((block) => block.type === 'text')?.text ?? '';
    const result = parseJson(text);
    if (result.choices.length < 3) throw new Error('not enough choices');
    return res.json(result);
  } catch (error) {
    console.error('NPC dialogue error:', error);
    return res.status(502).json({ error: 'Failed to generate dialogue' });
  }
}
