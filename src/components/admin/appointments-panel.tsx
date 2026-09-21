import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";

export type Appointment = {
  id: string;
  reference: string;
  full_name: string;
  phone: string;
  email: string;
  service_type: string;
  appointment_date: string;
  time_slot: string;
  status: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["Pending", "Confirmed", "Cancelled", "Completed"];
const STATUS_LABELS: Record<string, string> = {
  Pending: "ממתין",
  Confirmed: "מאושר",
  Cancelled: "בוטל",
  Completed: "הושלם",
};
const cell = "px-3 py-3 align-top text-sm";

export function AppointmentsPanel() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ["admin_appointments"],
    queryFn: async () => {
      const { data, error } = await db
        .from<Appointment[]>("appointments")
        .select("*")
        .order("appointment_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("appointments").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_appointments"] }),
  });

  const filtered = useMemo(
    () => appointments.filter((a) => statusFilter === "All" || a.status === statusFilter),
    [appointments, statusFilter],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">טוען פגישות…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        לא הצלחנו לטעון את הפגישות. אנא רעננו את העמוד.
      </p>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All">כל הסטטוסים</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {filtered.length} מתוך {appointments.length} פגישות
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[860px] border-collapse text-start">
          <thead className="bg-secondary text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className={cell}>מועד</th>
              <th className={cell}>לקוח</th>
              <th className={cell}>שירות</th>
              <th className={cell}>הערות</th>
              <th className={cell}>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className={cell}>
                  <span className="block font-medium text-foreground">
                    {a.appointment_date} · {a.time_slot}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{a.reference}</span>
                </td>
                <td className={cell}>
                  <span className="block text-foreground">{a.full_name}</span>
                  <span className="block text-xs text-muted-foreground">{a.email}</span>
                  <span dir="ltr" className="block text-xs text-muted-foreground">{a.phone}</span>
                </td>
                <td className={cell}>{a.service_type}</td>
                <td className={`${cell} max-w-[240px] text-muted-foreground`}>{a.notes || "—"}</td>
                <td className={cell}>
                  <select
                    value={a.status}
                    onChange={(e) => update.mutate({ id: a.id, status: e.target.value })}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className={`${cell} text-muted-foreground`} colSpan={5}>
                  אין פגישות שמתאימות לסינון.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
