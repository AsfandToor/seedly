"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "generateValueWithLLM", {
    enumerable: true,
    get: function() {
        return generateValueWithLLM;
    }
});
const _generativeai = require("@google/generative-ai");
require("dotenv/config");
const googleGenAi = new _generativeai.GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = googleGenAi.getGenerativeModel({
    model: 'gemini-1.5-flash'
});
async function generateValueWithLLM(column, count) {
    const columnPromptCache = new Map();
    const key = `${column.name}:${column.type}:${count}`;
    if (columnPromptCache.has(key)) return columnPromptCache.get(key);
    const prompt = `Generate ${count} fake values for a SQL column named "${column.name}" of type "${column.type}". Return the data as a JSON array, nothing else. Each value should be realistic.`;
    const res = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ]
    });
    const response = res.response.text().trim();
    try {
        const clean = response.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) {
            throw new Error('Not an array');
        }
        columnPromptCache.set(key, parsed);
        return parsed;
    } catch (err) {
        console.error(`Failed to parse LLM response: ${response}`);
        throw new Error(`Invalid LLM response for column ${column.name}`);
    }
}

//# sourceMappingURL=data-generator.js.map