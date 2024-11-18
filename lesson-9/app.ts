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
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Zdobyliśmy dostęp do danych z fabryki, są to raporty dzienne kilku działających tam oddziałów.
                    Część z nich to zwykłe raporty techniczne, a część to raporty związane z bezpieczeństwem.
                    Pozyskane dane są w różnych formatach i nie wszystkie zawierają użyteczne dane.
                    Odpowiedz jasnym wskazaniem, czy takie informacje zostały znalezione.
                    Wynik powinien być 'people' jeśli zawiera informacje o schwytanych ludziach lub o śladach ich obecności,
                    'hardware' jesli dokument jest o naprawionych usterkach hardwarowych, 'none' jeśli nie jest żadnym z powyższych.
                    Tekst nie może należeć do więcej niż jednej kategorii. Możliwa odpowiedź to tylko jedna z trzech - people, machine lub none.
                    
                    PAMIĘTAJ: dokument moze być nieistotny i nie zawierający żadnej użytecznej informacji. Wtedy odpowiedz 'none'.`
                },
                {
                    role: "user",
                    content: content
                }
            ]
        });
        console.log("Result:", response.choices[0].message.content);
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
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Otrzymałeś zdjęcie dokumentu naprawczego. Opisz co widzisz na obrazie. Podaj wszystkie szczegóły." },
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
        `${path.extname(imagePath)}_TRANSCRIBED_${path.basename(imagePath, path.extname(imagePath))}.txt`
    );
    fs.writeFileSync(transcribedFilePath, response.choices[0].message.content);
    console.log(`Transcription from image saved to: ${transcribedFilePath}`);
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
            `${path.extname(filePath)}_TRANSCRIBED_${path.basename(filePath, path.extname(filePath))}.txt`
        );
        fs.writeFileSync(transcribedFilePath, response.text);
        console.log(`Transcription from audio file saved to: ${transcribedFilePath}`);

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

async function createSortedPayload(): Promise<void> {
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
            cleaned: file.replace(/.*TRANSCRIBED_/, ''), // Remove everything before and including TRANSCRIBED_
            extension: file.split('_TRANSCRIBED_')[0]
        }))
            .sort((a, b) => a.cleaned.localeCompare(b.cleaned)); // Sort alphabetically by cleaned names

        // Categorize files
        for (const file of cleanedFiles.filter(f => path.extname(f.original).toLowerCase() === '.txt')) {
            const filePath = path.join(dataFolderPath, file.original);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const category = await analyzeTextFile(fileContent);

            console.log(category, fileContent);

            if (category === 'people') {
                payload.people.push(file.cleaned.replace('.txt', file.extension));
            } else if (category === 'hardware') {
                payload.hardware.push(file.cleaned.replace('.txt', file.extension));
            }
        }
        console.log(payload);
    } catch (error) {
        console.error('Error creating sorted payload:', error);
    }
}

// Execute the analysis
// await saveAudioFilesAsText();
// await saveImagesAsText();
await createSortedPayload();