import { useEffect, useState } from "react";
import { getOfficeStatus } from "@/lib/business-hours";
import { site, mainPhone } from "@/content/site";

export type SiteInfo = Record<string, string>;

/** Persistent office panel: live OPEN/CLOSED status, hours, phone and email. */
export function OfficeStatusPanel({ info }: { info: SiteInfo }) {
  const [status, setStatus] = useState(() => getOfficeStatus());

  useEffect(() => {
    const id = window.setInterval(() => setStatus(getOfficeStatus()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const phone = info.phone ?? mainPhone;
  const email = info.email ?? "";

  return (
    <aside className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            status.open ? "bg-emerald-400" : "bg-muted-foreground"
          }`}
          aria-hidden="true"
        />
        <span
          className={`text-xs font-semibold tracking-[0.14em] ${
            status.open ? "text-emerald-300" : "text-muted-foreground"
          }`}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{status.detail}</p>

      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">שעות</dt>
          <dd className="mt-1 text-foreground">{info.hours ?? "שני עד שישי, 8:30–17:30"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">טלפון</dt>
          <dd className="mt-1">
            {phone ? (
              <a dir="ltr" className="inline-block text-foreground underline-offset-4 hover:underline" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
                {phone}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">דוא״ל</dt>
          <dd className="mt-1">
            {email ? (
              <a dir="ltr" className="inline-block text-foreground underline-offset-4 hover:underline" href={`mailto:${email}`}>
                {email}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        {info.address ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">משרד</dt>
            <dd className="mt-1 text-foreground">{info.address}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        {info.response_time ?? "אנו משיבים להודעות בתוך יום עסקים אחד."}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">{site.name}</p>
    </aside>
  );
}
