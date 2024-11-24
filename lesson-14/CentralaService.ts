import axios from 'axios';

const BASE_URL = process.env.CENTRALA_BASE_URL || 'http://localhost:3000';

export class CentralaService {
    async getData(asset: string, type: string) {
        let url = `${BASE_URL}/people`;

        switch (type) {
            case 'people':
                url = `${BASE_URL}/people`;
                break;
            case 'places':
                url = `${BASE_URL}/places`;
                break;
        }


        const response = await axios.post(url, {
            apikey: process.env.API_KEY,
            query: asset
        });
        return response.data;
    }
}