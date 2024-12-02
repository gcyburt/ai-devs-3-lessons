import axios from 'axios';

const BASE_URL = process.env.CENTRALA_BASE_URL || 'http://localhost:3000';

export class CentralaService {
    async getQuestions() {
        const response = await axios.get(`${BASE_URL}/data/${process.env.API_KEY}/softo.json`);
        return response.data;
    }
}