import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { insuranceTypes } from "@/content/site";

function makeRef(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

const field =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const label = "mb-1.5 block text-sm font-medium text-foreground";

export function LeadForm({
  source = "quote",
  heading,
  intro,
}: {
  source?: "quote" | "callback";
  heading?: string;
  intro?: string;
}) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    insurance_type: "רכב",
    message: "",
  });
  const [reference, setReference] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const ref = makeRef(source === "callback" ? "OPH-C" : "OPH-Q");
      const { error } = await db.from("leads").insert({
        reference: ref,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        insurance_type: form.insurance_type,
        message: form.message.trim() || null,
        source,
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
          הפנייה התקבלה
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">תודה, {form.full_name.split(" ")[0] || "שלום"}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          מספר האסמכתא שלכם הוא{" "}
          <span dir="ltr" className="inline-block font-semibold text-foreground">{reference}</span>. נציג מצוות אופיר
          ביטוח יחזור אליכם בתוך יום עסקים אחד. אנא שמרו את מספר האסמכתא.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => {
            setReference(null);
            setForm({ full_name: "", phone: "", email: "", insurance_type: "רכב", message: "" });
          }}
        >
          שליחת פנייה נוספת
        </Button>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-border bg-card p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="text-2xl font-semibold text-foreground">
        {heading ?? (source === "callback" ? "בקשת חזרה טלפונית" : "הצעת מחיר")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {intro ??
          "ספרו לנו בקצרה מה אתם צריכים והצוות יכין הצעת מחיר אישית. איננו משתפים את פרטיכם."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="lead-name">
            שם מלא
          </label>
          <input
            id="lead-name"
            required
            className={field}
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="השם המלא שלכם"
          />
        </div>
        <div>
          <label className={label} htmlFor="lead-phone">
            טלפון
          </label>
          <input
            id="lead-phone"
            required
            type="tel"
            className={field}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="המספר הנוח ביותר להשיגכם"
          />
        </div>
        <div>
          <label className={label} htmlFor="lead-email">
            דוא״ל
          </label>
          <input
            id="lead-email"
            required
            type="email"
            className={field}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="lead-type">
            סוג ביטוח
          </label>
          <select
            id="lead-type"
            className={field}
            value={form.insurance_type}
            onChange={(e) => setForm({ ...form, insurance_type: e.target.value })}
          >
            {insuranceTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="lead-message">
            הודעה או הערות
          </label>
          <textarea
            id="lead-message"
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="כל מה שכדאי שנדע — מה תרצו לבטח, זמן נוח לשיחה, או שאלה."
          />
        </div>
      </div>

      {mutation.isError ? (
        <p className="mt-4 text-sm text-destructive">
          לא הצלחנו לשלוח את הפנייה כעת. נסו שוב, או התקשרו אלינו בשעות הפעילות.
        </p>
      ) : null}

      <Button
        type="submit"
        className="mt-6 h-11 w-full rounded-full sm:w-auto sm:px-8"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "שולח…" : source === "callback" ? "בקשת חזרה טלפונית" : "בקשת הצעת מחיר"}
      </Button>
    </form>
  );
}
