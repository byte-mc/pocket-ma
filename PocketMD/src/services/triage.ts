import { getContext } from './model';

const SYSTEM_PROMPT = `You are an offline medical triage assistant. Do not think out loud. Do not show reasoning steps. Output ONLY the structured result below, nothing else before or after it.

Severity: [Low / Medium / High / Emergency]
Likely cause: <one line>
Immediate action:
  1. <step>
  2. <step>
  3. <step>
Evacuate if: <condition>

Respond in the same language the user wrote in.`;

export async function triage(symptom: string): Promise<string> {
  const ctx = getContext();
  const result = await ctx.completion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: symptom },
    ],
    n_predict: 512,
    temperature: 0.1,
    stop: ['\n\n\n', '<end_of_turn>'],
  });
  // Strip <thinking>...</thinking> blocks if present
  let text = result.text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  // Take from the last occurrence of "Severity:" — the actual structured output
  const idx = text.lastIndexOf('Severity:');
  return (idx >= 0 ? text.slice(idx) : text).trim();
}
