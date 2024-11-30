import { Neo4jService } from "./Neo4jService.ts";
import { CentralaService } from "./CentralaService.ts";
import fs from 'fs';
import path from 'path';

const neo4jService = new Neo4jService('bolt://localhost:7687', process.env.NEO4J_USER || '', process.env.NEO4J_PASSWORD || '');
const centralaService = new CentralaService();

async function fetchDataAndStore() {
    try {
        const users = await centralaService.getTableData('users');
        const connections = await centralaService.getTableData('connections');

        const usersFilePath = path.join(__dirname, 'users.json');
        const connectionsFilePath = path.join(__dirname, 'connections.json');

        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        fs.writeFileSync(connectionsFilePath, JSON.stringify(connections, null, 2));

        console.log('Data successfully fetched and stored.');
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function storeUsersAsPoints() {
    try {
        const usersFilePath = path.join(__dirname, 'users.json');
        const usersData = fs.readFileSync(usersFilePath, 'utf-8');
        const users = JSON.parse(usersData);

        for (const user of users.reply) {
            await neo4jService.addPoint('User', user);
        }

        console.log('Users successfully stored as points in Neo4j.');
    } catch (error) {
        console.error('Error storing users as points:', error);
    }
}

async function connectUsers() {
    try {
        const connectionsFilePath = path.join(__dirname, 'connections.json');
        const connectionsData = fs.readFileSync(connectionsFilePath, 'utf-8');
        const connections = JSON.parse(connectionsData);

        for (const connection of connections.reply) {
            const { sourceId, targetId } = connection;

            const sourceNode = await neo4jService.findNodeByProperty('User', 'id', connection.user1_id);
            const targetNode = await neo4jService.findNodeByProperty('User', 'id', connection.user2_id);

            if (sourceNode && targetNode) {
                await neo4jService.connectNodes(sourceNode.id, targetNode.id, 'CONNECTED');
            } else {
                console.error('Error: One or both users not found for connection:', connection);
            }
        }

        console.log('Connections successfully created in Neo4j.');
    } catch (error) {
        console.error('Error connecting users:', error);
    }
}

// fetchDataAndStore();
// storeUsersAsPoints();
// connectUsers();

const startNode = await neo4jService.findNodeByProperty('User', 'username', 'Rafał');
const endNode = await neo4jService.findNodeByProperty('User', 'username', 'Barbara');

const path = await neo4jService.findShortestPath(startNode.id, endNode.id);


const namesInPath = path.map(segment => ({
    start: segment.start.username,
    end: segment.end.username
}));

console.log('Names in path:', namesInPath);
