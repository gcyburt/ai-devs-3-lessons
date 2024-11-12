import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'default_api_key'
});

async function findUniversityStreetForAndrzejMaj() {
  const transcriptsPath = path.join(__dirname, "transcripts.md");
  const transcripts = fs.readFileSync(transcriptsPath, "utf-8");

  const prompt = `
    Na podstawie poniższych transkryptów określ nazwę ulicy uniwersytetu, w którym pracuje Andrzej Maj.
    Informacje mogą nie być dostępne w każdym transkrypcie. Ktoś może wspomnieć o uniwersytecie, ale nie o nazwie ulicy. Ktoś może kłamać.

    Spróbuj znaleźć najbardziej prawdopodobną nazwę ulicy, opierając się na mapach Krakowa.

    Spróbuj myśleć krok po kroku. Pokaż swoje rozumowanie. Podaj nazwę ulicy.
    
    Transcripts:
    ${transcripts}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt }
    ],
    max_tokens: 1500,
    temperature: 0.2
  });

  console.log(response.choices[0]?.message);

  const message = response.choices[0]?.message?.content?.trim();
  const streetInfo = message || "Information not found.";
  console.log(`Street name of the university where Andrzej Maj works: ${streetInfo}`);
}

findUniversityStreetForAndrzejMaj(); 