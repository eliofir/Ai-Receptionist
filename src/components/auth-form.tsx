import { useState } from "react";
import { signIn, signUp } from "@/integrations/neon/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Email + password auth — Neon Auth (better-auth), enabled by Vincen provisioning
// with NO email-verification step (sign-up signs you straight in). Reusable: drop
// <AuthForm /> on any page (see routes/login.tsx) to gate content. (Social sign-in
// is NOT enabled by default — it needs per-project OAuth credentials; add it only if
// a site requires it.)
export function AuthForm({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password);
      onDone?.();
    } catch (err: any) {
      setError(err?.message ?? "ההתחברות נכשלה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        required
        placeholder="סיסמה"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "…" : mode === "signin" ? "התחברות" : "יצירת חשבון"}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "signin" ? "אין לכם חשבון? הירשמו" : "יש לכם חשבון? התחברו"}
      </button>
    </form>
  );
}
