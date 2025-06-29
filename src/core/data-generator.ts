import { GoogleGenerativeAI } from '@google/generative-ai';
import { Column } from './db/dialects/types.js';
import 'dotenv/config';
import logger from '../logger.js';
import 'mcps-logger/console';
import OpenAI from 'openai';
const googleApiKey = process.env.GOOGLE_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;
if (!googleApiKey && !openAiApiKey) {
  throw new Error(
    'API KEY environment variable not found.',
  );
}
let provider: 'openai' | 'gemini';
let openai: OpenAI | null = null;
let geminiModel: ReturnType<
  GoogleGenerativeAI['getGenerativeModel']
> | null = null;

if (openAiApiKey) {
  provider = 'openai';
  openai = new OpenAI({ apiKey: openAiApiKey });
  console.log('initialized generator for openai');
} else {
  provider = 'gemini';
  const genAI = new GoogleGenerativeAI(googleApiKey!);
  geminiModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });
  console.log('initialized generator for gemini');
}

export async function generateValueWithLLM(
  column: Column,
  count: number,
  dialectType: 'sql' | 'nosql' = 'sql',
) {
  let promptPrefix =
    dialectType === 'sql'
      ? `a SQL column`
      : `a NoSQL document field`;

  let prompt = `Generate ${count} fake values for ${promptPrefix} named "${column.name}" of type "${column.type}". Return the data as a JSON array, nothing else. Each value should be realistic.`;

  //handling enums
  if (column.enumValues && column.enumValues.length > 0) {
    logger.warn('enum encountered');
    logger.info(column.enumValues);
    const allowedValues = column.enumValues
      .map((val) => `'${val}'`)
      .join(', ');
    prompt = `Generate ${count} fake values for a SQL column named "${column.name}". This column is an ENUM type, and the ONLY allowed values are: [${allowedValues}]. Return the data as a JSON array, nothing else.`;
  }
  logger.warn('just after the enum if condition');

  try {
    let responseText: string;

    if (provider === 'gemini') {
      console.log('came inside gemini');
      const res = await geminiModel!.generateContent({
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
        ],
      });
      responseText = res.response.text().trim();
    } else {
      console.log('came inside openai');
      const res = await openai!.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      });
      responseText =
        res.choices[0].message.content?.trim() || '';
    }

    logger.warn('Data from LLM:');
    logger.warn(responseText);

    const clean = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      throw new Error('Not an array');
    }

    return parsed;
  } catch (err) {
    logger.error(
      'Error getting the response data from LLM',
    );
    console.error(err);
    throw new Error(
      `Invalid LLM response for column ${column.name}`,
    );
  }
}
