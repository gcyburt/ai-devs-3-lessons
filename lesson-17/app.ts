import * as fs from 'fs';
import * as readline from 'readline';

// Define input files
const correctFile = './lab_data/correct.txt';
const incorrectFile = './lab_data/incorrect.txt';
const outputFile = './output.jsonl';

// Ensure the directory exists
const outputDir = './';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, ''); // Ensure the file is created and empty

// Create a write stream for the output file
const writeStream = fs.createWriteStream(outputFile);

interface MessageObject {
    role: string,
    content: string
}

interface ConversationObject {
    messages: MessageObject[]
}

// Function to process a file
function processFile(inputFile: string, isValid: boolean) {
    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile),
        output: process.stdout,
        terminal: false
    });

    rl.on('line', (line: string) => {
        const values = line.trim().split(',').map(Number);

        const systemMessageObj: MessageObject = {
            role: 'system',
            content: 'Zbadaj poprawność badań'
        }

        const userMessageObj: MessageObject = {
            role: 'user',
            content: values.join(', ')
        }

        const assistantMessageObj: MessageObject = {
            role: 'assistant',
            content: isValid.toString()
        }

        const conversationObj: ConversationObject = {
            messages: [systemMessageObj, userMessageObj, assistantMessageObj]
        }

        // Write the JSON object to the output file as a JSONL line
        writeStream.write(JSON.stringify(conversationObj) + '\n');
    });

    rl.on('close', () => {
        console.log(`✅ Finished processing ${inputFile}`);
    });
}

// Process both files
processFile(correctFile, true);
processFile(incorrectFile, false);

// Close the write stream when done
writeStream.on('finish', () => {
    console.log('🎉 Conversion complete.');
});

writeStream.end();