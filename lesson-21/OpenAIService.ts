import OpenAI from 'openai';
import fs from 'fs';
export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async getCompletion(prompt: string) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "user", content: prompt }
            ]
        });
        return response.choices[0].message.content;
    }

    async transcribeImage(prompt: string, imagePath: string): Promise<string | null> {
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `data:image/jpeg;base64,${base64Image}`
                            },
                        },
                    ],
                },
            ],
        });
        return response.choices[0].message.content;
    }

}