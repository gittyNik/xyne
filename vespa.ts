// import { env, pipeline } from '@xenova/transformers';
// let { pipeline, env } = await import('@xenova/transformers');

import fs from "node:fs/promises";
const transformers = require('@xenova/transformers')
const { pipeline, env } = transformers
import type { VespaResponse, File } from "./types";
import { checkAndReadFile } from "./utils";
import { progress_callback } from './utils';
import config from "./config";
import { driveFilesToDoc, DriveMime, googleDocs, listFiles, toPermissionsList } from "./integrations/google";

// Define your Vespa endpoint and schema name
const VESPA_ENDPOINT = 'http://localhost:8080';
const SCHEMA = 'file'; // Replace with your actual schema name
const NAMESPACE = 'namespace'; // Replace with your actual namespace
const CLUSTER = 'my_content';
env.backends.onnx.wasm.numThreads = 1;


env.localModelPath = './'
env.cacheDir = './'
const extractor = await pipeline('feature-extraction', 'Xenova/bge-base-en-v1.5', { progress_callback, cache_dir: env.cacheDir });
function handleVespaGroupResponse(response: VespaResponse): AppEntityCounts {
    const appEntityCounts: AppEntityCounts = {};

    // Navigate to the first level of groups
    const groupRoot = response.root.children?.[0]; // Assuming this is the group:root level
    if (!groupRoot || !('children' in groupRoot)) return appEntityCounts; // Safeguard for empty responses

    // Navigate to the app grouping (e.g., grouplist:app)
    const appGroup = groupRoot.children?.[0];
    if (!appGroup || !('children' in appGroup)) return appEntityCounts; // Safeguard for missing app group

    // Iterate through the apps
    for (const app of appGroup.children) {
        const appName = app.value as string;  // Get the app name
        appEntityCounts[appName] = {};        // Initialize the app entry

        // Navigate to the entity grouping (e.g., grouplist:entity)
        const entityGroup = app.children?.[0];
        if (!entityGroup || !('children' in entityGroup)) continue; // Skip if no entities

        // Iterate through the entities
        for (const entity of entityGroup.children) {
            const entityName = entity.value as string; // Get the entity name
            const count = entity.fields?.["count()"] || 0;  // Get the count or default to 0
            appEntityCounts[appName][entityName] = count;  // Assign the count to the app-entity pair
        }
    }

    return appEntityCounts;  // Return the final map
}

/**
 * Deletes all documents from the specified schema and namespace in Vespa.
 */
async function deleteAllDocuments() {
    // Construct the DELETE URL
    const url = `${VESPA_ENDPOINT}/document/v1/${NAMESPACE}/${SCHEMA}/docid?selection=true&cluster=${CLUSTER}`;

    try {
        const response: Response = await fetch(url, {
            method: 'DELETE',
        });

        if (response.ok) {
            console.log('All documents deleted successfully.');
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to delete documents: ${response.status} ${response.statusText} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error deleting documents:', error);
    }
}

const insertDocument = async (document: File) => {
    try {
        const response = await fetch(
            `${VESPA_ENDPOINT}/document/v1/${NAMESPACE}/${SCHEMA}/docid/${document.docId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields: document }),
            }
        );

        const data = await response.json();

        if (response.ok) {
            console.log(`Document ${document.docId} inserted successfully:`, data);
        } else {
            console.error(`Error inserting document ${document.docId}:`, data);
        }
    } catch (error) {
        console.error(`Error inserting document ${document.docId}:`, error.message);
    }
}

export const autocomplete = async (query: string, email: string, limit: number = 5): Promise<VespaResponse | null> => {
    // Construct the YQL query for fuzzy prefix matching with maxEditDistance:2
    const yqlQuery = `select * from sources ${SCHEMA} where title_fuzzy contains ({maxEditDistance: 2, prefix: true}fuzzy(@query)) and permissions contains @email`;

    const searchPayload = {
        yql: yqlQuery,
        query: query,
        email,
        hits: limit, // Limit the number of suggestions
        'ranking.profile': 'autocomplete', // Use the autocomplete rank profile
        'presentation.summary': 'default',
    };
    try {
        const response = await fetch(`${VESPA_ENDPOINT}/search/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to perform autocomplete search: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error performing autocomplete search:', error);
        // TODO: instead of null just send empty response
        return null;
    }
};

const vespaCacheDir = './data/vespa-data.json'
export const ingestAll = async (userEmail: string) => {
    const fileMetadata = (await listFiles(userEmail)).map(v => {
        v.permissions = toPermissionsList(v.permissions)
        return v
    })
    const googleDocsMetadata = fileMetadata.filter(v => v.mimeType === DriveMime.Docs)
    const googleSheetsMetadata = fileMetadata.filter(v => v.mimeType === DriveMime.Sheets)
    const googleSlidesMetadata = fileMetadata.filter(v => v.mimeType === DriveMime.Slides)
    const rest = fileMetadata.filter(v => v.mimeType !== DriveMime.Docs)

    const documents: File[] = await googleDocs(googleDocsMetadata)
    const driveFiles: File[] = driveFilesToDoc(rest)
    console.log(documents.length, driveFiles.length)

    console.log('generating embeddings')
    let allFiles: File[] = [...driveFiles, ...documents]
    let vespaData = []
    for (const v of allFiles) {
        let title_embedding = (await extractor(v.title, { pooling: 'mean', normalize: true })).tolist()[0]
        let chunk_embedding = (await extractor(v.chunk, { pooling: 'mean', normalize: true })).tolist()[0]
        vespaData.push({
            docId: v.docId,
            title: v.title,
            chunk: v.chunk,
            chunkIndex: v.chunkIndex,
            url: v.url,
            app: v.app,
            owner: v.owner,
            photoLink: v.photoLink,
            ownerEmail: v.ownerEmail,
            entity: v.entity,
            permissions: v.permissions,
            mimeType: v.mimeType,
            title_embedding,
            chunk_embedding
        })
        console.clear()
        process.stdout.write(`${(vespaData.length / allFiles.length) * 100}`)
    }

    await fs.writeFile(vespaCacheDir, JSON.stringify(vespaData))
    return vespaData
}


export const initVespa = async (email: string) => {
    let data = await checkAndReadFile(vespaCacheDir)
    if (!data) {
        data = await ingestAll(email)
    }

    for (const doc of data) {
        doc.docId = `${doc.docId}-${doc.chunkIndex}`
        await insertDocument(doc)
    }
}


const email = 'saheb@xynehq.com'

type YqlProfile = {
    profile: string,
    yql: string
}

const SemanticProfile: YqlProfile = {
    profile: "semantic",
    yql: "select * from file where {targetHits:10}nearestNeighbor(title_embedding, e)"
}

const HybridProfile: YqlProfile = {
    profile: "hybrid",
    yql: "select * from file where ({targetHits:10}userInput(@query)) or ({targetHits:10}nearestNeighbor(title_embedding,e))"
}
const HybridDefaultProfile: YqlProfile = {
    profile: "default",
    yql: `select * from file where (({targetHits:10}userInput(@query)) or ({targetHits:10}nearestNeighbor(title_embedding,e)))`
}

// select * from file where (({targetHits:10}userInput(@query)) or ({targetHits:10}nearestNeighbor(title_embedding, e))) and app == @app and entity == @entity

const HybridDefaultProfileAppEntityCounts: YqlProfile = {
    profile: "default",
    yql: `select * from file 
        where ({targetHits:10}userInput(@query)) 
        or ({targetHits:10}nearestNeighbor(title_embedding, e)) 
        limit 0 
        | all(
            group(app) each(
            group(entity) each(output(count()))
            )
        )`
}

// TODO: extract out the fetch and make an api client
export const groupVespaSearch = async (query: string, email: string, app?: string, entity?: string): Promise<AppEntityCounts | {}> => {
    const url = 'http://localhost:8080/search/';
    const qEmbedding = (await extractor(query, { pooling: 'mean', normalize: true })).tolist()[0];
    let yqlQuery = HybridDefaultProfileAppEntityCounts.yql

    const hybridDefaultPayload = {
        yql: yqlQuery,
        query,
        email,
        'ranking.profile': HybridDefaultProfileAppEntityCounts.profile,
        'input.query(e)': qEmbedding,
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(hybridDefaultPayload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return handleVespaGroupResponse(data)
    } catch (error) {
        console.error('Error performing search:', error);
        return {}
    }
}

export const searchVespa = async (query: string, email: string, app?: string, entity?: string, limit = config.page, offset?: number): Promise<VespaResponse | {}> => {
    const url = 'http://localhost:8080/search/';
    const qEmbedding = (await extractor(query, { pooling: 'mean', normalize: true })).tolist()[0];

    // let yqlQuery = `select * from sources * where userInput(@query) and permissions contains @email`
    // let yqlQuery = `select * from file where userInput(@query) and permissions contains @email`
    // let yqlQuery = "select * from sources * where ({targetHits:100}userInput(@query)) OR ({targetHits:10}nearestNeighbor(embedding, e))";




    // let yqlQuery = HybridDefaultProfile.yql
    let yqlQuery = HybridDefaultProfile.yql

    if (app && entity) {
        yqlQuery += ` and app contains @app and entity contains @entity`;
    }

    // const searchPayload = {
    //     yql: yqlQuery,
    //     query,
    //     email,
    //     app, entity,
    //     'ranking.profile': 'vector-only',
    //     'ranking.listFeatures': false,
    //     'ranking.features.query(query_embedding)': {
    //         "type": "tensor<float>(x[768])",
    //         "values": qEmbedding,
    //     },
    //     'ranking.features.query(alpha)': 0.25,
    //     'presentation.summary': 'default',
    // };
    const semanticPayload = {
        yql: SemanticProfile.yql,
        email,
        'ranking.profile': 'semantic',
        'input.query(e)': qEmbedding,
    };

    // let yqlQuery = `select * from file where userInput(@query)`;

    const searchPayload = {
        yql: yqlQuery,
        email, // For the permissions filtering
        query, // For BM25 scoring
        'ranking.profile': 'hybrid_with_filtering',
        'input.query(e)': qEmbedding, // Pass the query embedding
    };

    const hybridPayload = {
        yql: HybridProfile.yql,
        query,
        email,
        'ranking.profile': HybridProfile.profile,
        'input.query(e)': qEmbedding,
    }

    const hybridNormalizePayload = {
        yql: HybridProfile.yql,
        query,
        email,
        'ranking.profile': HybridProfile.profile,
        'input.query(e)': qEmbedding,
    }

    const hybridDefaultPayload = {
        yql: yqlQuery,
        query,
        email,
        'ranking.profile': HybridDefaultProfile.profile,
        'input.query(e)': qEmbedding,
        hits: limit,
        alpha: 0.5,
        ...(offset ? {
            offset
        } : {}),
        ...(app && entity ? ({ app, entity }) : {}),
        variables: {
            query,
            app,
            entity
        }
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(hybridDefaultPayload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data
    } catch (error) {
        console.error('Error performing search:', error);
        return {}
    }
}



/**
 * Retrieves the total count of documents in the specified schema, namespace, and cluster.
 */
const getDocumentCount = async () => {
    // Encode the YQL query to ensure it's URL-safe
    const yql = encodeURIComponent(`select * from sources ${SCHEMA} where true`);

    // Construct the search URL with necessary query parameters
    const url = `${VESPA_ENDPOINT}/search/?yql=${yql}&hits=0&cluster=${CLUSTER}`;

    try {
        const response: Response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch document count: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        // Extract the total number of hits from the response
        const totalCount = data?.root?.fields?.totalCount;

        if (typeof totalCount === 'number') {
            console.log(`Total documents in schema '${SCHEMA}' within namespace '${NAMESPACE}' and cluster '${CLUSTER}': ${totalCount}`);
        } else {
            console.error('Unexpected response structure:', data);
        }
    } catch (error) {
        console.error('Error retrieving document count:', error);
    }
}

// Example usage:
const query = 'xyne';
// const qEmbedding = (await extractor(query, { pooling: 'mean', normalize: true })).tolist()[0];

await deleteAllDocuments()
await initVespa(email)
// console.log(JSON.stringify(await searchVespa('welcome my friend, let me provide you with a prompt', 'saheb@xynehq.com')))
// const output = (await searchVespa(query, email))
// console.log(JSON.stringify(output, null, 2))

// Execute the function
// getDocumentCount();
// await autocomplete(query, email)

// Define a type for Entity Counts (where the key is the entity name and the value is the count)
interface EntityCounts {
    [entity: string]: number;
}

// Define a type for App Entity Counts (where the key is the app name and the value is the entity counts)
interface AppEntityCounts {
    [app: string]: EntityCounts;
}

// const handleVespaResponse = (response: VespaResponse): AppEntityCounts => {
//     const appEntityCounts: AppEntityCounts = {};

//     // Iterate through the root children
//     for (const item of response.root.children) {
//         if ('label' in item && item.label === "app") {
//             const app = item.value as string;  // Get the app name
//             appEntityCounts[app] = {};         // Initialize the app entry

//             // Iterate through the entity groups inside the app group
//             for (const entity of item.children) {
//                 const entityName = entity.value as string;  // Get the entity name
//                 const count = entity.fields?.["count()"] || 0;  // Get the count or default to 0
//                 appEntityCounts[app][entityName] = count;  // Assign the count to the app-entity pair
//             }
//         }
//     }

//     return appEntityCounts;  // Return the final map
// }






// console.log(JSON.stringify(await searchVespa("xyne", "saheb@xynehq.com", "google", "docs", 8, 0), null, 2))