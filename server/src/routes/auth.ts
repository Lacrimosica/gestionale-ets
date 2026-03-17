import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { user as userSchema } from '../db/schema';
import { eq } from 'drizzle-orm';

const authRouter = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

const defaultPermissionsByRole: Record<string, string[]> = {
  core_admin: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.users.view',
    'settings.users.manage',
    'settings.password.manage',
    'settings.users.reset_password',
  ],
  admin: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.users.view',
    'settings.users.manage',
    'settings.password.manage',
    'settings.users.reset_password',
  ],
  manager: [
    'dashboard.view',
    'people.view',
    'people.edit',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'assemblies.edit',
    'convocations.view',
    'convocations.edit',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.password.manage',
  ],
  viewer: [
    'dashboard.view',
    'people.view',
    'volunteers.view',
    'members.view',
    'board.view',
    'assemblies.view',
    'convocations.view',
    'timeline.view',
    'resignations.view',
    'settings.view',
    'settings.password.manage',
  ],
};

const getPermissionsForRole = (role: string) => defaultPermissionsByRole[role] ?? defaultPermissionsByRole.viewer;

import { hashPassword, verifyPassword } from '../lib/auth';

authRouter.post('/register', async (c) => {
  const { email, password } = await c.req.json();
  const db = drizzle(c.env.DB);

  // Check if any user exists (first user is core_admin)
  const existingUsers = await db.select().from(userSchema).limit(1).all();
  const role = existingUsers.length === 0 ? 'core_admin' : 'viewer';
  const permissions = getPermissionsForRole(role);

  const hashedPassword = await hashPassword(password);

  const newUser = {
    id: crypto.randomUUID(),
    email,
    password: hashedPassword,
    role,
    permissions: JSON.stringify(permissions),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.insert(userSchema).values(newUser).run();

  return c.json({ message: 'User registered successfully', role, permissions });
});

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = drizzle(c.env.DB);
  const user = await db.select().from(userSchema).where(eq(userSchema.email, email)).get();

  if (!user || !(await verifyPassword(password, user.password))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions ? JSON.parse(user.permissions) : getPermissionsForRole(user.role),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  };

  if (!c.env.JWT_SECRET) {
    return c.json({ error: 'Server authentication misconfigured' }, 500);
  }

  const token = await sign(payload, c.env.JWT_SECRET);


  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions ? JSON.parse(user.permissions) : getPermissionsForRole(user.role),
    },
  });
});

export default authRouter;
