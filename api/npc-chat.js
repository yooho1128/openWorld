import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

function clampText(value, max) {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { npcName, npcPersona, locationName, characterSummary, playerMessage } = req.body ?? {};
  const safePersona = clampText(npcPersona, 400);
  if (!safePersona) return res.status(400).json({ error: 'npcPersona is required' });

  const safeName = clampText(npcName, 30) || 'NPC';
  const safeLocation = clampText(locationName, 30);
  const safeSummary = clampText(characterSummary, 300);
  const safeMessage = clampText(playerMessage, 300) || '(플레이어가 그냥 인사를 건넨다)';

  const system = `${safePersona}
당신의 이름은 "${safeName}"이고, 지금 있는 장소는 "${safeLocation}"입니다.
규칙:
- 항상 한국어 반말/존댓말은 위 페르소나 설정을 따르세요.
- 1~3문장으로 짧게 답하세요.
- 이모지는 최대 1개까지만 사용하세요.
- 캐릭터 설정(직업, 장소)에 맞지 않는 대화는 하지 마세요.`;

  const userContent = `플레이어 정보: ${safeSummary || '정보 없음'}\n플레이어가 한 말: ${safeMessage}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    res.json({ reply: textBlock?.text ?? '...' });
  } catch (err) {
    console.error('NPC chat error:', err);
    res.status(502).json({ error: 'Failed to reach Claude API' });
  }
}
