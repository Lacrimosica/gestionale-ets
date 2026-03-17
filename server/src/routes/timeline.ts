import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { assembly, memberPeriod, person, agendaItem, user } from '../db/schema';
import { asc, eq } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  jwtPayload: {
    sub: string;
    email: string;
    role: string;
    permissions?: string[];
    exp: number;
  };
};

const timelineRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const parsePermissions = (value?: string | null) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const requirePermission = async (c: any, permission: string) => {
  const payload = c.get('jwtPayload');
  const db = drizzle(c.env.DB);
  const currentUser = await db.select().from(user).where(eq(user.id, payload.sub)).get();

  if (!currentUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const permissions = parsePermissions(currentUser.permissions);
  if (!permissions.includes(permission)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return null;
};


function buildAssemblyLabel(v: typeof assembly.$inferSelect): string {
  const type = v.type;
  const nr = v.referenceNumber;
  const year = v.referenceYear;
  const tot = v.totalNumber;
  if (type === 'board_council') {
    return `Board Council n. ${nr}`;
  }
  if (type === 'ordinary') return `Ordinary Assembly n. ${nr}/${year ?? '—'}`;
  if (type === 'extraordinary') return `Extraordinary Assembly n. ${nr}/${year ?? '—'}`;
  if (type === 'constitution') return `Constitutional Assembly`;
  return `Assembly n. ${tot}`;
}

timelineRouter.get('/', async (c) => {
  const denied = await requirePermission(c, 'timeline.view');
  if (denied) return denied;

  const db = drizzle(c.env.DB);


  const [assemblies, membershipEvents, allAgendaItems] = await Promise.all([
    db.select().from(assembly).orderBy(asc(assembly.firstCallDate)).all(),
    db.select({
      id: memberPeriod.id,
      firstName: person.firstName,
      lastName: person.lastName,
      admission: memberPeriod.admissionDate,
      resignation: memberPeriod.resignationDate
    })
    .from(memberPeriod)
    .innerJoin(person, eq(memberPeriod.personId, person.id))
    .all(),
    db.select().from(agendaItem).all(),
  ]);

  const agendaByAssembly = new Map<string, { number: number; title: string; description?: string | null }[]>();
  for (const item of allAgendaItems) {
    const list = agendaByAssembly.get(item.assemblyId) ?? [];
    list.push({ number: item.number, title: item.title, description: item.description });
    agendaByAssembly.set(item.assemblyId, list);
  }
  for (const [, list] of agendaByAssembly) {
    list.sort((a, b) => a.number - b.number);
  }

  const events = [
    ...assemblies.map(v => ({
      id: v.id,
      type: 'assembly' as const,
      label: buildAssemblyLabel(v),
      start: v.firstCallDate ?? v.convocationDate ?? v.createdAt,
      end: v.firstCallDate ?? v.convocationDate ?? v.createdAt,
      subType: v.type,
      status: v.assemblyStatus,
      totalNumber: v.totalNumber,
      referenceNumber: v.referenceNumber,
      referenceYear: v.referenceYear,
      googleDocsLink: v.googleDocsLink ?? undefined,
      pdfLink: v.pdfLink ?? undefined,
      location: v.location,
      president: v.president,
      agendaItems: agendaByAssembly.get(v.id) ?? [],
    })),
    // Admissions
    ...membershipEvents.map(m => ({
      id: `${m.id}-admission`,
      type: 'member_admission',
      label: `Admission: ${m.firstName} ${m.lastName}`,
      start: m.admission,
      end: m.admission,
    })),
    // Resignations (only if exists)
    ...membershipEvents.filter(m => m.resignation).map(m => ({
      id: `${m.id}-resignation`,
      type: 'member_resignation',
      label: `Resignation: ${m.firstName} ${m.lastName}`,
      start: m.resignation!,
      end: m.resignation!,
    }))
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return c.json({
    events,
    membershipHistory: membershipEvents
  });
});

export default timelineRouter;
