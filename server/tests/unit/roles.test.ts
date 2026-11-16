import { describe, it, expect } from 'vitest';
import { rejectGrant, canActOn, isOrgRole } from '../../src/lib/roles';

describe('role grants', () => {
  const admin = { role: 'admin', permissions: ['people.view', 'settings.users.manage'] };

  it('allows granting a role at or below the caller’s own', () => {
    expect(rejectGrant(admin, 'admin')).toBeNull();
    expect(rejectGrant(admin, 'viewer')).toBeNull();
  });

  it('rejects a role above the caller’s own and unknown roles', () => {
    expect(rejectGrant(admin, 'core_admin')).not.toBeNull();
    expect(rejectGrant(admin, 'superuser')).not.toBeNull();
    expect(rejectGrant({ role: 'mystery' }, 'viewer')).not.toBeNull();
  });

  it('only allows explicit permissions the caller holds', () => {
    expect(rejectGrant(admin, 'manager', ['people.view'])).toBeNull();
    expect(rejectGrant(admin, 'manager', ['settings.users.reset_password'])).not.toBeNull();
    expect(rejectGrant(admin, 'manager', 'people.view')).not.toBeNull();
  });

  it('treats a missing permission list as role defaults', () => {
    expect(rejectGrant(admin, 'manager', undefined)).toBeNull();
    expect(rejectGrant(admin, 'manager', null)).toBeNull();
  });

  it('limits acting on accounts to the same rank or below', () => {
    expect(canActOn(admin, 'admin')).toBe(true);
    expect(canActOn(admin, 'manager')).toBe(true);
    expect(canActOn(admin, 'core_admin')).toBe(false);
  });

  it('recognises only known roles', () => {
    expect(isOrgRole('viewer')).toBe(true);
    expect(isOrgRole('toString')).toBe(false);
  });
});
