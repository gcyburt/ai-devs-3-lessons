import express, { type Request, type Response } from "express";
import type InstructionInterface from "./InstructionInterface";
import type DescriptionInterface from "./DescriptionInterface";
import OpenAIService from "./OpenAIService";

const openAIService = new OpenAIService();

const mapDescription = `
                        Mapa składa się z 16 kwadratów. Opis mapy w kartezjańskim układzie współrzędnych.
                        (0,3) Start
                        (1,3) Trawa
                        (2,3) Drzewo
                        (3,3) Dom
                        (0,2) Trawa
                        (1,2) Budynek
                        (2,2) Trawa
                        (3,2) Trawa
                        (0,1) Trawa
                        (1,1) Trawa
                        (2,1) Skały
                        (3,1) Drzewa
                        (0,0) Skały
                        (1,0) Skały
                        (2,0) Samochód
                        (3,0) Jaskinia

                        Startujesz z sekcji (0,3).
`;

const app = express();

// Add middleware to parse JSON bodies
app.use(express.json());

app.listen(2137, () => {
    console.log("Server is running on port 2137");
});

app.get("/", (req: Request, res: Response) => {
    res.send("Ewelina ty ladacznico");
});

app.post("/api/drone", async (req: Request, res: Response) => {
    console.log(req.body);
    const { instruction } = req.body as InstructionInterface;

    const prompt = `
        Jesteś pilotem drona. Otrzymujesz opis mapy i instrukcję.
        Musisz latać dronem zgodnie z instrukcją. Startujesz z sekcji (0,3).

        Opis mapy:
        ${mapDescription}

        Instrukcja:
        ${instruction}

        Podaj co znajduje się pod dronem po wykonaniu wszystkich instrukcji w jednym zdaniu.
        Przedstaw swój tok rozumowania.
    `;

    const response = await openAIService.getCompletion(prompt);

    const description: DescriptionInterface = {
        description: response || "",
    };

    console.log(description);
    res.send(description);
});