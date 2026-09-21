import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, PhoneCall } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { Receptionist } from "@/components/sections/receptionist";
import { VoiceDemo } from "@/components/sections/voice-demo";
import { LeadForm } from "@/components/sections/lead-form";
import { useSiteInfo } from "@/hooks/use-site-data";
import { mainPhone, voiceCta } from "@/content/site";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const info = useSiteInfo();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const voicePanelRef = useRef<HTMLDivElement>(null);

  function openVoice() {
    setVoiceOpen(true);
    window.setTimeout(() => {
      voicePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
      <FadeIn>
        <section className="gradient-mesh rounded-2xl border border-border px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            אופיר ביטוח
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
            הקבלה שלכם, תמיד זמינה
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            שאלו את דלית על הכיסוי שלכם, קבלו הצעת מחיר או קבעו פגישה. בשעות הפעילות
            נציג מהצוות במרחק שיחה.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openVoice}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <PhoneCall className="h-4 w-4" />
              {voiceCta.button}
            </button>
            <Link
              to="/quote"
              className="inline-flex h-12 items-center rounded-full border border-border px-6 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              הצעת מחיר
            </Link>
            <Link
              to="/book"
              className="inline-flex h-12 items-center rounded-full border border-border px-6 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              קביעת פגישה
            </Link>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {voiceCta.subtitle}
          </p>
          <Link
            to="/test"
            className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            {voiceCta.fullPage}
          </Link>
        </section>
      </FadeIn>

      {voiceOpen ? (
        <div ref={voicePanelRef} className="mt-8 scroll-mt-24">
          <FadeIn>
            <VoiceDemo autoStart onClose={() => setVoiceOpen(false)} />
          </FadeIn>
        </div>
      ) : null}

      <FadeIn delay={0.1} className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{voiceCta.bannerTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {voiceCta.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={openVoice}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Mic className="h-4 w-4" />
            {voiceCta.button}
          </button>
        </div>
        <Receptionist />
        <p className="mt-3 text-xs text-muted-foreground">{voiceCta.typingNote}</p>
      </FadeIn>

      <FadeIn delay={0.1} className="mt-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              מעדיפים שנחזור אליכם?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              השאירו פרטים והצוות יחזור אליכם. מחוץ לשעות הפעילות נחזור אליכם בתחילת יום
              העסקים הבא.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              אפשר גם להשיג אותנו בטלפון{" "}
              <span dir="ltr" className="inline-block text-foreground">{info.phone ?? mainPhone}</span>{" "}
              או במייל{" "}
              {info.email ? (
                <span dir="ltr" className="inline-block text-foreground">{info.email}</span>
              ) : (
                <span className="text-foreground">שלנו</span>
              )}.
            </p>
          </div>
          <LeadForm
            source="callback"
            heading="בקשת חזרה טלפונית"
            intro="ספרו לנו איך להשיג אתכם וזמן נוח לשיחה."
          />
        </div>
      </FadeIn>
    </main>
  );
}
