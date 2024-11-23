import OpenAI from 'openai';

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async getCompletion(prompt: string) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "user", content: prompt }
            ]
        });
        return response.choices[0].message.content;
    }
}