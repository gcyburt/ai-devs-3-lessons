import OpenAI from 'openai';

export default class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async getCompletion(prompt: string, model: string = "gpt-4o") {
        const response = await this.openai.chat.completions.create({
            model: model,
            messages: [
                { role: "user", content: prompt }
            ]
        });
        return response.choices[0].message.content;
    }
}