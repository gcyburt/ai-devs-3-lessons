import axios from 'axios';
import OpenAI from 'openai';

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
            model: "gpt-4",
            messages: [
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

await getHtmlDoc();
await getQuestions();
