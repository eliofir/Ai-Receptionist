import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";
import { todayIso } from "@/lib/business-hours";
import { useAdminAppointments } from "@/hooks/use-admin-appointments";

type Lead = { id: string; status: string; created_at: string };

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminDashboard() {
  const leads = useQuery({
    queryKey: ["admin_leads_summary"],
    queryFn: async () => {
      const { data, error } = await db.from<Lead[]>("leads").select("id,status,created_at");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const appointments = useAdminAppointments();

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const leadsThisWeek = (leads.data ?? []).filter(
    (l) => l.created_at && new Date(l.created_at).getTime() >= weekAgo,
  ).length;
  const newLeads = (leads.data ?? []).filter((l) => l.status === "New").length;
  const today = todayIso();
  const upcoming = (appointments.data ?? []).filter(
    (a) => a.appointment_date >= today && a.status !== "Cancelled",
  ).length;
  const pending = (appointments.data ?? []).filter((a) => a.status === "Pending").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="פניות השבוע" value={leadsThisWeek} hint="בקשות הצעת מחיר וחזרה טלפונית" />
      <Stat label="פניות חדשות" value={newLeads} hint="טרם נוצר קשר" />
      <Stat label="פגישות קרובות" value={upcoming} hint="היום והלאה" />
      <Stat label="ממתינות לאישור" value={pending} hint="הזמנות ממתינות" />
    </div>
  );
}
