const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

async function solveCaptcha(question) {
    try {
        // Call Ollama API
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistral',  // or another model you have in Ollama
                prompt: `Answer this question briefly with just the number or date: ${question}`
            })
        });

        const data = await response.json();
        // Extract the answer from Ollama's response
        return data.response.trim();
    } catch (error) {
        console.error('Error calling Ollama:', error);
        return null;
    }
}

async function loginWithCaptcha() {
    try {
        const browser = await puppeteer.launch({
            headless: false,  // set to true in production
            defaultViewport: null
        });

        const page = await browser.newPage();
        await page.goto('https://xyz.ag3nts.org/');

        // Wait for the captcha question to load
        const captchaQuestion = await page.$eval('.captcha-question', 
            el => el.textContent.trim()
        );

        // Get answer from Ollama
        const answer = await solveCaptcha(captchaQuestion);
        
        if (!answer) {
            throw new Error('Failed to get answer from Ollama');
        }

        // Fill in the login form
        await page.type('input[name="username"]', 'your_username');
        await page.type('input[name="password"]', 'your_password');
        await page.type('input[name="captcha"]', answer);

        // Submit
    } catch (error) {
        console.error('Error logging in:', error);
    } finally {
        await browser.close();
    }
}

loginWithCaptcha(); 