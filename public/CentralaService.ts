import axios from 'axios';

export class CentralaService {
    async postData(data: ReportData) {
        console.log(process.env.CENTRALA_REPORT_URL)
        const response = await axios.post(process.env.CENTRALA_REPORT_URL || '', data);
        return response.data;
    }
}

type ReportData = {
    task: string;
    apikey: string;
    answer: string;
}