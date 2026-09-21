import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/integrations/neon/auth";

export function SiteHeader() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
        <Link to="/" className="font-display text-base font-semibold tracking-tight text-foreground">
          {site.name}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {site.nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              ניהול
            </Link>
          ) : null}
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              התנתקות
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              כניסת צוות
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
