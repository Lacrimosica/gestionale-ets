# Known Issues

A record of bugs, workarounds, and resolved problems encountered during development. Each entry documents the symptom, root cause, affected environments, and the fix — so future developers (or agents) can resolve the same issue in minutes rather than hours.

---

## Table of Contents

- [BUG-001 — Vite dev server fails to start: missing rolldown native binding](#bug-001--vite-dev-server-fails-to-start-missing-rolldown-native-binding)
- [BUG-002 — Vite dev server fails to start: missing lightningcss / @tailwindcss/oxide native bindings](#bug-002--vite-dev-server-fails-to-start-missing-lightningcss--tailwindcssoxide-native-bindings)

---

## BUG-001 — Vite dev server fails to start: missing rolldown native binding

| Field | Value |
|---|---|
| **Status** | Resolved |
| **Severity** | High — blocks local development entirely |
| **Affected component** | `client/` (Vite dev server) |
| **Affected environments** | Local development (Linux x64) |
| **First seen** | 2026-06-28 |
| **Introduced by** | npm optional dependency resolution bug |
| **Versions** | Vite 8.0.0, rolldown 1.0.0-rc.9, npm 11.16.0, Node.js 26.3.0 |

### Symptom

Running `npm run dev` from the `client/` directory (or the workspace root) crashes immediately with:

```
Error: Cannot find native binding. npm has a bug related to optional dependencies
(https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing
both package-lock.json and node_modules directory.
  [cause]: Error: Cannot find module '@rolldown/binding-linux-x64-gnu'
```

### Root Cause

Vite 8+ uses [rolldown](https://rolldown.rs/) as its bundler. rolldown ships its native Node.js binding as a set of platform-specific **optional dependencies** (e.g. `@rolldown/binding-linux-x64-gnu`). npm has a [known bug](https://github.com/npm/cli/issues/4828) where, under certain conditions (corrupted `node_modules`, workspace hoisting edge cases, stale `package-lock.json`), it skips installing optional packages that contain native `.node` binaries.

The result is that `rolldown` is installed but its native binding is absent, so the first `require()` call throws `MODULE_NOT_FOUND`.

### Trigger Conditions

This typically occurs after any of:

- Deleting `client/node_modules` manually without deleting `client/package-lock.json` first (or vice versa)
- Upgrading Vite or rolldown without a clean reinstall
- Cloning the repo fresh when `package-lock.json` records an incomplete optional dependency tree
- Running `npm install` from the workspace root when the client workspace has a stale lock file

### Fix

Run the following from the **`client/` directory**:

```bash
# Step 1: Remove stale artifacts
rm -rf node_modules package-lock.json

# Step 2: Fresh install (npm will correctly resolve optional deps)
npm install

# Step 3: If npm still skips the binding, install it explicitly
npm install @rolldown/binding-linux-x64-gnu@1.0.0-rc.9

# Step 4: Verify the dev server starts
npm run dev
```

Expected output after a successful fix:

```
  VITE v8.0.0  ready in ~230 ms
  ➜  Local:   http://localhost:5173/
```

### Why Step 3 May Be Needed

Even after a clean install, npm may still omit the optional binding if the workspace root's `package-lock.json` has a cached resolution that marks the optional package as skipped. Installing it explicitly bypasses npm's resolution logic and places the binary directly in `client/node_modules/@rolldown/`.

### Prevention

- Always delete **both** `node_modules` and `package-lock.json` together when doing a clean reinstall — never one without the other.
- After resolving, commit the regenerated `client/package-lock.json` so the correct optional dependency tree is recorded for all contributors.
- If CI fails with the same error, add an explicit install step for the platform-appropriate binding (e.g. `@rolldown/binding-linux-x64-gnu` for Linux runners, `@rolldown/binding-darwin-arm64` for macOS ARM).

### Related

- npm issue tracker: https://github.com/npm/cli/issues/4828
- rolldown optional bindings: https://rolldown.rs/

---

## BUG-002 — Vite dev server fails to start: missing lightningcss / @tailwindcss/oxide native bindings

| Field | Value |
|---|---|
| **Status** | Resolved |
| **Severity** | High — blocks local development entirely |
| **Affected component** | `client/` (Vite dev server / PostCSS) |
| **Affected environments** | Local development (Linux x64) |
| **First seen** | 2026-06-28 |
| **Introduced by** | `node_modules` originally installed on Windows; same npm optional dependency resolution bug as BUG-001 |
| **Versions** | lightningcss 1.31.1, @tailwindcss/oxide 4.2.1, npm 11.16.0, Node.js 26.3.0 |

### Symptom

Running `npm run dev` crashes immediately with a PostCSS config error:

```
Error: Loading PostCSS Plugin failed: Cannot find native binding.
npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).
  [cause]: Cannot find module '@tailwindcss/oxide-linux-x64-gnu'
```

or earlier:

```
Error: Loading PostCSS Plugin failed: Cannot find module '../lightningcss.linux-x64-gnu.node'
```

### Root Cause

Tailwind CSS v4 and lightningcss both ship their Rust/native processing engines as platform-specific **optional dependencies** (e.g. `lightningcss-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`). When `package-lock.json` is generated on Windows, only the Windows bindings (`*-win32-x64-msvc`) are recorded in the lock file. On Linux, npm restores exactly what the lock file says and skips the Linux bindings entirely.

### Trigger Conditions

- Cloning the repo on Linux when `package-lock.json` was originally generated on Windows (or macOS)
- Running `npm install` from the workspace root or `client/` — the lock file wins and Linux binaries are never fetched
- Even after deleting `node_modules` and the lock file, npm 11 has a bug where it may still omit optional platform packages during workspace installs

### Fix

Run the following from the **`client/` directory**:

```bash
# Step 1: Remove stale artifacts
rm -rf node_modules package-lock.json

# Step 2: Fresh install
npm install

# Step 3: Explicitly install the two missing Linux binaries
npm install --include=optional lightningcss-linux-x64-gnu@1.31.1 @tailwindcss/oxide-linux-x64-gnu@4.2.1

# Step 4: Verify both load cleanly
node -e "require('./node_modules/@tailwindcss/postcss/dist/index.js'); require('./node_modules/lightningcss/node/index.js'); console.log('OK')"

# Step 5: Start the dev server
npm run dev
```

### Prevention

- Regenerate the root `package-lock.json` from Linux after the fix so the Linux binaries are locked in for future installs.
- If Step 3 ever needs to be repeated after a clean install, check the versions against what `lightningcss` and `@tailwindcss/oxide` declare in their own `package.json` → `optionalDependencies`.

### Related

- npm issue tracker: https://github.com/npm/cli/issues/4828
- See also: [BUG-001](#bug-001--vite-dev-server-fails-to-start-missing-rolldown-native-binding) — same root cause, different package

---

## Adding a New Entry

When you encounter and resolve a new bug, add an entry following this template:

```markdown
## BUG-NNN — Short title

| Field | Value |
|---|---|
| **Status** | Resolved / Open / In Progress |
| **Severity** | Critical / High / Medium / Low |
| **Affected component** | e.g. `server/`, `client/`, `db migrations` |
| **Affected environments** | e.g. Local, Staging, Production |
| **First seen** | YYYY-MM-DD |
| **Introduced by** | commit hash, dependency upgrade, etc. |
| **Versions** | relevant package versions |

### Symptom
What the developer sees — paste the error message or describe the broken behavior.

### Root Cause
Why it happens.

### Trigger Conditions
What specific action or state causes it to appear.

### Fix
Step-by-step commands to resolve it.

### Prevention
How to avoid it in the future.

### Related
Links to upstream issues, PRs, or related entries in this file.
```

**Severity guide:**
- **Critical** — data loss, security vulnerability, production outage
- **High** — blocks development or a core feature entirely
- **Medium** — degrades functionality; a workaround exists
- **Low** — cosmetic or minor inconvenience
