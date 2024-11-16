import OpenAI from 'openai';
import axios from 'axios';


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_KEY = process.env.API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set in the environment variables.');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});


async function getRobotDescription() {
    try {
        const response = await axios.get(`https://centrala.ag3nts.org/data/${API_KEY}/robotid.json`);
        return response.data.description;
    } catch (error) {
        console.error('Error fetching robot description:', error);
        throw error;
    }
}

const description = await getRobotDescription();
console.log(description);

async function generateRobotImage(description: string) {
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: description,
            n: 1,
            size: "1024x1024",
        });

        const imageUrl = response.data[0].url;
        console.log('Generated image URL:', imageUrl);
        return imageUrl;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

// Generate image based on the robot description
const imageUrl = await generateRobotImage(description);
console.log(imageUrl);
