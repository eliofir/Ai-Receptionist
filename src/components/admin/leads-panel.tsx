import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { insuranceTypes } from "@/content/site";

export type Lead = {
  id: string;
  reference: string;
  full_name: string;
  phone: string;
  email: string;
  insurance_type: string;
  message: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["New", "Contacted", "Closed"];
const STATUS_LABELS: Record<string, string> = {
  New: "חדש",
  Contacted: "נוצר קשר",
  Closed: "סגור",
};
const cell = "px-3 py-3 align-top text-sm";

export function LeadsPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["admin_leads"],
    queryFn: async () => {
      const { data, error } = await db
        .from<Lead[]>("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Lead> }) => {
      const { error } = await db.from("leads").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_leads"] }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (typeFilter !== "All" && l.insurance_type !== typeFilter) return false;
      if (statusFilter !== "All" && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.full_name, l.email, l.phone, l.reference]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [leads, search, typeFilter, statusFilter]);

  if (isLoading) return <p className="text-sm text-muted-foreground">טוען פניות…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        לא הצלחנו לטעון את הפניות. אנא רעננו את העמוד.
      </p>
    );

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, דוא״ל, טלפון או אסמכתא"
          className="h-10 min-w-[240px] flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All">כל הסוגים</option>
          {insuranceTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {filtered.length} מתוך {leads.length} פניות
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] border-collapse text-start">
          <thead className="bg-secondary text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className={cell}>אסמכתא</th>
              <th className={cell}>פרטי קשר</th>
              <th className={cell}>סוג</th>
              <th className={cell}>הודעה</th>
              <th className={cell}>סטטוס</th>
              <th className={cell}>הערות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className={cell}>
                  <span className="font-medium text-foreground">{l.reference}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {l.source === "callback" ? "חזרה טלפונית" : "הצעת מחיר"} ·{" "}
                    {l.created_at ? new Date(l.created_at).toLocaleDateString() : ""}
                  </span>
                </td>
                <td className={cell}>
                  <span className="block text-foreground">{l.full_name}</span>
                  <span className="block text-xs text-muted-foreground">{l.email}</span>
                  <span dir="ltr" className="block text-xs text-muted-foreground">{l.phone}</span>
                </td>
                <td className={cell}>{l.insurance_type}</td>
                <td className={`${cell} max-w-[260px] text-muted-foreground`}>
                  {l.message || "—"}
                </td>
                <td className={cell}>
                  <select
                    value={l.status}
                    onChange={(e) => update.mutate({ id: l.id, patch: { status: e.target.value } })}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cell}>
                  <div className="flex items-start gap-2">
                    <input
                      value={draftNotes[l.id] ?? l.notes ?? ""}
                      onChange={(e) => setDraftNotes({ ...draftNotes, [l.id]: e.target.value })}
                      placeholder="הוספת הערה"
                      className="h-9 w-40 rounded-lg border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg"
                      onClick={() =>
                        update.mutate({
                          id: l.id,
                          patch: { notes: (draftNotes[l.id] ?? l.notes ?? "").trim() || null },
                        })
                      }
                    >
                      שמירה
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className={`${cell} text-muted-foreground`} colSpan={6}>
                  אין פניות שמתאימות לסינון.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
