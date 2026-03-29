import * as fs from 'fs';
import * as path from 'path';

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  const tsvPath = path.resolve(__dirname, '../../PDF - Registry - PDF Registry.tsv');
  const sqlPath = path.resolve(__dirname, '../drizzle/migrations/0001_seed_person.sql');
  const outPath = path.resolve(__dirname, '../drizzle/migrations/0002_seed_compliance.sql');

  const tsvContent = fs.readFileSync(tsvPath, 'utf8');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Parse SQL to get person.id mapped to name
  const personList: { id: string; firstName: string; lastName: string; normName: string }[] = [];

  const insertRegex = /INSERT INTO "person" \([^)]+\) VALUES\('([^']+)',\s*'([^']+)',\s*'([^']+)'/g;
  let match;
  while ((match = insertRegex.exec(sqlContent)) !== null) {
    const [_, id, firstName, lastName] = match;
    personList.push({
      id,
      firstName,
      lastName,
      normName: normalizeName(`${firstName}${lastName}`)
    });
  }

  // Parse TSV
  const lines = tsvContent.split('\n').map(l => l.trim()).filter(l => l);
  lines.shift(); // remove header

  const insertStatements: string[] = [];

  for (const line of lines) {
    const [fileName, type, link] = line.split('\t');
    if (!fileName || !type || !link) continue;

    // The name is usually before the first hyphen
    const namePartRaw = fileName.split('-')[0].trim();
    const namePart = normalizeName(namePartRaw);

    // Find the closest person map
    let foundPerson = personList.find(p => p.normName === namePart);

    // Fuzzy search if exact not found
    if (!foundPerson) {
      // Trying to find if one contains another
      foundPerson = personList.find(p => p.normName.includes(namePart) || namePart.includes(p.normName));
    }

    if (foundPerson) {
      const docId = require('crypto').randomUUID();
      const now = new Date().toISOString();
      const documentTypeStr = type.trim();

      const sql = `INSERT INTO "compliance_document" ("id","person_id","document_type","drive_url","is_current","is_signed","is_dated","is_complete","created_at","updated_at") VALUES('${docId}','${foundPerson.id}','${documentTypeStr.replace(/'/g, "''")}','${link}','1','0','0','1','${now}','${now}');`;
      insertStatements.push(sql);
    } else {
      console.warn(`Could not map name: ${namePartRaw} (from ${fileName})`);
    }
  }

  if (insertStatements.length > 0) {
    fs.writeFileSync(outPath, insertStatements.join('\n') + '\n', 'utf8');
    console.log(`Generated migration script at ${outPath} with ${insertStatements.length} insertions.`);
  } else {
    console.log('No mappings generated.');
  }

}

main().catch(console.error);
