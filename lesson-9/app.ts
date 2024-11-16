import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set in the environment variables.');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

async function analyzeTextFile(content: string): Promise<string | null> {
    try {

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Analyze the following text and determine if it contains information about people or machines. Respond with a clear indication if such information is found. Result should be 'people' if it contains information about people, 'hardware' for machines, 'none' if it is neither."
                },
                {
                    role: "user",
                    content: content
                }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error(`Error analyzing content:`, error);
        return null;
    }
}

async function transcribeImage(imagePath: string): Promise<void> {

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Opisz co widzisz na obrazie. Podaj wszystkie szczegóły." },
                    {
                        type: "image_url",
                        image_url: {
                            "url": `data:image/jpeg;base64,${base64Image}`
                        },
                    },
                ],
            },
        ],
    });

    const transcribedFilePath = path.join(
        path.dirname(imagePath),
        `_TRANSCRIBED_${path.basename(imagePath, path.extname(imagePath))}.txt`
    );
    fs.writeFileSync(transcribedFilePath, response.choices[0].message.content);
}

async function transcribeAudioFile(filePath: string): Promise<void> {
    try {
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
        });

        // Save transcription to a file with _TRANSCRIBED prefix
        const transcribedFilePath = path.join(
            path.dirname(filePath),
            `_TRANSCRIBED_${path.basename(filePath, path.extname(filePath))}.txt`
        );
        fs.writeFileSync(transcribedFilePath, response.text);
        console.log(`Transcription saved to: ${transcribedFilePath}`);

    } catch (error) {
        console.error(`Error transcribing file ${filePath}:`, error);
    }
}

async function saveAudioFilesAsText(): Promise<void> {
    const dataFolderPath = path.join(__dirname, 'data');

    try {
        const files = fs.readdirSync(dataFolderPath);

        for (const file of files) {
            const filePath = path.join(dataFolderPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isFile()) {
                if (['.mp3', '.wav', '.flac'].includes(path.extname(filePath).toLowerCase())) {
                    await transcribeAudioFile(filePath);
                }
            }
        }


    } catch (error) {
        console.error('Error processing data folder:', error);
    }
}

async function saveImagesAsText(): Promise<void> {
    const dataFolderPath = path.join(__dirname, 'data');
    const files = fs.readdirSync(dataFolderPath);

    for (const file of files) {
        const filePath = path.join(dataFolderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
            if (['.png'].includes(path.extname(filePath).toLowerCase())) {
                await transcribeImage(filePath);
            }
        }
    }
}

async function createSortedPayload(): Promise<{ people: string[], hardware: string[] }> {
    const dataFolderPath = path.join(__dirname, 'data');
    const payload = {
        people: [] as string[],
        hardware: [] as string[]
    };

    try {
        const files = fs.readdirSync(dataFolderPath);

        // Filter and clean filenames
        const cleanedFiles = files.map(file => ({
            original: file,
            cleaned: file.replace(/^_TRANSCRIBED_/, '') // Remove TRANSCRIBED prefix if present
        }))
            .sort((a, b) => a.cleaned.localeCompare(b.cleaned)); // Sort alphabetically by cleaned names

        // Categorize files
        for (const file of cleanedFiles.filter(f => path.extname(f.original).toLowerCase() === '.txt')) {
            const filePath = path.join(dataFolderPath, file.original);
            console.log(`Analyzing ${filePath}`);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const category = await analyzeTextFile(fileContent);

            if (category === 'people') {
                payload.people.push(file.cleaned);
            } else if (category === 'hardware') {
                payload.hardware.push(file.cleaned);
            }
        }

        return payload;

    } catch (error) {
        console.error('Error creating sorted payload:', error);
        return {
            people: [],
            hardware: []
        };
    }
}

// Execute the analysis
// saveAudioFilesAsText();
await saveImagesAsText();
const result = await createSortedPayload();
console.log(result);