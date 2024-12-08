import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { fromPath } from 'pdf2pic';
import { OpenAIService } from './OpenAIService';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const openaiService = new OpenAIService();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

async function downloadDocument(url: string, outputLocationPath: string) {
    const writer = fs.createWriteStream(outputLocationPath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function getQuestions(apiKey: string): Promise<any[]> {
    const url = `https://centrala.ag3nts.org/data/${apiKey}/notes.json`;
    console.log('🔗 Fetching from URL:', url);

    try {
        const response = await axios.get(url);
        const data = response.data;

        let markdownContent = '# Questions\n\n';

        for (const [key, value] of Object.entries(data)) {
            markdownContent += `## Question ${key}\n${value}\n\n`;
        }

        const outputMarkdownPath = path.resolve(__dirname, 'questions.md');

        fs.writeFileSync(outputMarkdownPath, markdownContent);

        console.log('📝 Questions saved to questions.md');
        return data;
    } catch (error) {
        console.error('❌ Error fetching questions:', error);
        return [];
    }
}

async function convertPDFToImages(pdfPath: string, outputDir: string): Promise<string[]> {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('🔄 Starting PDF to image conversion...');

    const options = {
        density: 300,
        saveFilename: "page",
        savePath: outputDir,
        format: "png",
        width: 2000
    };

    const convert = fromPath(pdfPath, options);
    const pageCount = (await PDFDocument.load(fs.readFileSync(pdfPath))).getPageCount();

    const outputPaths: string[] = [];
    for (let i = 1; i <= pageCount; i++) {
        try {
            const result = await convert(i);
            if (result.path) {
                outputPaths.push(result.path);
                console.log(`📸 Converted page ${i} to image`);
            }
        } catch (error) {
            console.error(`❌ Error converting page ${i}:`, error);
        }
    }

    console.log('✅ PDF conversion completed!');
    return outputPaths;
}

const documentUrl = process.env.DOCUMENT_URL || '';
const outputLocationPath = path.resolve(__dirname, 'notatnik-rafala.pdf');
const outputImageDir = path.resolve(__dirname, 'pdf-images');

const transcriptsDir = path.resolve(__dirname, 'transcripts');
if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
}

async function describeImages(imagePaths: string[]) {
    for (const imagePath of imagePaths) {
        try {
            // Use OpenAIService to describe the image
            const description = await openaiService.transcribeImage(`
                Opisz co widzisz na obrazie. Podaj wszystkie szczegóły.
                Jeśli na obrazie jest tekst, wyciągnij go i przepisz dokładnie.
            `, imagePath) || '';

            // Define the output path for the description
            const descriptionFileName = path.basename(imagePath, path.extname(imagePath)) + '.txt';
            const descriptionFilePath = path.join(transcriptsDir, descriptionFileName);

            // Write the description to a file
            fs.writeFileSync(descriptionFilePath, description);

            console.log(`📝 Description for ${imagePath} saved to ${descriptionFilePath}`);
        } catch (error) {
            console.error(`❌ Error describing image ${imagePath}:`, error);
        }
    }
}

const loadTextFiles = (folderPath: string): { content: string, filename: string }[] => {
    const files = fs.readdirSync(folderPath);
    return files.map(file => ({
        content: fs.readFileSync(path.join(folderPath, file), 'utf-8'),
        filename: file
    }));
};

async function processAndSendToQdrant() {
    try {
        console.log('🔄 Creating collection...');
        await qdrantClient.createCollection('rafal-notatnik', {
            vectors: {
                size: 1536,
                distance: 'Cosine',
            },
        });
    } catch (error) {
        console.log('ℹ️ Collection already exists');
    }

    const transcriptsDir = path.resolve(__dirname, 'transcripts');
    const texts = loadTextFiles(transcriptsDir);

    for (const text of texts) {
        console.log(`🔄 Processing: ${text.filename}`);
        const embedding = await getEmbedding(text.content);

        await qdrantClient.upsert('rafal-notatnik', {
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

async function answerQuestion(question: string) {
    const embedding = await getEmbedding(question);
    const result = await qdrantClient.search('rafal-notatnik', {
        vector: embedding,
        limit: 3
    });

    const dbContent = result.map(item => item.payload?.content).join('\n');
    // console.log('🔍 Found content:', dbContent);

    const answer = await openaiService.getCompletion(`
        Jesteś pomocnym asystentem.
        Odpowiedz KRÓTKO na pytanie na podstawie podanego kontekstu:
        Kontekst: ${dbContent}
        Pytanie: ${question}
        Kontekst moze nie odpowiadać wprost pytanie, ale zawiera informacje pomocne do jego odpowiedzi.
        Uwzględnij wszystkie fakty podane w tekście, w szczególności odwołania do wydarzeń.
    `);
    return answer;
}

async function answerQuestionsFromFile(filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const questions = fileContent.match(/## Question \d+\n(.*?)(?=\n##|$)/gs);

    if (!questions) {
        console.log('❌ No questions found in the file.');
        return;
    }

    for (const question of questions) {
        const questionText = question.split('\n')[1].trim();
        console.log(`❓ Answering: ${questionText}`);

        try {
            const answer = await answerQuestion(questionText);
            console.log(`✅ Answer for "${questionText}":`, answer);
        } catch (error) {
            console.error(`❌ Error answering question "${questionText}":`, error);
        }
    }
}

// downloadDocument(documentUrl, outputLocationPath)
//     .then(async () => {
//         console.log('📥 Document downloaded successfully');
//         try {
//             const imagePaths = await convertPDFToImages(outputLocationPath, outputImageDir);
//             console.log('🖼️ Generated images:', imagePaths);

//             // Describe each image and store the descriptions
//             await describeImages(imagePaths);
//         } catch (error) {
//             console.error('❌ Error during PDF conversion:', error);
//         }
//     })
//     .catch(err => console.error('❌ Error downloading document:', err));

// await processAndSendToQdrant();

getQuestions(process.env.API_KEY || '').then(async questions => {
    console.log('❓ Questions:', questions);

    // Answer questions from the questions.md file
    const questionsFilePath = path.resolve(__dirname, 'questions.md');
    await answerQuestionsFromFile(questionsFilePath);
});