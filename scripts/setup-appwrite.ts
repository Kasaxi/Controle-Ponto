import { Client, Databases, Permission, Role } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = 'ponto-eletronico';

async function setup() {
    try {
        console.log('🚀 Iniciando setup do Appwrite...');

        // 1. Criar Banco de Dados
        try {
            await databases.create(DATABASE_ID, 'Controle de Ponto');
            console.log('✅ Banco de dados criado.');
        } catch (e) {
            console.log('ℹ️ Banco de dados já existe.');
        }

        // 2. Criar Coleção Funcionários
        await createCollection('funcionarios', 'Funcionários', [
            { key: 'idRelogio', type: 'integer', required: true },
            { key: 'nome', type: 'string', size: 255, required: true },
            { key: 'cargo', type: 'string', size: 255, required: false },
            { key: 'departamento', type: 'string', size: 255, required: false },
            { key: 'jornadaEntrada1', type: 'string', size: 5, required: false, default: '08:00' },
            { key: 'jornadaSaida1', type: 'string', size: 5, required: false, default: '12:00' },
            { key: 'jornadaEntrada2', type: 'string', size: 5, required: false, default: '13:00' },
            { key: 'jornadaSaida2', type: 'string', size: 5, required: false, default: '18:00' },
            { key: 'jornadaSabEntrada1', type: 'string', size: 5, required: false, default: '08:00' },
            { key: 'jornadaSabSaida1', type: 'string', size: 5, required: false, default: '12:00' },
            { key: 'toleranciaMinutos', type: 'integer', required: false, default: 10 },
            { key: 'ativo', type: 'boolean', required: false, default: true }
        ]);

        // 3. Criar Coleção Feriados
        await createCollection('feriados', 'Feriados', [
            { key: 'data', type: 'datetime', required: true },
            { key: 'descricao', type: 'string', size: 255, required: true },
            { key: 'tipo', type: 'string', size: 50, required: true }
        ]);

        // 4. Criar Coleção Marcações
        await createCollection('marcacoes', 'Marcações', [
            { key: 'funcionarioId', type: 'integer', required: true },
            { key: 'dataHora', type: 'datetime', required: true },
            { key: 'nomeOriginal', type: 'string', size: 255, required: false },
            { key: 'departamentoOriginal', type: 'string', size: 255, required: false },
            { key: 'maquina', type: 'integer', required: false },
            { key: 'uploadId', type: 'string', size: 255, required: false }
        ]);

        // 5. Criar Coleção Ponto Dia
        await createCollection('ponto_dia', 'Ponto Dia', [
            { key: 'funcionarioId', type: 'integer', required: true },
            { key: 'data', type: 'datetime', required: true },
            { key: 'entrada1', type: 'string', size: 8, required: false },
            { key: 'saida1', type: 'string', size: 8, required: false },
            { key: 'entrada2', type: 'string', size: 8, required: false },
            { key: 'saida2', type: 'string', size: 8, required: false },
            { key: 'horasTrabalhadasMinutos', type: 'integer', required: false, default: 0 },
            { key: 'atrasoMinutos', type: 'integer', required: false, default: 0 },
            { key: 'intervaloMinutos', type: 'integer', required: false, default: 0 },
            { key: 'status', type: 'string', size: 50, required: false },
            { key: 'ajustadoManualmente', type: 'boolean', required: false, default: false }
        ]);

        console.log('✨ Setup finalizado com sucesso!');
    } catch (error) {
        console.error('❌ Erro no setup:', error);
    }
}

async function createCollection(id: string, name: string, attributes: any[]) {
    try {
        await databases.createCollection(DATABASE_ID, id, name, [
            Permission.read(Role.any()),
            Permission.write(Role.users()),
        ]);
        console.log(`📦 Coleção ${name} criada.`);

        for (const attr of attributes) {
            if (attr.type === 'string') {
                await databases.createStringAttribute(DATABASE_ID, id, attr.key, attr.size, attr.required, attr.default);
            } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(DATABASE_ID, id, attr.key, attr.required, 0, 1000000, attr.default);
            } else if (attr.type === 'boolean') {
                await databases.createBooleanAttribute(DATABASE_ID, id, attr.key, attr.required, attr.default);
            } else if (attr.type === 'datetime') {
                await databases.createDatetimeAttribute(DATABASE_ID, id, attr.key, attr.required);
            }
            console.log(`  🔹 Atributo ${attr.key} adicionado.`);
        }
    } catch (e) {
        console.log(`ℹ️ Coleção ${name} já existe ou erro na criação.`);
    }
}

setup();
