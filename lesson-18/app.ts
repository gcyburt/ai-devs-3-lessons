import { CentralaService } from "./CentralaService";
import fs from 'fs';
import OpenAIService from './OpenAIService';
import axios from 'axios';
import * as cheerio from 'cheerio';

const centralaService = new CentralaService();
const openAIService = new OpenAIService();

const visitedUrlsFile = 'visited_urls.txt';

async function saveQuestionsToFile(questionsJson: any) {
    // Convert questionsJson to Markdown format
    console.log('📝 Questions JSON:', questionsJson);

    // Convert questionsJson to Markdown format
    const questionsContent = Object.entries(questionsJson)
        .map(([key, question]) => `${key}: ${question}`)
        .join('\n');

    try {
        fs.writeFileSync('questions.md', questionsContent);
        console.log('✅ Questions saved to questions.md');
    } catch (error) {
        console.error('❌ Error writing to file:', error);
    }
}

async function scrapeWebpage(url: string) {
    try {
        // Fetch the webpage content
        const { data } = await axios.get(url);

        // Load the webpage content into cheerio
        const $ = cheerio.load(data);

        // Get the whole body of the webpage
        const bodyContent = $('body').html();

        // Sanitize the URL to create a valid file name
        const sanitizedFileName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';

        if (fs.existsSync(`pages/${sanitizedFileName}`)) {
            console.log(`ℹ️ File ${sanitizedFileName} already exists. Skipping AI conversion.`);
            return fs.readFileSync(`pages/${sanitizedFileName}`, 'utf-8');
        }

        // Convert the body content to Markdown format
        const markdownContent = await openAIService.getCompletion(`
            Convert the following HTML to Markdown: ${bodyContent}.
            If there are links, make sure to include them in the Markdown file.
            If there are images, make sure to include them in the Markdown file.
            If there are tables, make sure to include them in the Markdown file.
            If there are lists, make sure to include them in the Markdown file.
        `) || '';

        // Store the webpage content as a markdown file
        try {
            if (!fs.existsSync('pages')) {
                fs.mkdirSync('pages');
            }
            fs.writeFileSync(`pages/${sanitizedFileName}`, markdownContent, { flag: 'wx' });

            console.log(`✅ Webpage content saved to ${sanitizedFileName}`);
            return markdownContent;
        } catch (error) {
            console.error('❌ Error writing to file:', error);
        }
    } catch (error) {
        console.error('❌ Error scraping the webpage:', error);
    }
}

async function lookForUrls(url: string) {
    const questions = fs.readFileSync('./questions.md', 'utf-8');

    const visitedUrlsFile = 'visited_urls.txt';

    // Append the URL to the visited list
    fs.appendFileSync(visitedUrlsFile, `${url}\n`);

    const visitedUrlsContent = fs.readFileSync('visited_urls.txt', 'utf-8');

    console.log('📄 Visited URLs:\n' + visitedUrlsContent);

    const webpageContent = await scrapeWebpage(url);

    const answersToQuestions = await openAIService.getCompletion(`
        ${webpageContent}

        Look for the answers to the following questions: ${questions}

        If you don't know the answer, return false only. Do not add any other text.
    `) || '';

    if (answersToQuestions !== "false") {
        console.log('🟥 Answers to questions:', answersToQuestions);
    }

    const answers = await openAIService.getCompletion(`
        ${webpageContent}

        Look for the answers to the following questions: ${questions}

        If there is no answer to the question, look for other URLs on the webpage and return ones that you think are relevant in format: https://softo.ag3nts.org/(URL).
        Return URLs only, separated by commas. Do not include any other text. Ignore "cennik" URLs.

        REMEMBER NOT TO ADD DOT (.) AT THE END OF THE RESPONSE. DO NOT ADD ANY OTHER TEXT. DO NOT APOLOGIZE - ONLY ANSWER THE QUESTIONS OR GIVE URLs.

        Ignore URLs that have already been visited - ${visitedUrlsContent}
        If no URLs are found, return empty message.
    `) || '';

    console.log('💬 Answers:', answers);

    const urls = answers?.split(',') || [];
    console.log('💬 URLs:', urls);

    if (urls.length === 1 && urls[0] === "") {
        console.log('💬 No URLs found. Exiting.');
        return;
    }

    for (const url of urls) {
        await lookForUrls(url);
    }
}

const questions = await centralaService.getQuestions()
await saveQuestionsToFile(questions);

// Clean the visited URLs file
fs.writeFileSync(visitedUrlsFile, '');
await lookForUrls('https://softo.ag3nts.org');







