import { officeAddress, secretariat, staff, mainPhone, type StaffMember } from "@/content/site";

function telHref(value: string): string {
  return `tel:${value.replace(/[^+\d]/g, "")}`;
}

function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      {href ? (
        <a dir="ltr" className="inline-block text-foreground underline-offset-4 hover:underline" href={href}>
          {value}
        </a>
      ) : (
        <span className="text-foreground">{value}</span>
      )}
    </div>
  );
}

function StaffCard({ member }: { member: StaffMember }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-base font-semibold text-foreground">{member.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
      <div className="mt-4 space-y-2">
        <ContactRow label="דוא״ל" value={member.email} href={`mailto:${member.email}`} />
        {member.direct ? (
          <ContactRow label="ישיר" value={member.direct} href={telHref(member.direct)} />
        ) : null}
        {member.mobile ? (
          <ContactRow label="נייד" value={member.mobile} href={telHref(member.mobile)} />
        ) : null}
        {member.fax ? <ContactRow label="פקס" value={member.fax} href={telHref(member.fax)} /> : null}
      </div>
    </div>
  );
}

export function StaffDirectory() {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        אנשי המשרד
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">הצוות שלנו</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        אפשר לפנות ישירות לאיש הצוות המתאים, או להתקשר למשרד בטלפון{" "}
        <a dir="ltr" className="inline-block text-foreground underline-offset-4 hover:underline" href={telHref(mainPhone)}>
          {mainPhone}
        </a>
        .
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">כתובת המשרד</p>
        <p className="mt-2 text-sm text-foreground">{officeAddress}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-base font-semibold text-foreground">{secretariat.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{secretariat.role}</p>
          <div className="mt-4 space-y-2">
            <ContactRow label="דוא״ל" value={secretariat.email} href={`mailto:${secretariat.email}`} />
          </div>
        </div>
        {staff.map((member) => (
          <StaffCard key={member.name} member={member} />
        ))}
      </div>
    </section>
  );
}
