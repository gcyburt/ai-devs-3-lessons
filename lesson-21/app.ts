import { OpenAIService } from './OpenAIService';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { Dialog } from './types/Dialog';
import type { Payload, Answers } from './types/Answer';

const openaiService = new OpenAIService();


async function getAndStorePhoneCallTranscripts(apiKey: string): Promise<void> {
    const url = `https://centrala.ag3nts.org/data/${apiKey}/phone.json`;
    try {
        const response = await axios.get(url);
        const transcripts = response.data;

        const transcriptsDir = path.resolve(__dirname, 'transcripts');
        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir);
        }

        for (const [key, value] of Object.entries(transcripts)) {
            const filePath = path.join(transcriptsDir, `${key}.json`);
            fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
        }
        console.log('✅ Phone call transcripts stored successfully.');
    } catch (error) {
        console.error('❌ Error fetching or storing phone call transcripts:', error);
    }
}

async function readConversationFiles(): Promise<Dialog[]> {
    const transcriptsDir = path.resolve(__dirname, 'transcripts');
    const files = fs.readdirSync(transcriptsDir);
    const conversations: Dialog[] = [];

    for (const file of files) {
        if (file === 'reszta.json') {
            continue;
        }

        const filePath = path.join(transcriptsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const conversation = JSON.parse(content) as Dialog;
        conversation.filePath = filePath;
        conversations.push(conversation);
    }
    return conversations;
}

async function findMissingElementsInConversation(conversation: Dialog): Promise<void> {
    const resztaFilePath = path.resolve(__dirname, 'transcripts', 'reszta.json');
    const resztaContent = fs.readFileSync(resztaFilePath, 'utf-8');
    const resztaConversations = JSON.parse(resztaContent) as string[];

    console.log("🔍 Filling in missing elements in conversation:", conversation.filePath);

    const prompt = `Uzupełnij brakujące części poniższej rozmowy, korzystając z podanego kontekstu: "${resztaConversations}"
            Kontekst: ${conversation.start} ${conversation.end}
            Liczba elementów w rozmowie: ${conversation.length}
            Nie dołączaj żadnego innego tekstu poza rozmową.`;

    const response = await openaiService.getCompletion(prompt);

    const responsesDir = path.resolve(__dirname, 'responses');
    if (!fs.existsSync(responsesDir)) {
        fs.mkdirSync(responsesDir);
    }

    const responseFileName = path.basename(conversation.filePath);
    const responseFilePath = path.join(responsesDir, `response_${responseFileName}.txt`);

    if (response !== null) {
        fs.writeFileSync(responseFilePath, response);
    } else {
        console.error(`❌ Response for index ${conversation.filePath} is null and cannot be written to file.`);
    }
}

async function getAndSaveQuestions(apiKey: string): Promise<void> {
    const url = `https://centrala.ag3nts.org/data/${apiKey}/phone_questions.json`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch questions: ${response.statusText}`);
        }
        const questions = await response.json();

        const questionsDir = path.resolve(__dirname, 'questions');
        if (!fs.existsSync(questionsDir)) {
            fs.mkdirSync(questionsDir);
        }

        const questionsFilePath = path.join(questionsDir, 'phone_questions.json');
        fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2));
        console.log(`✅ Questions saved to ${questionsFilePath}`);
    } catch (error) {
        console.error(`❌ Error fetching or saving questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

async function getEndpointResponse(response: { endpoint: string, password: string }): Promise<string> {
    const endpoint = response.endpoint;
    const password = response.password;

    const result = await axios.post(endpoint, {
        password: password
    });

    console.log(`✅ Endpoint response: ${result.data.message}`);

    return result.data.message;
}

async function answerQuestionsUsingResponsesWithAI(): Promise<Payload> {
    const questionsFilePath = path.resolve(__dirname, 'questions', 'phone_questions.json');
    const responsesDir = path.resolve(__dirname, 'responses');
    if (!fs.existsSync(responsesDir)) {
        console.error(`❌ Responses directory does not exist: ${responsesDir}`);
        return;
    }

    const responseFiles = fs.readdirSync(responsesDir);
    const phoneCallTranscripts: String[] = [];
    const facts = await loadFacts();

    for (const file of responseFiles) {
        const filePath = path.join(responsesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        phoneCallTranscripts.push(content);
    }

    if (!fs.existsSync(questionsFilePath)) {
        console.error(`❌ Questions file does not exist: ${questionsFilePath}`);
        return;
    }

    const questionsContent = fs.readFileSync(questionsFilePath, 'utf-8');
    const questions = JSON.parse(questionsContent);

    const answers: Answers = {};

    for (const [key, question] of Object.entries(questions)) {

        const prePrompt = `
            ${question}
            
            Twoim zadaniem jest zaklasyfikowanie pytania do jednej z poniższych kategorii:
            - endpoint (tylko i wyłącznie wtedy, gdy pytanie dotyczy endpointu tego co zwraca endpoint)
            - content

            Jeśli z pytania wynika, ze nalezy wykonac zapytanie do endpointu, to odpowiedz słowem "endpoint".
            W przeciwnym wypadku odpowiedz słowem "content". Pytanie o prawdziwość endpointu nie jest pytaniem o endpoint.
        `;

        const classification = await openaiService.getCompletion(prePrompt);

        const prompt = `Używając poniższych odpowiedzi, odpowiedz na pytanie: "${question}"
        Fakty: ${facts.join('\n')}
        Odpowiedzi: ${phoneCallTranscripts.join('\n')}
        Odpowiedź powinna być krótka i zwięzła. Jeśli pytanie jest o osobę, to podaj konkretne imię i nazwisko.
        Jeśli pytanie jest CO ZWRACA endpoint, to podaj dokładny adres URL oraz hasło do niego w formacie JSON { "endpoint": "https://example.com", "password": "password" } i nie dopisuj nic więcej.
        Jeśli pytanie jest po prostu o endpoint, to podaj dokładny adres URL do niego.
        `;
        console.log(`✅ classification: ${classification}`);

        const response = await openaiService.getCompletion(prompt);
        if (response) {
            if (classification === 'endpoint') {
                const endpointPayload = JSON.parse(response) as { endpoint: string, password: string };
                console.log(`✅ Endpoint payload: ${JSON.stringify(endpointPayload)}`);
                const endpointResponse = await getEndpointResponse(endpointPayload);
                console.log(`✅ Endpoint response: ${endpointResponse}`);
                answers[key] = endpointResponse;
            } else if (classification === 'content') {
                answers[key] = response;
            }
        } else {
            console.error(`❌ No answer generated for question: ${question}`);
        }

    }

    const payload: Payload = {
        "task": 'phone',
        "answer": answers,
        "apiKey": process.env.CENTRALA_API_KEY as string
    }

    return payload;
}



// await getAndStorePhoneCallTranscripts(process.env.API_KEY as string);

const conversations = await readConversationFiles();

// for (const conversation of conversations) {
//     await findMissingElementsInConversation(conversation);
// }

await getAndSaveQuestions(process.env.API_KEY as string);
const payload = await answerQuestionsUsingResponsesWithAI();
console.log(payload);
