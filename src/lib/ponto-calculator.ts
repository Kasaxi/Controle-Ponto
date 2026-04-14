export interface Funcionario {
    $id: string;
    idRelogio: number;
    nome: string;
    jornadaEntrada1: string;
    jornadaSaida1: string;
    jornadaEntrada2: string;
    jornadaSaida2: string;
    jornadaSabEntrada1?: string;
    jornadaSabSaida1?: string;
    toleranciaMinutos: number;
}

export interface MarcacaoRaw {
    data: string; // YYYY-MM-DD
    hora: string; // HH:mm:ss
    idRelogio: number;
    nomeOriginal: string;
    departamentoOriginal: string;
    maquina: number;
}

export function parseFileContent(text: string): MarcacaoRaw[] {
    const lines = text.split('\n');
    const records: MarcacaoRaw[] = [];

    // Ignora a primeira linha (cabeçalho)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // O arquivo é separado por TABS, então dividimos pelo caractere de Tabela (\t)
        // Opcionalmente dividimos pelo regex que encontra 2 ou mais espaços se o tab falhar
        const cols = line.split(/\t/);
        
        if (cols.length >= 4) {
             const idRelogio = parseInt(cols[0].trim(), 10);
             const nome = cols[1].trim();
             const departamento = cols[2].trim();
             const tempoStr = cols[3].trim().replace(/\s{2,}/g, ' '); // Substitui múltiplos espaços por 1 só
             const maquina = cols.length >= 5 ? parseInt(cols[4].trim(), 10) : 1;
             
             // tempoStr deve ficar "30/03/2026 07:47:24"
             const [dataStr, horaStr] = tempoStr.split(' ');
             
             if (dataStr && horaStr) {
                 // Converte DD/MM/YYYY para YYYY-MM-DD
                 const [day, month, year] = dataStr.split('/');
                 const dateIso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                 
                 records.push({
                     data: dateIso,
                     hora: horaStr,
                     idRelogio,
                     nomeOriginal: nome,
                     departamentoOriginal: departamento,
                     maquina: isNaN(maquina) ? 1 : maquina
                 });
             }
        }
    }
    return records;
}

export function calculatePonto(records: MarcacaoRaw[], funcionarios: Funcionario[]) {
    // 1. Agrupar por FuncionarioID -> Data
    // Ex: grouped[funcId][date] = ['08:00:00', '12:00:00', '13:00:00']
    const grouped: Record<string, Record<string, string[]>> = {};

    records.forEach(rec => {
        const func = funcionarios.find(f => f.idRelogio === rec.idRelogio);
        if (!func) return; // Se o funcionário não está cadastrado, ignoramos o cálculo principal

        if (!grouped[func.$id]) grouped[func.$id] = {};
        if (!grouped[func.$id][rec.data]) grouped[func.$id][rec.data] = [];
        
        grouped[func.$id][rec.data].push(rec.hora);
    });

    // 2. Montar objeto final de dias trabalhados
    const pontoFinal = [];

    for (const [funcId, divDias] of Object.entries(grouped)) {
        const func = funcionarios.find(f => f.$id === funcId)!;

        for (const [data, batidas] of Object.entries(divDias)) {
            // Ordena horários (cedo -> tarde)
            batidas.sort();

            const e1 = batidas[0] ? batidas[0].substring(0, 5) : null;
            const s1 = batidas[1] ? batidas[1].substring(0, 5) : null;
            const e2 = batidas[2] ? batidas[2].substring(0, 5) : null;
            const s2 = batidas[3] ? batidas[3].substring(0, 5) : null;

            // Calculo Básico de Horas (Minutos)
            let minsTrab = 0;
            if (e1 && s1) minsTrab += timeToMins(s1) - timeToMins(e1);
            if (e2 && s2) minsTrab += timeToMins(s2) - timeToMins(e2);

            // Dia da semana
            const dtObj = new Date(`${data}T12:00:00Z`)
            const diaSemana = dtObj.getUTCDay() // 0 = Dom, 6 = Sab

            let expectedMins = 0
            if (diaSemana === 0) {
                // Domingo - zero horas esperadas
                expectedMins = 0
            } else if (diaSemana === 6) {
                // Sábado
                const sSabEnt = timeToMins(func.jornadaSabEntrada1 || "")
                const sSabSai = timeToMins(func.jornadaSabSaida1 || "")
                expectedMins = sSabSai > sSabEnt ? sSabSai - sSabEnt : 0
            } else {
                // Dia de Semana (Seg-Sex)
                expectedMins = (timeToMins(func.jornadaSaida1) - timeToMins(func.jornadaEntrada1)) +
                               (timeToMins(func.jornadaSaida2) - timeToMins(func.jornadaEntrada2));
            }
            
            let extra = 0;
            let atraso = 0;
            const dif = minsTrab - expectedMins;

            if (dif > func.toleranciaMinutos) {
                extra = dif;
            } else if (dif < -func.toleranciaMinutos && expectedMins > 0) {
                // Atraso só faz sentido se tinha expediente
                atraso = Math.abs(dif);
            }

            let status = expectedMins > 0 ? 'completo' : 'descanso';
            
            if (expectedMins > 0) {
                if (batidas.length > 0 && batidas.length < 4 && diaSemana !== 6) status = 'incompleto';
                if (batidas.length > 0 && batidas.length < 2 && diaSemana === 6) status = 'incompleto';
                if (atraso > 0 && status === 'completo') status = 'atraso';
            } else {
                if (minsTrab > 0) {
                    status = 'extra'; // Trabalhou no dia de descanso
                    extra = minsTrab;
                }
            }

            pontoFinal.push({
                funcionarioId: funcId,
                data: `${data}T00:00:00.000Z`, 
                entrada1: e1,
                saida1: s1,
                entrada2: e2,
                saida2: s2,
                horasTrabalhadasMinutos: minsTrab,
                horasExtrasMinutos: extra,
                atrasoMinutos: atraso,
                status,
                ajustadoManualmente: false
            });
        }
    }

    return pontoFinal;
}

function timeToMins(time: string) {
    if(!time) return 0;
    const [h, m] = time.split(':');
    return parseInt(h) * 60 + parseInt(m);
}
