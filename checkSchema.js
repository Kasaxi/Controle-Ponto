const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function check() {
    try {
        const attrs = await databases.listAttributes('ponto-eletronico', 'ponto_dia');
        console.log("Attributes:");
        attrs.attributes.forEach(a => console.log(`- ${a.key} (${a.type})`));
    } catch (e) {
        console.error(e);
    }
}
check();
