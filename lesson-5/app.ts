import axios from 'axios';

async function callLlama(prompt: string): Promise<string> {
    try {
        const response = await axios.post('http://localhost:11434/api/chat', {
            model: 'llama3.2:latest',
            stream: false,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });
        return response.data.message.content;
    } catch (error) {
        console.error('Error calling Llama:', error);
        throw error;
    }
}

async function downloadCenzura(): Promise<void> {
    try {
        const apiKey = process.env.API_KEY || 'default_api_key';
        const response = await axios.get(`https://centrala.ag3nts.org/data/${apiKey}/cenzura.txt`);
        console.log('Response:', response.data);
        const fs = require('fs');
        fs.writeFileSync('cenzura.txt', response.data);
    } catch (error) {
        console.error('Error downloading cenzura:', error);
        throw error;
    }
}

async function processCenzura(): Promise<void> {
    try {
        const fs = require('fs');
        const fileContent = fs.readFileSync('cenzura.txt', 'utf8');

        const prompt = `You are a data censorship expert. Your task is to censor sensitive information in the following text by replacing it with CENZURA.
                        Sensitive information that should be censored includes:
                        - First name
                        - Last name
                        - Street name
                        - House number
                        - City name
                        - Age

                        Answer in Polish.

                        ${fileContent}`;

        const censoredContent = await callLlama(prompt);
        console.log('Raw content:', fileContent);
        console.log('Censored content:', censoredContent);
        fs.writeFileSync('cenzura.txt', censoredContent);

    } catch (error) {
        console.error('Error processing cenzura:', error);
        throw error;
    }
}

async function sendCenzura(): Promise<void> {
    try {
        const fs = require('fs');
        const censoredContent = fs.readFileSync('cenzura.txt', 'utf8');

        const payload = {
            "task": "CENZURA",
            "answer": censoredContent,
            "apikey": process.env.API_KEY
        };

        console.log('Sending payload:', payload);

        const response = await axios.post('https://centrala.ag3nts.org/report', payload);
        console.log('Censored data sent successfully', response);
    } catch (error) {
        console.error('Error sending censored data:');
        throw error;
    }
}


await downloadCenzura();

await processCenzura();

await sendCenzura();