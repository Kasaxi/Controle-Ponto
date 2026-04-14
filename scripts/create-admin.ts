import { Client, Users, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const users = new Users(client);

async function createAdmin() {
    try {
        console.log('👤 Criando usuário administrador...');
        // Tentando criar usuário
        await users.create(
            ID.unique(),
            'admin@pontopro.com', // email
            undefined,            // telefone
            'admin12345',         // senha
            'Administrador RH'    // nome
        );
        console.log('✅ Usuário admin@pontopro.com criado com sucesso!');
        console.log('Senha: admin12345');
    } catch (e: any) {
        if (e.message.includes('already exists')) {
             console.log('ℹ️ O usuário já existe! Pode usar admin@pontopro.com e admin12345.');
        } else {
             console.error('❌ Erro:', e.message);
        }
    }
}
createAdmin();
