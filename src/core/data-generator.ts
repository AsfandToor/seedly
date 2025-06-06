import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
const googleGenAi = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY!,
);
const model = googleGenAi.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

export async function generateValueWithLLM(
  column: {
    name: string;
    type: string;
  },
  count: number,
) {
  const columnPromptCache = new Map();

  const key = `${column.name}:${column.type}:${count}`;
  if (columnPromptCache.has(key))
    return columnPromptCache.get(key);

  const prompt = `Generate ${count} fake values for a SQL column named "${column.name}" of type "${column.type}". Return the data as a JSON array, nothing else. Each value should be realistic.`;

  const res = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const response = res.response.text().trim();
  try {
    const clean = response
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      throw new Error('Not an array');
    }
    columnPromptCache.set(key, parsed);
    return parsed;
  } catch (err) {
    console.error(
      `Failed to parse LLM response: ${response}`,
    );
    throw new Error(
      `Invalid LLM response for column ${column.name}`,
    );
  }
}
