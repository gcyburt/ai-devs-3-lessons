import { CentralaService } from "./CentralaService";
import { OpenAIService } from "./OpenAIService";
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const centralaService = new CentralaService();
const openaiService = new OpenAIService();

async function downloadNote() {
    try {
        const response = await axios.get(`${process.env.CENTRALA_BASE_URL}/dane/barbara.txt`);

        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        // Write the file
        const filePath = path.join(dataDir, 'barbara.txt');
        fs.writeFileSync(filePath, response.data);
        console.log('Note downloaded successfully to:', filePath);
    } catch (error) {
        console.error('Error downloading note:', error);
    }
}

async function extractNamesFromNote() {
    try {
        const filePath = path.join(__dirname, 'data', 'barbara.txt');
        const noteContent = fs.readFileSync(filePath, 'utf-8');

        const prompt = `
        W notatce poniżej wymieniono kilka imion. Wymień wszystkie imiona, które zostały wymienione w tej notatce w formie listy rozdzielonej przecinkami:
        
        ${noteContent}

        Pamiętaj aby pominąć nazwiska.
        `;

        const namesList = await openaiService.getCompletion(prompt);
        return namesList;
    } catch (error) {
        console.error('Error extracting names from note:', error);
    }
}

async function getMoreInfoAboutNames(namesList: string) {
    try {
        const names = namesList.split(',').map(name => name.trim()).filter(name => name);
        const results = [];

        for (const name of names) {
            let nameWithoutDiacritics = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (nameWithoutDiacritics === 'Rafał') {
                nameWithoutDiacritics = 'Rafal';
            }

            console.log(`Getting information about ${nameWithoutDiacritics}`);
            const data = await centralaService.getData(nameWithoutDiacritics.toUpperCase(), 'people');

            if (data) {
                console.log(`Information about ${name}:`, data);
                results.push(`Information about ${name}: ${JSON.stringify(data)}`);
            } else {
                console.log(`No information found for ${name}`);
                results.push(`No information found for ${name}`);
            }
        }

        // Write results to people.txt
        const filePath = path.join(__dirname, 'data', 'people.txt');
        fs.writeFileSync(filePath, results.join('\n'), 'utf-8');
        console.log('Results stored in:', filePath);

    } catch (error) {
        console.error('Error getting more information about names:', error);
    }
}

async function getMoreInfoAboutPlaces() {
    try {
        const filePath = path.join(__dirname, 'data', 'people.txt');
        const noteContent = fs.readFileSync(filePath, 'utf-8');

        const prompt = `
        W notatce poniżej wymieniono kilka imion i nazw miejscowości. Wymień wszystkie miejscowości, które zostały wymienione w tej notatce w formie listy rozdzielonej przecinkami:
        
        ${noteContent}

        Pamiętaj aby nazwy miejscowości były w języku polskim i bez polskich znaków diakrytycznych oraz powinny być pisane DRUKOWANYMI literami.
        `;

        const placesList = await openaiService.getCompletion(prompt);

        if (!placesList) {
            console.log('No places found in the note');
            return;
        }

        const places = placesList.split(',').map(place => place.trim()).filter(place => place);
        const results = [];

        for (const place of places) {
            console.log(`Getting information about ${place}`);
            const data = await centralaService.getData(place.toUpperCase(), 'places');

            if (data) {
                console.log(`Information about ${place}:`, data);
                results.push(`Information about ${place}: ${JSON.stringify(data)}`);
            } else {
                console.log(`No information found for ${place}`);
                results.push(`No information found for ${place}`);
            }
        }

        // Write results to places.txt
        const filePathToSave = path.join(__dirname, 'data', 'places.txt');
        fs.writeFileSync(filePathToSave, results.join('\n'), 'utf-8');
        console.log('Results stored in:', filePathToSave);

    } catch (error) {
        console.error('Error getting more information about places:', error);
    }
}


downloadNote();

const namesList = await extractNamesFromNote();

if (namesList) {
    await getMoreInfoAboutNames(namesList);
}

await getMoreInfoAboutPlaces();

const barbaraFile = fs.readFileSync(path.join(__dirname, 'data', 'barbara.txt'), 'utf-8');
const peopleFile = fs.readFileSync(path.join(__dirname, 'data', 'people.txt'), 'utf-8');
const placesFile = fs.readFileSync(path.join(__dirname, 'data', 'places.txt'), 'utf-8');

const prompt = `
Based on the information provided in the following files, determine the city where Barbara is located:

1. ${barbaraFile}: This file contains notes that may mention Barbara and other names. Extract any city names associated with Barbara.

2. ${peopleFile}: This file contains information about places that people are associated with, including Barbara. Look for any references to cities in relation to Barbara.

3. ${placesFile}: This file lists places visited by people mentioned in the notes. Identify any cities that are linked to Barbara.

Please provide the name of the city where Barbara is located, based on the information from these files. It is not Krakow nor Lublin.
Provide thinking process.
`;

const city = await openaiService.getCompletion(prompt);
console.log(city);

const t = await getMoreInfoAboutNames('AZAZEL');
console.log(t);