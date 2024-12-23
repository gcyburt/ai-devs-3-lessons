import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const loadTextFiles = (folderPath: string): { content: string, filename: string }[] => {
    const files = fs.readdirSync(folderPath);
    return files.map(file => ({
        content: fs.readFileSync(path.join(folderPath, file), 'utf-8'),
        filename: file
    }));
};

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Main function to process and send data to Qdrant
async function processAndSendToQdrant() {
    try {
        await qdrantClient.createCollection('ai-devs-3', {
            vectors: {
                size: 1536,
                distance: 'Cosine',
            },
        });
    } catch (error) {
        console.log("Collection already exists");
        return;
    }

    const folderPath = './lesson-12/data'; // Path to your data folder
    const texts = loadTextFiles(folderPath);

    for (const text of texts) {
        const embedding = await getEmbedding(text.content);

        await qdrantClient.upsert('ai-devs-3', {
            points: [{
                id: uuidv4(),
                vector: embedding,
                payload: {
                    date: text.filename,
                    content: text.content
                }
            }]
        });
    }
}

async function getEmbedding(prompt: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: prompt,
    });
    return response.data[0].embedding;
}

async function searchForWeapon(weapon: string) {
    const embedding = await getEmbedding(weapon);
    const result = await qdrantClient.search('ai-devs-3', {
        vector: embedding,
        limit: 3
    });
    return result;
}

processAndSendToQdrant().catch(console.error);

const result = await searchForWeapon('W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?');
console.log(result);
