import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { unzipSync, strFromU8 } from 'fflate';
import {
  person,
  volunteerPeriod,
  memberPeriod,
  boardGeneration,
  boardMember,
  assembly,
  convocation,
  organizationSetting,
  complianceDocument,
  complianceRole,
} from '../db/schema';

type Bindings = { DB: D1Database };
type Variables = { jwtPayload: { orgId: string; role: string } };

const importRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const IMPORTABLE_TABLES = ['people', 'volunteer_periods', 'member_periods', 'board_generations', 'board_members', 'assemblies', 'convocations', 'organization_settings', 'compliance_documents', 'compliance_roles'] as const;
const MAX_ZIP_SIZE = 10 * 1024 * 1024; // 10MB

const TABLE_SCHEMA: Record<
  typeof IMPORTABLE_TABLES[number],
  {
    drizzleTable: any;
    sqlTableName: string;
    tsvFileName: string;
    expectedColumns: string[];
  }
> = {
  people: {
    drizzleTable: person,
    sqlTableName: 'person',
    tsvFileName: 'people.tsv',
    expectedColumns: [
      'id',
      'firstName',
      'lastName',
      'taxId',
      'email',
      'phone',
      'birthDate',
      'birthPlace',
      'birthCountry',
      'gender',
      'profession',
      'isStudent',
      'isEmployee',
      'memberNumber',
      'notes',
      'cfValidation',
      'userId',
      'inLibroVolontariCartaceo',
      'libroVolontariStartDate',
      'libroVolontariEndDate',
      'appearsInRuntsVerbale',
      'isInVolunteerRegistryPhysical',
      'volunteerRegistryStartDate',
      'volunteerRegistryEndDate',
      'appearsInRuntsProceedings',
      'canBeRemoved',
      'needsRegularization',
      'isPresumedNonExistent',
      'createdAt',
      'updatedAt',
    ],
  },
  volunteer_periods: {
    drizzleTable: volunteerPeriod,
    sqlTableName: 'volunteer_period',
    tsvFileName: 'volunteer_periods.tsv',
    expectedColumns: ['id', 'personId', 'status', 'statusId', 'enrollmentDate', 'exitDate', 'exitReason', 'notes', 'createdAt'],
  },
  member_periods: {
    drizzleTable: memberPeriod,
    sqlTableName: 'member_period',
    tsvFileName: 'member_periods.tsv',
    expectedColumns: [
      'id',
      'personId',
      'volunteerPeriodId',
      'admissionDate',
      'resignationDate',
      'exitReason',
      'articleReference',
      'admissionAssemblyId',
      'exitAssemblyId',
      'notes',
      'createdAt',
    ],
  },
  board_generations: {
    drizzleTable: boardGeneration,
    sqlTableName: 'board_generation',
    tsvFileName: 'board_generations.tsv',
    expectedColumns: ['id', 'name', 'startDate', 'endDate', 'createdAt'],
  },
  board_members: {
    drizzleTable: boardMember,
    sqlTableName: 'board_member',
    tsvFileName: 'board_members.tsv',
    expectedColumns: ['id', 'generationId', 'personId', 'role', 'notes', 'createdAt'],
  },
  assemblies: {
    drizzleTable: assembly,
    sqlTableName: 'assembly',
    tsvFileName: 'assemblies.tsv',
    expectedColumns: [
      'id',
      'type',
      'typeId',
      'subtype',
      'subtypeId',
      'depositedOnRunts',
      'runtsDepositDate',
      'totalNumber',
      'referenceNumber',
      'referenceYear',
      'firstCallDate',
      'firstCallTime',
      'secondCallDate',
      'secondCallTime',
      'location',
      'locationId',
      'mode',
      'modeId',
      'boardGenerationId',
      'assemblyStatus',
      'statusId',
      'presidentId',
      'secretaryId',
      'notes',
      'meetLink',
      'googleDocsLink',
      'pdfLink',
      'modalityFormulaPrima',
      'firstCallModalityId',
      'modalityFormulaApertura',
      'openingModalityId',
      'endTime',
      'createdAt',
      'updatedAt',
    ],
  },
  convocations: {
    drizzleTable: convocation,
    sqlTableName: 'convocation',
    tsvFileName: 'convocations.tsv',
    expectedColumns: ['id', 'assemblyId', 'secondAssemblyId', 'date', 'sendDeadline', 'content', 'documentLink', 'proxyFormLink', 'notes', 'createdAt', 'updatedAt'],
  },
  organization_settings: {
    drizzleTable: organizationSetting,
    sqlTableName: 'organization_setting',
    tsvFileName: 'organization_settings.tsv',
    expectedColumns: [
      'id',
      'complianceRules',
      'city',
      'statuteArticleConvocation',
      'statuteArticleProxies',
      'statuteArticleMembers',
      'statuteArticleBoardVote',
      'statuteArticleBoardElection',
      'maxProxies',
      'outputFolderId',
      'templateConvocationId',
      'templateMinutes1aId',
      'templateMinutes2aId',
      'templateConvocationExtraordinaryStatuteId',
      'templateConvocationExtraordinaryDissolutionId',
      'templateConvocationBoardId',
      'templateMinutesBoardId',
      'varieDefaultText',
      'miscellaneousDefaultText',
      'orgId',
      'createdAt',
      'updatedAt',
    ],
  },
  compliance_documents: {
    drizzleTable: complianceDocument,
    sqlTableName: 'compliance_document',
    tsvFileName: 'compliance_documents.tsv',
    expectedColumns: [
      'id',
      'personId',
      'documentType',
      'documentTypeId',
      'version',
      'driveUrl',
      'signedAt',
      'effectiveFrom',
      'effectiveTo',
      'isCurrent',
      'isSigned',
      'isDated',
      'isComplete',
      'isDigital',
      'notes',
      'createdAt',
      'updatedAt',
    ],
  },
  compliance_roles: {
    drizzleTable: complianceRole,
    sqlTableName: 'compliance_role',
    tsvFileName: 'compliance_roles.tsv',
    expectedColumns: ['id', 'personId', 'roleType', 'roleTypeId', 'startDate', 'endDate', 'notes', 'createdAt', 'updatedAt'],
  },
};

function parseTsv(tsv: string): Record<string, unknown>[] {
  const lines = tsv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = parseTsvLine(lines[0]);
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseTsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

function parseTsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\t' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

importRouter.post('/', async (c) => {
  const payload = c.get('jwtPayload');

  if (payload.role !== 'admin' && payload.role !== 'core_admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    if (file.size > MAX_ZIP_SIZE) {
      return c.json({ error: `File too large (max ${MAX_ZIP_SIZE / 1024 / 1024}MB)` }, 400);
    }

    const buffer = await file.arrayBuffer();
    let zipFiles: Record<string, Uint8Array>;

    try {
      zipFiles = unzipSync(new Uint8Array(buffer));
    } catch {
      return c.json({ error: 'Invalid ZIP file' }, 400);
    }

    if (!zipFiles['MANIFEST.json']) {
      return c.json({ error: 'Missing MANIFEST.json in ZIP' }, 400);
    }

    let manifest: any;
    try {
      manifest = JSON.parse(strFromU8(zipFiles['MANIFEST.json']));
    } catch {
      return c.json({ error: 'Invalid MANIFEST.json' }, 400);
    }

    if (!manifest.tables || !Array.isArray(manifest.tables)) {
      return c.json({ error: 'Invalid MANIFEST.json structure' }, 400);
    }

    const { orgId } = payload;
    const db = drizzle(c.env.DB);
    const rowCounts: Record<string, number> = {};

    // Disable foreign keys during import to allow out-of-order inserts
    await c.env.DB.prepare('PRAGMA foreign_keys = OFF').run();

    try {
      // Process each table
      for (const tableKey of manifest.tables) {
      if (!IMPORTABLE_TABLES.includes(tableKey)) {
        return c.json({ error: `Table "${tableKey}" is not importable` }, 400);
      }

      const schema = TABLE_SCHEMA[tableKey as typeof IMPORTABLE_TABLES[number]];
      const tsvFile = zipFiles[schema.tsvFileName];

      if (!tsvFile) {
        continue; // Skip if not present
      }

      const tsvContent = strFromU8(tsvFile);
      const rows = parseTsv(tsvContent);

      if (rows.length === 0) {
        rowCounts[tableKey] = 0;
        continue;
      }

      // Validate schema: check that no columns are unknown
      const firstRow = rows[0];
      const incomingColumns = Object.keys(firstRow);
      const allowedSet = new Set(schema.expectedColumns);

      for (const col of incomingColumns) {
        if (!allowedSet.has(col)) {
          return c.json({ error: `Unknown column "${col}" in table "${tableKey}"` }, 400);
        }
      }

      // Insert rows using Drizzle (parameterized, upsert via INSERT OR REPLACE)
      // Map incoming columns back to SQL columns for Drizzle
      const now = new Date().toISOString();
      const sqlRows: Record<string, any>[] = rows.map((row) => {
        const sqlRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          sqlRow[key] = value === '' ? null : value;
        }
        // Inject orgId for all tables
        sqlRow['orgId'] = orgId;
        // Provide defaults for required columns if missing
        if (!sqlRow['createdAt'] && schema.expectedColumns.includes('createdAt')) {
          sqlRow['createdAt'] = now;
        }
        if (!sqlRow['updatedAt'] && schema.expectedColumns.includes('updatedAt')) {
          sqlRow['updatedAt'] = now;
        }
        // Provide placeholders for missing required fields
        if (tableKey === 'people') {
          if (!sqlRow['firstName']) {
            sqlRow['firstName'] = '[Unknown]';
          }
          if (!sqlRow['lastName']) {
            sqlRow['lastName'] = '[Unknown]';
          }
        }
        if (tableKey === 'assemblies') {
          if (!sqlRow['location']) {
            sqlRow['location'] = '[Unknown]';
          }
        }
        if (tableKey === 'convocations') {
          if (!sqlRow['date']) {
            sqlRow['date'] = now;
          }
        }
        return sqlRow;
      });

      // Use raw INSERT OR REPLACE for upsert behavior
      const columns = Object.keys(sqlRows[0]).join(', ');
      const placeholders = Object.keys(sqlRows[0]).map(() => '?').join(', ');
      const sqlColumns = Object.keys(sqlRows[0])
        .map((col) => {
          // Convert camelCase to snake_case: handle uppercase letters and transitions to numbers
          return col
            .replace(/([a-z])([A-Z])/g, '$1_$2')  // camelCase transitions
            .replace(/([a-zA-Z])(\d)/g, '$1_$2')  // letter to number transitions
            .toLowerCase();
        })
        .join(', ');

      let importedCount = 0;
      let skippedCount = 0;
      const skippedReasons: string[] = [];

      for (let i = 0; i < sqlRows.length; i++) {
        const row = sqlRows[i];
        const values = Object.values(row);
        const query = `INSERT OR REPLACE INTO ${schema.sqlTableName} (${sqlColumns}) VALUES (${Object.keys(row)
          .map(() => '?')
          .join(', ')})`;

        try {
          await c.env.DB.prepare(query).bind(...values).run();
          importedCount++;
        } catch (err) {
          const errStr = String(err);
          // Skip rows with foreign key constraint failures
          if (errStr.includes('FOREIGN KEY constraint failed')) {
            skippedCount++;
            skippedReasons.push(`Row ${i + 1}: FK reference not found`);
          } else {
            return c.json({ error: `Failed to import row in table "${tableKey}": ${errStr}` }, 400);
          }
        }
      }

      rowCounts[tableKey] = importedCount;
      if (skippedCount > 0) {
        if (!rowCounts['_skipped']) rowCounts['_skipped'] = 0;
        (rowCounts['_skipped'] as number) += skippedCount;
      }
      }

      // Re-enable foreign keys after import
      await c.env.DB.prepare('PRAGMA foreign_keys = ON').run();

      return c.json(
        {
          success: true,
          importedAt: new Date().toISOString(),
          rowCounts,
        },
        200
      );
    } catch (err) {
      // Re-enable foreign keys even on error
      await c.env.DB.prepare('PRAGMA foreign_keys = ON').run();
      throw err;
    }
  } catch (err) {
    // Ensure foreign keys are re-enabled on any error
    try {
      await c.env.DB.prepare('PRAGMA foreign_keys = ON').run();
    } catch {}
    return c.json({ error: `Import failed: ${String(err)}` }, 500);
  }
});

export default importRouter;
