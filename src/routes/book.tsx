import { createFileRoute } from "@tanstack/react-router";
import { FadeIn } from "@/components/motion/fade-in";
import { BookingForm } from "@/components/sections/booking-form";

export const Route = createFileRoute("/book")({ component: BookPage });

function BookPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          פגישות
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
          קבעו זמן עם הצוות
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          הפגישות מתקיימות בימים שני עד שישי, 8:30 עד 17:30. בחרו את השירות הדרוש ומשבצת
          של 30 דקות שמתאימה לכם.
        </p>
      </FadeIn>
      <FadeIn delay={0.1} className="mt-8">
        <BookingForm />
      </FadeIn>
    </main>
  );
}
