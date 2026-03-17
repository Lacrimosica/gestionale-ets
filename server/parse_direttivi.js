const fs = require('fs');
const crypto = require('crypto');

const tsv = fs.readFileSync('../Registro Verbali - Generazioni Direttivi.tsv', 'utf-8');
const lines = tsv.split('\n').filter(line => line.trim() !== '');

const generazioni = [];
const membri = [];

let currentGenerazione = null;
let currentGenDate = null;
let currentGenId = null;

// Skip header (2 lines)
for (let i = 2; i < lines.length; i++) {
  const line = lines[i];
  const cols = line.split('\t');
  
  if (cols.length < 4) continue;
  
  const genCell = cols[0].trim();
  const ruoloCell = cols[2].trim();
  const nomeCognome = cols[3].trim();
  const notesCell = cols.length > 4 ? cols[4].trim() : '';
  
  if (!nomeCognome) continue; // Skip empty rows (for future years)

  if (genCell) {
    currentGenerazione = genCell;
    currentGenId = crypto.randomUUID();
    
    // Attempt to extract date from notes
    // Example notes: "12/07/2019 ...", "06/06/2020", "2021-07-11"
    let dateStr = '2000-01-01'; // Fallback
    const dateMatch = notesCell.match(/(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      if (dateMatch[1]) {
        // DD/MM/YYYY
        const parts = dateMatch[1].split('/');
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (dateMatch[2]) {
        dateStr = dateMatch[2];
      }
    } else {
        // Try parsing "YYYY-MM-DD" from notes if it starts with it
        if(notesCell && notesCell.length >= 10) {
            const firstWord = notesCell.substring(0, 10);
            if(firstWord.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dateStr = firstWord;
            }
        }
    }
    currentGenDate = dateStr;
    
    generazioni.push({
      id: currentGenId,
      nome: currentGenerazione,
      dataInizio: currentGenDate,
      createdAt: new Date().toISOString()
    });
  }
  
  membri.push({
    id: crypto.randomUUID(),
    generazioneId: currentGenId,
    nomeCognome: nomeCognome,
    ruolo: ruoloCell,
    note: notesCell && !genCell ? notesCell.replace(/'/g, "''") : null, // keep notes only for role lines, escape single quotes
    createdAt: new Date().toISOString()
  });
}

// Ensure end dates for generations
for (let i = 0; i < generazioni.length - 1; i++) {
  generazioni[i].dataFine = generazioni[i+1].dataInizio;
}

let sql = 'DELETE FROM direttivo_membri;\nDELETE FROM generazioni_direttivo;\n\n';

// Generate Generazioni SQL
for (const gen of generazioni) {
  const end = gen.dataFine ? `'${gen.dataFine}'` : 'NULL';
  sql += `INSERT INTO generazioni_direttivo (id, nome, data_inizio, data_fine, created_at) VALUES ('${gen.id}', '${gen.nome.replace(/'/g, "''")}', '${gen.dataInizio}', ${end}, '${gen.createdAt}');\n`;
}

sql += '\n';

// Generate Membri SQL using subqueries for Persona ID
for (const mem of membri) {
  const note = mem.note ? `'${mem.note}'` : 'NULL';
  sql += `INSERT INTO direttivo_membri (id, generazione_id, persona_id, ruolo, note, created_at)
  SELECT '${mem.id}', '${mem.generazioneId}', p.id, '${mem.ruolo}', ${note}, '${mem.createdAt}'
  FROM persone p
  WHERE (p.nome || ' ' || p.cognome) = '${mem.nomeCognome.replace(/'/g, "''")}'
  OR TRIM(p.nome || ' ' || p.cognome) = '${mem.nomeCognome.replace(/'/g, "''")}'
  LIMIT 1;\n`;
}

fs.writeFileSync('import_direttivi.sql', sql);
console.log('SQL file generated: import_direttivi.sql');
