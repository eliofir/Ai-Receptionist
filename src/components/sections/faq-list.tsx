import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useKnowledgeBase } from "@/hooks/use-site-data";

export function FaqList() {
  const { kb, isLoading, error } = useKnowledgeBase();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">טוען תשובות…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        לא הצלחנו לטעון את התשובות כעת. אנא רעננו את העמוד.
      </p>
    );
  }
  if (kb.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        התשובות בהכנה. בינתיים, דלית יכולה לעזור בעמוד הבית.
      </p>
    );
  }

  const topics = Array.from(new Set(kb.map((e) => e.topic)));
  const isHebrew = (s: string) => /[\u0590-\u05FF]/.test(s);

  return (
    <div className="space-y-10">
      {topics.map((topic) => {
        const rtl = isHebrew(topic);
        return (
          <section
            key={topic}
            dir={rtl ? "rtl" : undefined}
            lang={rtl ? "he" : undefined}
            className={rtl ? "text-right" : undefined}
          >
            <h2 className="text-xl font-semibold text-foreground">{topic}</h2>
            <Accordion type="single" collapsible className="mt-4">
              {kb
                .filter((e) => e.topic === topic)
                .map((e) => (
                  <AccordionItem key={e.slug} value={e.slug}>
                    <AccordionTrigger
                      className={`text-sm font-medium text-foreground ${rtl ? "text-right" : "text-left"}`}
                    >
                      {e.question}
                    </AccordionTrigger>
                    <AccordionContent
                      className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
                        rtl ? "text-right" : ""
                      }`}
                    >
                      {e.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </section>
        );
      })}
    </div>
  );
}
