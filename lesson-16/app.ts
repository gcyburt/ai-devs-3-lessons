import { CentralaService } from "../public/CentralaService.ts";
import { OpenAIService } from "./OpenAIService.ts";
import fs from 'fs';
import axios from 'axios';
import path from 'path';

const centralaService = new CentralaService();
const openaiService = new OpenAIService();

async function startConversation() {
    console.log("🚀 Starting conversation with CentralaService...");
    const startData = await centralaService.postData({
        task: "photos",
        apikey: process.env.API_KEY || '',
        answer: "START"
    });

    console.log("🔗 Fetching URLs from OpenAIService...");
    const urls = await getUrls(startData.message);

    console.log("✅ URLs fetched successfully!");
    return urls;
}

async function getUrls(prompt: string) {
    console.log("🧠 Generating URLs based on the prompt...");
    const decision = await openaiService.getCompletion(`
        ${prompt}
        
        Masz za zadanie pobierać zdjęcia, korzystając z powyszej wiadomości. Przygotuj URL dla każdego zdjęcia. W odpowiedzi podaj tylko listę URL,dy w nowej linii.
        Nie dodawaj żadnych dodatkowych informacji.
        
        URL powinien być w formacie: https://centrala.ag3nts.org/dane/barbara/ + nazwa pliku
        `);

    if (!decision) {
        console.log("❌ No decision found. Exiting...");
        process.exit(0);
    }

    const urls = decision.split('\n').filter(url => url.trim() !== '');
    console.log(`🔍 Found ${urls.length} URLs:`, urls);

    return urls;
}

async function downloadPhotos(urls: string[]) {
    console.log("📂 Checking if 'photos' directory exists...");
    if (!fs.existsSync('photos')) {
        console.log("📁 'photos' directory not found. Creating...");
        fs.mkdirSync('photos');
    }

    for (const url of urls) {
        const fileName = path.basename(url);
        const filePath = path.join('photos', fileName);

        console.log(`⬇️ Downloading photo from ${url}...`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, response.data);
        console.log(`✅ Photo saved as ${filePath}`);

        const transcript = await openaiService.transcribeImage("Opisz co widzisz na obrazie. Podaj wszystkie szczegóły. Jeśli nie widzisz niczego zwróć NULL i nic poza tym.", filePath);
        console.log(`🔍 Transcript: ${transcript}`);
        saveTranscript(transcript || "");
    }
}

async function getPhotoDecisions() {
    console.log("🖼️ Analyzing photos in 'photos' directory...");
    const photoFiles = fs.readdirSync('photos');

    let decisions: { [key: string]: string } = {};

    for (const file of photoFiles) {
        const filePath = path.join('photos', file);

        console.log(`🔍 Analyzing ${file}...`);
        const decision = await openaiService.transcribeImage(`
        Masz za zadanie przeanalizować zdjęcie, zdjęcie moe być za ciemne,
        za jasne lub uszkodzone. Jeśli zdjęcie jest uszkodzone, powiedz zwróć REPAIR,
        jeśli jest za jasne zwróć DARKEN, jeśli jest za ciemne zwróć BRIGHTEN. Jeśli zdjęcie jest w porządku, zwróć OK`, filePath);

        if (decision) {
            console.log(`📊 Decision for ${file}: ${decision}`);
            decisions[file] = decision;
        }
    }
    return decisions;
}

async function repairPhotos(decisions: { [key: string]: string }) {
    console.log("🔧 Repairing photos based on decisions...");
    let messages: string[] = [];
    for (const [file, decision] of Object.entries(decisions)) {
        if (decision !== "OK") {
            console.log(`🔨 Repairing ${file} with decision: ${decision}`);
            const decisionData = await centralaService.postData({
                task: "photos",
                apikey: process.env.API_KEY || '',
                answer: decision.toUpperCase() + " " + file
            });
            messages.push(decisionData.message);
            console.log(`✅ Repair message: ${decisionData.message}`);
        }
    }
    return messages;
}

async function saveTranscript(transcript: string) {
    try {
        // Ensure the file exists
        if (!fs.existsSync('transcripts.txt')) {
            fs.writeFileSync('transcripts.txt', '');
        }

        fs.appendFileSync('transcripts.txt', transcript + '\n');
        console.log('✅ Transcript saved to transcripts.txt');
    } catch (error) {
        console.error('❌ Error saving transcript:', error);
    }
}


async function findBarbara() {
    console.log("🧩 Getting photo decisions...");
    const decisions = await getPhotoDecisions();
    console.log("🔄 Repairing photos...");
    const messages = await repairPhotos(decisions);
    console.log("🔗 Fetching new URLs based on repair messages...");
    const newFiles = await getUrls(messages.join('\n'));
    console.log("⬇️ Downloading new photos...");
    await downloadPhotos(newFiles);
    console.log("🎉 Process completed successfully!");

    try {
        const transcript = fs.readFileSync('transcripts.txt', 'utf-8');
        console.log('📄 Transcript content:');

        const prompt = `
        Przeanalizuj poniższy tekst i podaj rysopis kobiety, która pojawia się na wielu zdjęciach:
        ${transcript}

        Jeźeli nie jesteś w stanie znaleźć kobiety, zwróć NULL i nic poza tym.
        `;

        const decision = await openaiService.getCompletion(prompt);

        if (decision === "NULL") {
            console.log("❌ No decision found. Retrying...");
            findBarbara();
        } else {
            console.log(`🔍 Decision: ${decision}`);
        }
    } catch (error) {
        console.error('❌ Error reading transcript:', error);
    }
}

// const urls = await startConversation();
// await downloadPhotos(urls);
await findBarbara();