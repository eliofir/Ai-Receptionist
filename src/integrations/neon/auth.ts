// Neon Auth (better-auth) — raw-`fetch` client. NO SDK, NO Supabase, NO beta deps.
// Only needed by sites that have user accounts; purely-public sites never call this
// (the db client falls back to an anonymous token on its own).
//
// Cross-origin model (validated against a live Neon project):
//   • POST /sign-up/email, /sign-in/email      → sets a Secure session COOKIE
//   • GET  /token   (with the session cookie)  → { token: <short-lived Data-API JWT> }
//   • GET  /get-session                        → { user, session }
//   • POST /sign-out
// Every call uses `credentials: "include"` so the browser carries the session cookie.
// The db client (client.ts) calls getAccessToken() to attach the user's JWT to Data
// API requests, so RLS sees auth.user_id(); when signed out it returns null → anon.
//
// NOTE: better-auth requires an `Origin` header (browsers send it automatically) and
// the site's domain to be allow-listed by Vincen provisioning.

const AUTH_URL: string = import.meta.env.VITE_NEON_AUTH_URL;

// `role` comes from the Neon Auth (Better Auth) admin plugin — "admin" | "user".
// Gate admin UI on it: `const { user } = useAuth(); const isAdmin = user?.role === "admin"`.
// The platform sets a user's role; the site only reads it. RLS enforces admin writes
// server-side via is_admin() (reads neon_auth.users_sync.role), so this is UI-only.
export type NeonUser = { id: string; email: string; name?: string | null; image?: string | null; role?: string | null };

function req(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${AUTH_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json", ...(init.headers || {}) },
  });
}
function jwtExpMs(token: string): number {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return typeof exp === "number" ? exp * 1000 : Date.now() + 10 * 60_000;
  } catch {
    return Date.now() + 10 * 60_000;
  }
}

// ── in-memory session state (single source of truth, React subscribes) ──
let user: NeonUser | null = null;
let signedIn = false;
let jwt: { token: string; expMs: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function currentUser(): NeonUser | null {
  return user;
}

/** Read the current session from the cookie. Call on app start + after auth changes. */
export async function refreshSession(): Promise<NeonUser | null> {
  try {
    const r = await req("/get-session");
    const j = r.ok ? await r.json() : null;
    user = (j?.user as NeonUser) ?? null;
  } catch {
    user = null;
  }
  signedIn = !!user;
  if (!signedIn) jwt = null;
  emit();
  return user;
}

/** Data-API JWT for the signed-in user, or null when signed out (→ client uses anon). */
export async function getAccessToken(): Promise<string | null> {
  if (!signedIn) return null;
  if (jwt && jwt.expMs - 30_000 > Date.now()) return jwt.token;
  try {
    const r = await req("/token");
    if (!r.ok) {
      jwt = null;
      return null;
    }
    const { token } = (await r.json()) as { token: string };
    jwt = { token, expMs: jwtExpMs(token) };
    return token;
  } catch {
    return null;
  }
}

async function errMessage(r: Response): Promise<string> {
  try {
    return (await r.json())?.message || `Request failed (${r.status})`;
  } catch {
    return `Request failed (${r.status})`;
  }
}

export async function signUp(email: string, password: string, name?: string): Promise<void> {
  const r = await req("/sign-up/email", { method: "POST", body: JSON.stringify({ email, password, name: name || email.split("@")[0] }) });
  if (!r.ok) throw new Error(await errMessage(r));
  jwt = null;
  await refreshSession();
}
export async function signIn(email: string, password: string): Promise<void> {
  const r = await req("/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(await errMessage(r));
  jwt = null;
  await refreshSession();
}
export async function signOut(): Promise<void> {
  try {
    // MUST send a body: req() sets `Content-Type: application/json`, and
    // better-auth rejects an empty body as malformed JSON → 400, so the
    // server session is never invalidated and the user stays logged in
    // after refresh. `{}` is valid empty JSON and clears the session.
    await req("/sign-out", { method: "POST", body: "{}" });
  } finally {
    user = null;
    signedIn = false;
    jwt = null;
    emit();
  }
}
