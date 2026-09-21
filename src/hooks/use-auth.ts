import { useEffect, useState } from "react";
import { currentUser, refreshSession, subscribe, type NeonUser } from "@/integrations/neon/auth";

// Client-side auth state backed by Neon Auth (better-auth). The session lives in a
// Secure cookie on the auth server; this hook reads it on mount and re-renders on any
// sign-in/sign-out. Every db call carries the user's JWT → RLS knows auth.user_id().
export function useAuth() {
  const [user, setUser] = useState<NeonUser | null>(currentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribe(() => setUser(currentUser()));
    refreshSession().finally(() => setLoading(false));
    return unsub;
  }, []);

  return { user, loading };
}
