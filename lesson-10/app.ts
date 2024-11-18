import axios from 'axios';
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

async function getQuestions() {
    try {
        const response = await axios.get(`https://centrala.ag3nts.org/data/${API_KEY}/arxiv.txt`);
        const fs = require('fs');
        fs.writeFileSync('./lesson-10/arxiv.txt', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw error;
    }
}

async function getHtmlDoc() {
    try {
        const response = await axios.get('https://centrala.ag3nts.org/dane/arxiv-draft.html');
        const fs = require('fs');
        fs.writeFileSync('./lesson-10/arxiv-draft.html', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching HTML document:', error);
        throw error;
    }
}


async function callOpenAI(prompt: string): Promise<string | null> {
    try {

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `
                    Z przechwyconych materiałów interesuje nas tylko jedna z publikacji profesora Maja.
                    Nasza centrala chce pozyskać odpowiedzi na dostarczone przez nią pytania.
                    Zwróć proszę uwagę, że podlinkowana notatka zawiera treści tekstowe, graficzne i dźwiękowe.
                    Istnieje ogromne prawdopodobieństwo, że konieczne będzie wzięcie pod uwagę informacji podanych w każdym formacie.

                    Oczekiwany format odpowiedzi:
                        {
                            "ID-pytania-01": "krótka odpowiedź w 1 zdaniu",
                            "ID-pytania-02": "krótka odpowiedź w 1 zdaniu",
                            "ID-pytania-03": "krótka odpowiedź w 1 zdaniu",
                            "ID-pytania-NN": "krótka odpowiedź w 1 zdaniu"
                        }

                    `
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error(`Error analyzing content:`, error);
        return null;
    }
}

async function transcribeImage(imagePath: string): Promise<string | null> {

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Opisz co widzisz na obrazie. Podaj wszystkie szczegóły." },
                    {
                        type: "image_url",
                        image_url: {
                            "url": `data:image/jpeg;base64,${imagePath}`
                        },
                    },
                ],
            },
        ],
    });
    return response.choices[0].message.content;
}

async function askQuestions(): Promise<void> {
    try {
        // Read questions from arxiv.txt
        const questions = fs.readFileSync('./lesson-10/arxiv.txt', 'utf-8')
            .split('\n')
            .filter(line => line.trim())
            .reduce((acc: { [key: string]: string }, line) => {
                const [id, question] = line.split('=');
                if (id && question) {
                    acc[id] = question;
                }
                return acc;
            }, {});

        // Read HTML content
        const htmlContent = fs.readFileSync('./lesson-10/arxiv-draft.html', 'utf-8');

        // Prepare prompt with questions and HTML content
        const prompt = `
            Przeanalizuj poniższy dokument HTML i odpowiedz na pytania:
            
            ${Object.entries(questions).map(([id, question]) =>
            `${id}: ${question}`
        ).join('\n')}

            Dokument HTML:
            ${htmlContent}

            Informacje z opisów zdjęć:
            ${fs.readdirSync('./lesson-10/descriptions')
                .map(file => fs.readFileSync(`./lesson-10/descriptions/${file}`, 'utf-8'))
                .join('\n')}
        `;

        // Get answers from OpenAI
        const response = await callOpenAI(prompt);

        if (response) {
            console.log('Answers:', response);
            // Save answers to a file
            fs.writeFileSync('./lesson-10/answers.json', response);
        }

    } catch (error) {
        console.error('Error processing questions:', error);
        throw error;
    }
}

async function describeImagesInHtml(): Promise<void> {
    try {
        // Read HTML content
        const htmlContent = fs.readFileSync('./lesson-10/arxiv-draft.html', 'utf-8');

        // Extract image URLs or data from the HTML content
        const imageUrls = extractImageUrls(htmlContent);

        if (imageUrls.length === 0) {
            console.log('No images found in the HTML document.');
            return;
        }

        for (const imageUrl of imageUrls) {
            // Create images directory if it doesn't exist
            const imagesDir = './lesson-10/images';
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir);
            }

            // Download and save image
            const imagePath = path.join(imagesDir, path.basename(imageUrl));
            const imageResponse = await fetch('https://centrala.ag3nts.org/dane/' + imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            fs.writeFileSync(imagePath, Buffer.from(imageBuffer));

            // Convert to base64
            const base64Image = fs.readFileSync(imagePath).toString('base64');
            const response = await transcribeImage(base64Image);
            console.log('Image Descriptions:', response);
            // Create descriptions directory if it doesn't exist
            const descriptionsDir = './lesson-10/descriptions';
            if (!fs.existsSync(descriptionsDir)) {
                fs.mkdirSync(descriptionsDir);
            }

            // Save description to a file with timestamp to ensure unique names
            const timestamp = Date.now();
            const descriptionPath = path.join(descriptionsDir, `description-${timestamp}.txt`);
            fs.writeFileSync(descriptionPath, response || '');
        }

    } catch (error) {
        console.error('Error describing images:', error);
        throw error;
    }
}

function extractImageUrls(htmlContent: string): string[] {
    const imageUrls: string[] = [];
    const regex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = regex.exec(htmlContent)) !== null) {
        imageUrls.push(match[1]);
    }
    return imageUrls;
}

await getHtmlDoc();
await describeImagesInHtml();
await getQuestions();
await askQuestions();