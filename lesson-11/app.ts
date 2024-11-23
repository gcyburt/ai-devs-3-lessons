import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_KEY = process.env.API_KEY;


if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set in the environment variables.');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

async function readDataFiles(): Promise<{ filename: string; content: string }[]> {
    const dataDir = './lesson-11/data';
    const fileContents: string[] = [];

    try {
        // Check if directory exists
        if (!fs.existsSync(dataDir)) {
            throw new Error('Data directory does not exist');
        }

        // Read all files in the directory
        const files = fs.readdirSync(dataDir);

        // Read content of each file
        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            fileContents.push(content);
        }

        return files.map((file, index) => ({
            filename: file,
            content: fileContents[index]
        }));

    } catch (error) {
        console.error('Error reading data files:', error);
        throw error;
    }
}

async function analyzeDataWithAI(dataFiles: { filename: string; content: string }[]): Promise<string> {
    try {
        const facts = await loadFacts();

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Jesteś analitykiem AI przetwarzającym raporty bezpieczeństwa."
                },
                {
                    role: "user",
                    content: `Wygeneruj słowa kluczowe w formie mianownika (czyli np. “sportowiec”, a nie “sportowcem”, “sportowców” itp.),
                    które pomogą ludziom z centrali wyszukać odpowiedni dokument. Oczekiwany format odpowiedzi:

                    {
                        "nazwa-pliku-01.txt":"lista, słów, kluczowych 1",
                        "nazwa-pliku-02.txt":"lista, słów, kluczowych 2",
                        "nazwa-pliku-03.txt":"lista, słów, kluczowych 3",
                        "nazwa-pliku-NN.txt":"lista, słów, kluczowych N"
                    }

                    Pliki do analizy:
                    ${dataFiles.map(file => `${file.filename}:\n${file.content}`).join('\n\n')}

                    Przygotowując słowa kluczowe, wykorzystaj następujące fakty:
                    ${facts.join('\n')}
                    `
                }
            ]
        });

        return response.choices[0].message.content || '';
    } catch (error) {
        console.error('Error analyzing data with AI:', error);
        throw error;
    }
}

async function loadFacts(): Promise<string[]> {
    try {
        const factsDir = path.join(__dirname, 'facts');
        const files = await fs.promises.readdir(factsDir);
        const facts: string[] = [];

        for (const file of files) {
            const filePath = path.join(factsDir, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            if (content.trim() !== 'entry deleted') {
                facts.push(content);
            }
        }

        return facts;
    } catch (error) {
        console.error('Error loading facts:', error);
        throw error;
    }
}


const dataFiles = await readDataFiles();
const analysis = await analyzeDataWithAI(dataFiles);
console.log('AI Analysis:', analysis);