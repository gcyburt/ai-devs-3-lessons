import { CentralaService } from "./CentralaService";
import { OpenAIService } from "./OpenAIService";

const centralaService = new CentralaService();
const openaiService = new OpenAIService();

const tables = await centralaService.getTables();
const tableDescriptions = [];

for (const table of tables.reply) {
    const description = await centralaService.getTableDescription(table.Tables_in_banan);
    const { Table, ...Create } = description.reply[0];
    tableDescriptions.push(`Table: ${Table}\nCreate: ${Create['Create Table']}\n`);
}

const prompt = `You are SQL expert. You are given a table description. You need to write SQL query that will answer the question:

Question: które aktywne datacenter (DC_ID) są zarządzane przez pracowników, którzy są na urlopie (is_active=0)

Table description: ${tableDescriptions}
 Return only SQL query, nothing else.
`;

const query = await openaiService.getCompletion(prompt);
console.log(query);

const result = await centralaService.customQuery(query);
console.log(result);