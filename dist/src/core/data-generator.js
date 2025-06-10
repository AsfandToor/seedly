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
const _logger = /*#__PURE__*/ _interop_require_default(require("../logger"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    throw new Error('GOOGLE_API_KEY environment variable not found.');
}
const googleGenAi = new _generativeai.GoogleGenerativeAI(apiKey);
const model = googleGenAi.getGenerativeModel({
    model: 'gemini-1.5-flash'
});
async function generateValueWithLLM(column, count) {
    let prompt = `Generate ${count} fake values for a SQL column named "${column.name}" of type "${column.type}". Return the data as a JSON array, nothing else. Each value should be realistic.`;
    if (column.enumValues && column.enumValues.length > 0) {
        _logger.default.warn('enum encountered');
        _logger.default.info(column.enumValues);
        const allowedValues = column.enumValues.map((val)=>`'${val}'`).join(', ');
        prompt = `Generate ${count} fake values for a SQL column named "${column.name}". This column is an ENUM type, and the ONLY allowed values are: [${allowedValues}]. Return the data as a JSON array, nothing else.`;
    }
    _logger.default.warn('just after the enum if condition');
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
        return parsed;
    } catch (err) {
        console.error(`Failed to parse LLM response: ${response}`);
        throw new Error(`Invalid LLM response for column ${column.name}`);
    }
}

//# sourceMappingURL=data-generator.js.map