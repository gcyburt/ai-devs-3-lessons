import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'default_api_key'
});

async function transcribeAudio(filePath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-1",
  });

  return transcription.text;
}

async function main() {
  const audioDir = path.join(__dirname, "przesluchania");
  const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith(".m4a"));
  const outputFilePath = path.join(__dirname, "transcripts.md");

  let allTranscripts = "# Transcripts\n\n";

  for (const file of audioFiles) {
    const filePath = path.join(audioDir, file);
    const transcript = await transcribeAudio(filePath);
    allTranscripts += `## Transcript for ${file}\n${transcript}\n\n`;
  }

  fs.writeFileSync(outputFilePath, allTranscripts);
  console.log(`All transcripts have been written to ${outputFilePath}`);
}

main();