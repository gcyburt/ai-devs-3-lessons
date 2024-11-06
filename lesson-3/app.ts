import { inputJson } from "./input";
import axios from "axios";

type TestDataItem = {
    question: string;
    answer: string | number;
    test?: {
        a: string;
        q: string;
    };
}

type InputJson = {
    apikey: string;
    description: string;
    copyright: string;
    "test-data": TestDataItem[];
}
const main = async () => {

    const input: InputJson = inputJson;

    input.apikey = process.env.API_KEY || 'default_api_key';

    for (let item of input["test-data"]) {
        const answer = item["answer"];
        const question = item["question"];
        const test = item["test"];


        const [num1, , num2] = question.split(" ");
        const result = parseInt(num1) + parseInt(num2);
        if (result !== answer) {
            item["answer"] = result;
        }
        if (test) {
            let test = item["test"];

            const question = test?.q;
            const resultFromLlama = await callLlama(question);

            if (item.test) {
                item.test.a = resultFromLlama;
            }
        }
    }

    sendToCentrala(input);
}

const sendToCentrala = async (data: any) => {

    const payload = { "task": "JSON", "answer": data, "apikey": process.env.API_KEY };

    const fs = require('fs');

    fs.writeFileSync('payload.json', JSON.stringify(payload, null, 2));

    const response = await axios.post("https://centrala.ag3nts.org/report", payload);

    console.log(response);
}

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

main();