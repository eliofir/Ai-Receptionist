import { createFileRoute, Link } from "@tanstack/react-router";
import { FadeIn } from "@/components/motion/fade-in";
import { FaqList } from "@/components/sections/faq-list";

export const Route = createFileRoute("/answers")({ component: AnswersPage });

function AnswersPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          שאלות ותשובות
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
          שאלות נפוצות, עם תשובות
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          עיינו לפי נושא, או שאלו את{" "}
          <Link to="/" className="text-primary underline-offset-4 hover:underline">
            דלית
          </Link>{" "}
          ישירות. אם שאלתכם אינה כאן, נשמח לעזור באופן אישי.
        </p>
      </FadeIn>
      <FadeIn delay={0.1} className="mt-10">
        <FaqList />
      </FadeIn>
    </main>
  );
}
