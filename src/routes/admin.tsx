import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboard } from "@/components/admin/dashboard";
import { LeadsPanel } from "@/components/admin/leads-panel";
import { AppointmentsPanel } from "@/components/admin/appointments-panel";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">בודק את ההרשאה שלך…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">התחברות צוות</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          אזור הניהול מיועד לצוות אופיר ביטוח. אנא התחברו כדי להמשיך.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          התחברות
        </Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">אזור הצוות</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          לחשבונך אין הרשאת ניהול. אם אתה חבר בצוות אופיר ביטוח, בקש להעניק לחשבונך הרשאת
          ניהול.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-medium text-foreground"
        >
          חזרה לנציגה
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        אופיר ביטוח
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground">לוח ניהול</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        מחובר בתור {user.email}
      </p>

      <Tabs defaultValue="dashboard" className="mt-8">
        <TabsList>
          <TabsTrigger value="dashboard">סקירה</TabsTrigger>
          <TabsTrigger value="leads">פניות</TabsTrigger>
          <TabsTrigger value="appointments">פגישות</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-6">
          <AdminDashboard />
        </TabsContent>
        <TabsContent value="leads" className="mt-6">
          <LeadsPanel />
        </TabsContent>
        <TabsContent value="appointments" className="mt-6">
          <AppointmentsPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}
