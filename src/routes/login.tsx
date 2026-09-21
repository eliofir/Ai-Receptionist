import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  return (
    <main className="mx-auto max-w-sm px-5 py-20 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">התחברות</h1>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-muted-foreground">
        התחברו לחשבון אופיר ביטוח שלכם. נציגי הסוכנות עם הרשאת ניהול יראו את לוח הניהול
        לאחר ההתחברות.
      </p>
      <AuthForm onDone={() => navigate({ to: "/" })} />
    </main>
  );
}
