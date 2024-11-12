import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set in the environment variables.');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

async function analyzeImage(imagePath: string): Promise<any> {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Na obrazie zakodowana jest wskazówka do znalezienia flagi. Przedstaw swoje rozumowanie krok po kroku i podaj odpowiedź. Rozszyfruj wiadomość zakodowaną na obrazie." },
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
const imagePath = path.join(__dirname, 'image.png');
const analysis = await analyzeImage(imagePath);

console.log(analysis);