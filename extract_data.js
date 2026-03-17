const fs = require('fs');
const crypto = require('crypto');

const verbaliFile = 'Registro Verbali - Verbali.tsv';
const sociFile = 'Registro Verbali - Generazioni Soci.tsv';
const direttiviFile = 'Registro Verbali - Generazioni Direttivi.tsv';

const readTsv = (path) => {
  if (!fs.existsSync(path)) return [];
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.replace(/\r/g, '').split('\n');
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i]?.trim() || '';
    });
    return obj;
  }).filter(o => Object.values(o).some(v => v !== ''));
};

const verbaliData = readTsv(verbaliFile);
const sociGenData = readTsv(sociFile);
const direttiviGenData = readTsv(direttiviFile);

const personas = new Set();
const personaMap = {};

// Helper to clean names
const cleanName = (name) => {
  if (!name || name === '-' || name === '/' || name.includes('N Membri') || name.includes('Membri')) return null;
  return name.split('(')[0].split('-')[0].split(' - ')[0].trim();
};

const formatDate = (date) => {
    if (!date || date === '-' || date === '??' || date === '?') return '2019-01-01'; // Fallback
    // Handle "2020-X-X" or "2020-03-20"
    let clean = date.split(' ')[0].replace(/X/g, '01');
    if (clean.split('-').length === 1) return `${clean}-01-01`;
    if (clean.split('-').length === 2) return `${clean}-01`;
    return clean;
};

// 1. Extract All People
direttiviGenData.forEach(row => {
    const name = cleanName(row['Nome Cognome']);
    if (name && name.split(' ').length >= 2) personas.add(name);
});
sociGenData.forEach(row => {
    const name = cleanName(row['Descrizione']);
    if (name && !name.includes('Generazione') && name.split(' ').length >= 2) personas.add(name);
});

personas.forEach(name => {
    const parts = name.split(' ');
    const nome = parts[0];
    const cognome = parts.slice(1).join(' ');
    personaMap[name] = { id: crypto.randomUUID(), nome, cognome };
});

let sql = '-- Migration Data\n';

// INSERT PERSONE
Object.keys(personaMap).forEach(key => {
    const p = personaMap[key];
    sql += `INSERT INTO persone (id, nome, cognome, created_at, updated_at) VALUES ('${p.id}', '${p.nome.replace(/'/g, "''")}', '${p.cognome.replace(/'/g, "''")}', datetime('now'), datetime('now'));\n`;
});

// BOARD GENERATIONS & MEMBERS
const boardGenMap = {};
direttiviGenData.forEach(row => {
    const genName = row['Generazione'];
    if (genName && !boardGenMap[genName]) {
        const id = crypto.randomUUID();
        boardGenMap[genName] = id;
        const [years] = genName.split(' ');
        const [startYear] = years.split('-');
        sql += `INSERT INTO generazioni_direttivo (id, nome, data_inizio, created_at) VALUES ('${id}', '${genName}', '${startYear}-07-01', datetime('now'));\n`;
    }
    const name = cleanName(row['Nome Cognome']);
    if (name && personaMap[name] && boardGenMap[genName]) {
        sql += `INSERT INTO direttivo_membri (id, generazione_id, persona_id, ruolo, created_at) VALUES ('${crypto.randomUUID()}', '${boardGenMap[genName]}', '${personaMap[name].id}', '${row['Ruolo'] || 'Consigliere'}', datetime('now'));\n`;
    }
});

// SOCI GENERATIONS
const sociGenIdMap = {};
sociGenData.forEach(row => {
    const name = row['Generazione'];
    if (name && name.toLowerCase().includes('generazione') && !sociGenIdMap[name]) {
        const id = crypto.randomUUID();
        sociGenIdMap[name] = id;
        let startYear = '2019';
        if (name.includes('2019')) startYear = '2019';
        else if (name.includes('2020')) startYear = '2020';
        else if (name.includes('4°')) startYear = '2023';
        else if (name.includes('5°')) startYear = '2024';
        else if (name.includes('6°')) startYear = '2025';
        
        sql += `INSERT INTO generazioni_soci (id, nome, data_inizio, created_at) VALUES ('${id}', '${name}', '${startYear}-01-01', datetime('now'));\n`;
    }
});

// ASSEMBLEE & ODG
verbaliData.forEach(row => {
    const id = crypto.randomUUID();
    const date = formatDate(row['Data']);
    const tipo = row['Tipo'].toLowerCase().includes('direttivo') ? 'consiglio_direttivo' : (row['Tipo'].toLowerCase().includes('straordinaria') ? 'straordinaria' : 'ordinaria');
    const numero = parseInt(row['Numero verbale']) || 0;
    const sede = row['Link Cartella'] ? row['Link Cartella'] : 'Sede Legale';
    const modalita = row['Modalità'].toLowerCase().includes('telematica') ? 'telematica' : 'presenza';
    
    sql += `INSERT INTO assemblee (id, tipo, numero, data_convocazione, data_prima_conv, ora_prima_conv, sede, modalita, presidente, segretario, note, created_at, updated_at) ` +
           `VALUES ('${id}', '${tipo}', ${numero}, '${date}', '${date}', '18:00', '${sede.replace(/'/g, "''")}', '${modalita}', 'Martino Fenoglio', 'Segretario', '${row['Appunti'].replace(/'/g, "''")}', datetime('now'), datetime('now'));\n`;
    
    // ODGs
    const odgText = row['Ordine del Giorno'];
    if (odgText && odgText !== '/') {
        const items = odgText.split(/[;\n]/).map(i => i.trim()).filter(i => i !== '');
        items.forEach((item, index) => {
            sql += `INSERT INTO ordini_del_giorno (id, assemblea_id, numero, titolo, created_at) VALUES ('${crypto.randomUUID()}', '${id}', ${index + 1}, '${item.substring(0, 200).replace(/'/g, "''")}', datetime('now'));\n`;
        });
    }
});

fs.writeFileSync('migration.sql', sql);
console.log(`Generated migration.sql with all entities.`);
