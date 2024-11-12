import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGE_FOLDER = '/images';

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
                    { type: "text", text: "Co znajduje się na tym obrazie? Zignoruj tło. Wymień nazwy ulic. Jeśli na mapie są inne obiekty, to również je wymień. Zapamiętaj charakterystyczne obiekty i punkty orientacyjne. Na obrazach znajdują się numery dróg - zapisz je w notatkach - TO WAŻNE." },
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

async function analyzeImagesInFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.jpg'));
    const markdownFilePath = path.join(folderPath, 'analysis_results.md');
    let markdownContent = '# Image Analysis Results\n\n';

    for (const file of imageFiles) {
        const imagePath = path.join(folderPath, file);
        try {
            const analysis = await analyzeImage(imagePath);
            markdownContent += `## Analysis for ${file}\n${analysis}\n\n`;
        } catch (error) {
            console.error(`Error analyzing ${file}:`, error);
        }
    }

    fs.writeFileSync(markdownFilePath, markdownContent);
}

async function determineCityFromAnalysis(filePath: string): Promise<string> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: `Na podstawie poniższych analiz obrazów, określ, które miasto jest opisywane. Zauważ, że jeden z opisów nie pasuje do pozostałych: \n\n${fileContent} 
                
                WAŻNE: W poszukiwanym mieście były twierdze i spichlerze.

                Poszukiwane miasto znajduje się w Polsce i NIE JEST to Gdańsk, Toruń, Kalisz ani Bydgoszcz.
                Numery dróg są zapisane w notatkach - NUMERY DRÓG SĄ ISTOTNE.
                Przedstaw swoje rozumowanie krok po kroku i podaj nazwę miasta.`
            }
        ],
    });

    const content = response.choices[0].message.content;
    if (content === null) {
        throw new Error('Response content is null');
    }
    return content;
}

async function main() {
    // await analyzeImagesInFolder(path.join(__dirname, IMAGE_FOLDER));
    const city = await determineCityFromAnalysis(path.join(__dirname, IMAGE_FOLDER, 'analysis_results.md'));
    console.log(`Miasto opisane w analizie to: ${city}`);
}

main().catch(console.error);
