import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { zipSync, strToU8 } from 'fflate';
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

const exportRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const ALLOWED_TABLES = [
  'people',
  'volunteer_periods',
  'member_periods',
  'board_generations',
  'board_members',
  'assemblies',
  'convocations',
  'organization_settings',
  'compliance_documents',
  'compliance_roles',
] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('\t') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return '"' + str.replaceAll('"', '""') + '"';
  }
  return str;
}

function toTsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join('\t')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeField(row[h])).join('\t'));
  }
  return lines.join('\r\n') + '\r\n';
}

exportRouter.post('/', async (c) => {
  const payload = c.get('jwtPayload');

  // Role guard: admin and core_admin only
  if (payload.role !== 'admin' && payload.role !== 'core_admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json<{ tables?: string[] }>();
  const requestedTables = (body.tables ?? []).filter(
    (t): t is AllowedTable => ALLOWED_TABLES.includes(t as AllowedTable)
  );

  if (requestedTables.length === 0) {
    return c.json({ error: 'No valid tables selected' }, 400);
  }

  const { orgId } = payload;
  const db = drizzle(c.env.DB);
  const files: Record<string, Uint8Array> = {};
  const manifest: {
    exportedAt: string;
    tables: string[];
    rowCounts: Record<string, number>;
  } = {
    exportedAt: new Date().toISOString(),
    tables: requestedTables,
    rowCounts: {},
  };

  // Fetch and convert each requested table
  if (requestedTables.includes('people')) {
    const rows = await db.select().from(person).where(eq(person.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['people.tsv'] = strToU8(tsv);
    manifest.rowCounts['people'] = rows.length;
  }

  if (requestedTables.includes('volunteer_periods')) {
    const rows = await db.select().from(volunteerPeriod).where(eq(volunteerPeriod.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['volunteer_periods.tsv'] = strToU8(tsv);
    manifest.rowCounts['volunteer_periods'] = rows.length;
  }

  if (requestedTables.includes('member_periods')) {
    const rows = await db.select().from(memberPeriod).where(eq(memberPeriod.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['member_periods.tsv'] = strToU8(tsv);
    manifest.rowCounts['member_periods'] = rows.length;
  }

  if (requestedTables.includes('board_generations')) {
    const rows = await db.select().from(boardGeneration).where(eq(boardGeneration.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['board_generations.tsv'] = strToU8(tsv);
    manifest.rowCounts['board_generations'] = rows.length;
  }

  if (requestedTables.includes('board_members')) {
    const rows = await db.select().from(boardMember).where(eq(boardMember.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['board_members.tsv'] = strToU8(tsv);
    manifest.rowCounts['board_members'] = rows.length;
  }

  if (requestedTables.includes('assemblies')) {
    const rows = await db.select().from(assembly).where(eq(assembly.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['assemblies.tsv'] = strToU8(tsv);
    manifest.rowCounts['assemblies'] = rows.length;
  }

  if (requestedTables.includes('convocations')) {
    const rows = await db.select().from(convocation).where(eq(convocation.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['convocations.tsv'] = strToU8(tsv);
    manifest.rowCounts['convocations'] = rows.length;
  }

  if (requestedTables.includes('organization_settings')) {
    const rows = await db.select().from(organizationSetting).where(eq(organizationSetting.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['organization_settings.tsv'] = strToU8(tsv);
    manifest.rowCounts['organization_settings'] = rows.length;
  }

  if (requestedTables.includes('compliance_documents')) {
    const rows = await db.select().from(complianceDocument).where(eq(complianceDocument.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['compliance_documents.tsv'] = strToU8(tsv);
    manifest.rowCounts['compliance_documents'] = rows.length;
  }

  if (requestedTables.includes('compliance_roles')) {
    const rows = await db.select().from(complianceRole).where(eq(complianceRole.orgId, orgId)).all();
    const tsv = toTsv(rows as Record<string, unknown>[]);
    files['compliance_roles.tsv'] = strToU8(tsv);
    manifest.rowCounts['compliance_roles'] = rows.length;
  }

  files['MANIFEST.json'] = strToU8(JSON.stringify(manifest, null, 2));

  const zipBuffer = zipSync(files, { level: 6 });
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+Z$/, 'Z');
  const filename = `backup-${ts}.zip`;

  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(zipBuffer.byteLength),
    },
  });
});

export default exportRouter;
