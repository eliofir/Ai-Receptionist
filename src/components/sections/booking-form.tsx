import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { serviceTypes } from "@/content/site";
import { isWeekday, timeSlots, todayIso } from "@/lib/business-hours";

function makeRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `OPH-B-${s}`;
}

const field =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const label = "mb-1.5 block text-sm font-medium text-foreground";

export function BookingForm() {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    service_type: serviceTypes[0] as string,
    appointment_date: "",
    time_slot: "",
    notes: "",
  });
  const [reference, setReference] = useState<string | null>(null);

  const dateValid = form.appointment_date !== "" && isWeekday(form.appointment_date);

  const { data: booked = [] } = useQuery({
    queryKey: ["booked_slots", form.appointment_date],
    enabled: dateValid,
    queryFn: async () => {
      const { data, error } = await db
        .from<{ time_slot: string }[]>("booked_slots")
        .select("time_slot")
        .eq("appointment_date", form.appointment_date);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.time_slot);
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const ref = makeRef();
      const { error } = await db.from("appointments").insert({
        reference: ref,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        service_type: form.service_type,
        appointment_date: form.appointment_date,
        time_slot: form.time_slot,
        notes: form.notes.trim() || null,
      });
      if (error) throw new Error(error.message);
      return ref;
    },
    onSuccess: (ref) => setReference(ref),
  });

  if (reference) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          הפגישה נקבעה
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">הכול מוכן</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          מספר האסמכתא שלכם הוא{" "}
          <span dir="ltr" className="inline-block font-semibold text-foreground">{reference}</span>. קבענו לכם{" "}
          <span className="text-foreground">{form.service_type}</span> בתאריך{" "}
          <span className="text-foreground">{form.appointment_date}</span> בשעה{" "}
          <span className="text-foreground">{form.time_slot}</span>. אישור יישלח בדוא״ל.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => {
            setReference(null);
            setForm({
              full_name: "",
              phone: "",
              email: "",
              service_type: serviceTypes[0] as string,
              appointment_date: "",
              time_slot: "",
              notes: "",
            });
          }}
        >
          קביעת פגישה נוספת
        </Button>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-border bg-card p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!dateValid || !form.time_slot) return;
        mutation.mutate();
      }}
    >
      <h2 className="text-2xl font-semibold text-foreground">קביעת פגישה</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        בחרו שירות, בחרו יום חול ומשבצת של 30 דקות בין 8:30 ל-17:30. משבצות תפוסות מוצגות
        כלא זמינות.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="bk-name">
            שם מלא
          </label>
          <input
            id="bk-name"
            required
            className={field}
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="השם המלא שלכם"
          />
        </div>
        <div>
          <label className={label} htmlFor="bk-phone">
            טלפון
          </label>
          <input
            id="bk-phone"
            required
            type="tel"
            className={field}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="המספר הנוח ביותר להשיגכם"
          />
        </div>
        <div>
          <label className={label} htmlFor="bk-email">
            דוא״ל
          </label>
          <input
            id="bk-email"
            required
            type="email"
            className={field}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="bk-service">
            סוג שירות
          </label>
          <select
            id="bk-service"
            className={field}
            value={form.service_type}
            onChange={(e) => setForm({ ...form, service_type: e.target.value })}
          >
            {serviceTypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="bk-date">
            תאריך
          </label>
          <input
            id="bk-date"
            required
            type="date"
            min={todayIso()}
            className={field}
            value={form.appointment_date}
            onChange={(e) => setForm({ ...form, appointment_date: e.target.value, time_slot: "" })}
          />
          {form.appointment_date && !dateValid ? (
            <p className="mt-2 text-sm text-destructive">
              אנחנו פתוחים בימים שני עד שישי. אנא בחרו יום חול.
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <span className={label}>משבצת זמן</span>
          {dateValid ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {timeSlots().map((slot) => {
                const taken = booked.includes(slot);
                const selected = form.time_slot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={taken}
                    onClick={() => setForm({ ...form, time_slot: slot })}
                    className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                      taken
                        ? "cursor-not-allowed border-border text-muted-foreground/50 line-through"
                        : selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              בחרו יום חול כדי לראות זמנים פנויים.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="bk-notes">
            הערות (אופציונלי)
          </label>
          <textarea
            id="bk-notes"
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="משהו שתרצו שנכין לפני הפגישה."
          />
        </div>
      </div>

      {mutation.isError ? (
        <p className="mt-4 text-sm text-destructive">
          לא הצלחנו להשלים את קביעת הפגישה כעת. נסו שוב, או התקשרו אלינו בשעות הפעילות.
        </p>
      ) : null}

      <Button
        type="submit"
        className="mt-6 h-11 w-full rounded-full sm:w-auto sm:px-8"
        disabled={mutation.isPending || !dateValid || !form.time_slot}
      >
        {mutation.isPending ? "קובע…" : "אישור קביעת הפגישה"}
      </Button>
    </form>
  );
}
