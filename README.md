# vincen-react-template

The single structure for Vincen's website builder: **React SPA + Neon** (Postgres),
mirroring Lovable's component/route architecture but **static (no SSR server we run)**.
The backend is Neon's **Data API (PostgREST)** + **Neon Auth (better-auth)**, talked to
directly from the browser through tiny raw-`fetch` clients — **no SDK, no Supabase, no beta deps.**

## How it works (no server we run)
- **Frontend:** React 19 + Vite + TanStack Router (SPA) + TanStack Query + shadcn/ui + Tailwind.
  `vite build` → static `dist/` → GCS (preview) / R2 (`<slug>.vincen.space` publish).
- **Backend:** the site's own **Neon project** (auto-provisioned per site). The browser talks
  to it directly via two raw-fetch clients in `src/integrations/neon/`:
  - **db** (`client.ts`) → `db.from("table").select/insert/update/delete(...)` → Neon **Data API
    (PostgREST)**, **RLS-protected**. Every request carries a JWT: the user's when signed in,
    otherwise a short-lived **anonymous** token (public reads, login-free).
  - **auth** (`auth.ts`) → **Neon Auth (better-auth)**: `signUp` / `signIn` / `signOut`
    (email + password), session kept in a Secure **cookie**, `getAccessToken()` mints the
    Data-API JWT. Role-based admin (`user.role === "admin"`).
- **No server of ours runs.** Static SPA + Neon's managed Data API. Server-only rules live in
  **RLS policies** (`auth.user_id()`, `is_admin()`), not a Node server.

Difference from Lovable: Lovable boots via TanStack Start on a server; we mount in the browser
(`src/main.tsx`, `createRoot`). Routes + components are the same idea.

## Structure
```
src/
  main.tsx                     SPA entry (createRoot + RouterProvider)
  routes/                      file-based routes (TanStack Router) → routeTree.gen.ts (generated)
    __root.tsx · index.tsx · login.tsx
  integrations/neon/
    client.ts                  Data API (PostgREST) client — db.from(...), raw fetch + JWT
    auth.ts                    Neon Auth (better-auth) — sign in/up/out, session, JWT, role
  hooks/use-auth.ts            client-side auth state → { user, loading }
  components/ui/*              shadcn (add via `npx shadcn@latest add ...`)
  components/sections/*        page sections (fetch with useQuery + db.from)
  lib/utils.ts                 cn() helper
neon/
  migrations/0001_init.sql     DECLARATIVE schema + seed; platform re-applies on EVERY build (idempotent). BLUEPRINT.
vincen.manifest.json           capability declaration (auth/tables) → provisioning reads this
```

## Neon specifics (this is NOT Supabase — do not copy Supabase SQL)
- Roles are **`anonymous`** (logged-out) and **`authenticated`** (logged-in). There is NO `anon`, NO `service_role`.
- Current user id is **`auth.user_id()`** (returns TEXT) — NOT `auth.uid()`.
- There is **no `auth.users` table** — don't FK to it. Admin role lives in `neon_auth.users_sync.role`, enforced server-side by `is_admin()`.
- The migration is **declarative + idempotent**: it IS the desired schema + content, re-applied on every build — so "fill the table / add a column / update the copy" revisions take effect.

## Provisioning (done by Vincen backend, not in this template)
1. Create the site's Neon project + apply `neon/migrations/*.sql`
2. Enable Neon Auth (better-auth) + allow-list the site's domain
3. Inject **`VITE_NEON_DATA_API_URL`** + **`VITE_NEON_AUTH_URL`** at build

## Setup (template build / local)
```
bash scripts/setup.sh   # deps + all shadcn components + shadcn/ui skill
```
`components.json` + theme tokens already ship in the repo, so no `shadcn init` needed.
**No Supabase skill** — Neon's Data API patterns live in the website-builder prompt + skills.

## Agent skills
- **shadcn/ui** (`pnpm dlx skills add shadcn/ui`) — component discovery + add + theming (auto-activates from `components.json`).
- Vincen skills (in the agent repo): `react-best-practices`, `react-composition`, `web-quality-guidelines`, `website-design`, `stock-images`.

## Local dev
```
# .env.local:  VITE_NEON_DATA_API_URL=...  VITE_NEON_AUTH_URL=...
pnpm dev                       # http://localhost:5173
pnpm build                     # → dist/ (static)
```
Without the two env vars (e.g. the agent's preview before the backend is wired) the db client
**does not throw** — queries resolve to a clean error so the UI shows its loading/empty/error state.

## What the agent does per site
- Adapt `neon/migrations/0001_init.sql`: keep it idempotent; replace `posts`/`items` with the
  app's real tables. PUBLIC content → no owner, public-read, seeded; per-user data → RLS on `auth.user_id()`.
- Build pages from small section components in `src/components/sections/*` that fetch with
  `useQuery` + `db.from(...)` and handle loading / error / empty.
- Add real user accounts with `useAuth()` + `auth.ts` (sign-up/in) — **never** a fake/seeded login.
- Update `vincen.manifest.json` (auth providers + tables).
- Never hand-write a backend — use the Neon Data API (PostgREST + RLS).
