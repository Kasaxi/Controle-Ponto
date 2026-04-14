import { Client, Account, Databases, Storage } from 'appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Client-side SDK
export const client = new Client();
client
    .setEndpoint(endpoint)
    .setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Server-side SDK (for API routes / Server Actions)
export const createAdminClient = async () => {
    const nodeAppwrite = await import('node-appwrite');
    const serverClient = new nodeAppwrite.Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    return {
        get account() { return new nodeAppwrite.Account(serverClient); },
        get databases() { return new nodeAppwrite.Databases(serverClient); },
        get storage() { return new nodeAppwrite.Storage(serverClient); }
    };
};
