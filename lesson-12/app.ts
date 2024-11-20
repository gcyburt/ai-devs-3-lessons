import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const loadTextFiles = (folderPath: string): string[] => {
    const files = fs.readdirSync(folderPath);
    return files.map(file => fs.readFileSync(path.join(folderPath, file), 'utf-8'));
};

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

await qdrantClient.createCollection('ai-devs-3', {
    vectors: {
        size: 1536,
        distance: 'Cosine',
    },
});

const result = await qdrantClient.getCollections();
console.log(result);

// Main function to process and send data to Qdrant
async function processAndSendToQdrant() {
    const folderPath = './lesson-12/data'; // Path to your data folder
    const texts = loadTextFiles(folderPath);

    for (const text of texts) {
        const embedding = await getEmbedding(text);
        await qdrantClient.upsert('ai-devs-3', {
            points: [{
                id: uuidv4(),
                vector: embedding,
                payload: {
                    content: 'chunk'
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

processAndSendToQdrant().catch(console.error);
