import { Client, Databases, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = 'ponto-eletronico';
const EMPLOYEES_COLLECTION = 'funcionarios';
const HOLIDAYS_COLLECTION = 'feriados';

const employees = [
    { idRelogio: 1, nome: "Beatriz" },
    { idRelogio: 3, nome: "Wesley" },
    { idRelogio: 5, nome: "Nilson" },
    { idRelogio: 6, nome: "Ludmyla" },
    { idRelogio: 7, nome: "Alice" },
    { idRelogio: 9, nome: "Felipe" },
    { idRelogio: 11, nome: "Helloysa" },
    { idRelogio: 12, nome: "Elizabeth" }
];

const holidays2026 = [
    { data: "2026-01-01T00:00:00.000Z", descricao: "Confraternização Universal", tipo: "nacional" },
    { data: "2026-02-17T00:00:00.000Z", descricao: "Carnaval", tipo: "nacional" },
    { data: "2026-04-03T00:00:00.000Z", descricao: "Sexta-feira Santa", tipo: "nacional" },
    { data: "2026-04-21T00:00:00.000Z", descricao: "Tiradentes", tipo: "nacional" },
    { data: "2026-05-01T00:00:00.000Z", descricao: "Dia do Trabalho", tipo: "nacional" },
    { data: "2026-06-04T00:00:00.000Z", descricao: "Corpus Christi", tipo: "nacional" },
    { data: "2026-09-07T00:00:00.000Z", descricao: "Independência do Brasil", tipo: "nacional" },
    { data: "2026-10-12T00:00:00.000Z", descricao: "Nossa Senhora Aparecida", tipo: "nacional" },
    { data: "2026-11-02T00:00:00.000Z", descricao: "Finados", tipo: "nacional" },
    { data: "2026-11-15T00:00:00.000Z", descricao: "Proclamação da República", tipo: "nacional" },
    { data: "2026-11-20T00:00:00.000Z", descricao: "Dia da Consciência Negra", tipo: "nacional" },
    { data: "2026-12-25T00:00:00.000Z", descricao: "Natal", tipo: "nacional" }
];

async function seed() {
    try {
        console.log('🌱 Iniciando seed de dados...');

        // Seed Funcionários
        for (const emp of employees) {
            await databases.createDocument(DATABASE_ID, EMPLOYEES_COLLECTION, ID.unique(), {
                ...emp,
                jornadaEntrada1: "08:00",
                jornadaSaida1: "12:00",
                jornadaEntrada2: "13:00",
                jornadaSaida2: "18:00",
                jornadaSabEntrada1: "08:00",
                jornadaSabSaida1: "12:00",
                ativo: true
            });
            console.log(`✅ Funcionário ${emp.nome} cadastrado.`);
        }

        // Seed Feriados
        for (const holiday of holidays2026) {
            await databases.createDocument(DATABASE_ID, HOLIDAYS_COLLECTION, ID.unique(), holiday);
            console.log(`✅ Feriado ${holiday.descricao} cadastrado.`);
        }

        console.log('✨ Seed finalizado!');
    } catch (error) {
        console.error('❌ Erro no seed:', error);
    }
}

seed();
