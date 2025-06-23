import { GoogleGenerativeAI } from '@google/generative-ai';
import { Column } from './db/dialects/types.js';
import 'dotenv/config';
import logger from '../logger.js';
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error(
    'GOOGLE_API_KEY environment variable not found.',
  );
}
const googleGenAi = new GoogleGenerativeAI(apiKey);

const model = googleGenAi.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

export async function generateValueWithLLM(
  column: Column,
  count: number,
) {
  let prompt = `Generate ${count} fake values for a SQL column named "${column.name}" of type "${column.type}". Return the data as a JSON array, nothing else. Each value should be realistic.`;
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
    const res = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
      ],
    });

    const response = res.response.text().trim();
    logger.warn('Data from LLM:');
    logger.warn(response);
    //tthe llm when asked to return response in json always returns the data in the form of json block. the word json is written and is enclosed by ```{}```. We have to get rid of them here.
    const clean = response
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      throw new Error('Not an array');
    }

    return parsed;
  } catch (err) {
    logger.error(
      'Error getting the response data from llm',
    );
    logger.error(err);
    throw new Error(
      `Invalid LLM response for column ${column.name}`,
    );
  }
}
