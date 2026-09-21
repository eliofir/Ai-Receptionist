import { createFileRoute } from "@tanstack/react-router";
import { FadeIn } from "@/components/motion/fade-in";
import { VoiceDemo } from "@/components/sections/voice-demo";
import { dalitCopy } from "@/content/site";

export const Route = createFileRoute("/test")({ component: TestPage });

function TestPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          הדגמת קול
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
          בדיקת הנציגה
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {dalitCopy.intro}
        </p>
      </FadeIn>
      <FadeIn delay={0.1} className="mt-8">
        <VoiceDemo />
      </FadeIn>
    </main>
  );
}
