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

