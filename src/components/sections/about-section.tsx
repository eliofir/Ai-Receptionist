import { useSiteInfo } from "@/hooks/use-site-data";
import { mainPhone, officeAddress } from "@/content/site";

export function AboutSection() {
  const info = useSiteInfo();

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          אודות אופיר ביטוח
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
          {info.about_title ?? "ייעוץ ביטוח שאפשר ליישם"}
        </h1>
        <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {info.about_body ??
            "אופיר ביטוח היא סוכנות עצמאית שעוזרת ליחידים, למשפחות ולעסקים קטנים לבחור כיסוי שמתאים לחיים שלהם."}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">איך אנחנו עובדים</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {info.about_approach ??
            "ייעוץ ברור, בלי לחץ, ואדם אמיתי בצד השני של הטלפון בשעות הפעילות."}
        </p>
        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">שעות</dt>
            <dd className="mt-1 text-foreground">
              {info.hours ?? "שני עד שישי, 8:30–17:30"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">טלפון</dt>
            <dd className="mt-1 text-foreground"><span dir="ltr" className="inline-block">{info.phone ?? mainPhone}</span></dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">דוא״ל</dt>
            <dd className="mt-1 text-foreground"><span dir="ltr" className="inline-block">{info.email ?? "—"}</span></dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">כתובת</dt>
            <dd className="mt-1 text-foreground">{info.address ?? officeAddress}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
