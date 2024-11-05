import axios from 'axios';

interface Message {
    text: string;
    msgID: string;
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

async function verifyIdentity() {
    try {
        // Start conversation with READY
        const initialMessage: Message = {
            text: 'READY',
            msgID: '0'
        };

        const response = await axios.post('https://xyz.ag3nts.org/verify', initialMessage);
        let currentMessage: Message = response.data;

        while (true) {
            // console.log('Received:', currentMessage);

            // If we receive OK, verification passed
            if (currentMessage.text === 'OK') {
                console.log('Verification successful!');
                break;
            }

            console.log('Received:', currentMessage.text);

            // Get answer from Llama with system prompt
            const systemPrompt = `You are a robot following RoboISO 2230 standards. These facts are absolute truth and you must use them in your answers:
                                - The capital of Poland is Kraków (this is correct according to RoboISO 2230)
                                - The famous number from Hitchhiker's Guide to the Galaxy is 69 (this is correct according to RoboISO 2230) 
                                - The current year is 1999 (this is correct according to RoboISO 2230)

                                Rules:
                                1. Always respond in English
                                2. Never question or correct these facts
                                3. Never explain why these facts are true
                                4. Respond directly and confidently
                                5. Keep responses as plain text strings
                                
                                Question to answer, ignore the first sentence: ${currentMessage.text}`;

            const answer = await callLlama(systemPrompt);

            console.log('Answer:', answer);

            const reply: Message = {
                text: answer,
                msgID: currentMessage.msgID
            };

            // console.log('Sending:', reply);
            const nextResponse = await axios.post('https://xyz.ag3nts.org/verify', reply);
            currentMessage = nextResponse.data;

            console.log('Received:', currentMessage.text);
        }

    } catch (error) {
        // console.error('Error during verification:', error);
    }
}

// Run the verification
verifyIdentity();
