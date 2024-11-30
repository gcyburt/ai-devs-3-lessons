import neo4j, { Driver, Session, Integer } from 'neo4j-driver';

export class Neo4jService {
    private driver: Driver;
    private session: Session;

    constructor(uri: string, user: string, password: string) {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        this.session = this.driver.session();
    }

    async runQuery(query: string, parameters: any = {}) {
        try {
            const result = await this.session.run(query, parameters);
            return result.records.map(record => record.toObject());
        } catch (error) {
            console.error('Error running query:', error);
            throw error;
        }
    }

    async addPoint(label: string, properties: Record<string, any>) {
        const query = `
            CREATE (n:${label} $properties)
            RETURN n
        `;
        try {
            const result = await this.session.run(query, { properties });
            return result.records.map(record => record.get('n').properties);
        } catch (error) {
            console.error('Error adding point:', error);
            throw error;
        }
    }

    async connectNodes(fromNodeId: number, toNodeId: number, relationshipType: string, properties: Record<string, any> = {}): Promise<void> {
        const cypher = `
          MATCH (a), (b)
          WHERE id(a) = $fromNodeId AND id(b) = $toNodeId
          CREATE (a)-[r:${relationshipType} $properties]->(b)
          RETURN r
        `;
        await this.runQuery(cypher, {
            fromNodeId: neo4j.int(fromNodeId),
            toNodeId: neo4j.int(toNodeId),
            properties
        });
    }

    async findNodeByProperty(label: string, propertyName: string, propertyValue: any): Promise<{ id: number, properties: Record<string, any> } | null> {
        const cypher = `
          MATCH (n:${label} {${propertyName}: "${propertyValue}"})
          RETURN id(n) AS id, n
        `;
        const record = await this.runQuery(cypher, { propertyValue });

        if (record.length === 0) {
            return null;
        }

        return {
            id: (record[0].id as Integer).toNumber(),
            properties: record[0].n.properties
        };
    }

    async findShortestPath(fromNodeId: number, toNodeId: number): Promise<any[]> {
        const cypher = `
            MATCH (start), (end),
            p = shortestPath((start)-[*]-(end))
            WHERE id(start) = ${fromNodeId} AND id(end) = ${toNodeId}
            RETURN p
        `;
        const result = await this.runQuery(cypher, {
            fromNodeId: neo4j.int(fromNodeId),
            toNodeId: neo4j.int(toNodeId)
        });

        if (result.length === 0) {
            return [];
        }

        return result[0].p.segments.map((segment: any) => ({
            start: segment.start.properties,
            relationship: segment.relationship.properties,
            end: segment.end.properties
        }));
    }
}