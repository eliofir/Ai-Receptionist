import { createFileRoute } from "@tanstack/react-router";
import { FadeIn } from "@/components/motion/fade-in";
import { LeadForm } from "@/components/sections/lead-form";

export const Route = createFileRoute("/quote")({ component: QuotePage });

function QuotePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          הצעת מחיר
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
          הצעה שנבנית סביבכם
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          הביטוח מתומחר באופן אישי, ולכן כל הצעה נעשית ביד. שתפו כמה פרטים והצוות יחזור
          עם אפשרויות והסברים ברורים.
        </p>
      </FadeIn>
      <FadeIn delay={0.1} className="mt-8">
        <LeadForm />
      </FadeIn>
    </main>
  );
}
