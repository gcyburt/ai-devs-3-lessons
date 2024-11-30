import axios from 'axios';

const BASE_URL = process.env.CENTRALA_URL || 'http://localhost:3000';

export class CentralaService {
    async getTables() {
        const response = await axios.post(BASE_URL, {
            task: "database",
            apikey: process.env.API_KEY,
            query: "show tables"
        });
        return response.data;
    }

    async getTableDescription(table: string) {
        const response = await axios.post(BASE_URL, {
            task: "database",
            apikey: process.env.API_KEY,
            query: `show create table ${table}`
        });
        return response.data;
    }

    async getTableData(table: string) {
        const response = await axios.post(BASE_URL, {
            task: "database",
            apikey: process.env.API_KEY,
            query: `select * from ${table}`
        });
        return response.data;
    }

    async customQuery(query: string) {
        const response = await axios.post(BASE_URL, {
            task: "database",
            apikey: process.env.API_KEY,
            query: query
        });
        return response.data;
    }
}
