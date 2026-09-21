import { m } from "framer-motion";
import type { ElementType } from "react";

/**
 * Word-by-word blur-in headline. HIGH-IMPACT — use AT MOST ONCE per page, on
 * the hero heading only. Words wrap naturally (flex-wrap; spacing via margin,
 * not spaces, so tight letter-spacing can't swallow the gaps).
 *
 *   <BlurText as="h1" text={hero.title} className="font-display text-6xl justify-center" />
 */
export function BlurText({
  text,
  className,
  stagger = 0.1,
  as: Tag = "p" as ElementType,
}: {
  text: string;
  className?: string;
  /** Seconds between each word's entrance. */
  stagger?: number;
  as?: ElementType;
}) {
  return (
    <Tag
      className={className}
      style={{ display: "flex", flexWrap: "wrap", rowGap: "0.1em" }}
    >
      {text.split(" ").map((word, i) => (
        <m.span
          key={`${word}-${i}`}
          style={{ display: "inline-block", marginRight: "0.28em" }}
          initial={{ opacity: 0, filter: "blur(5px)", y: -5 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: i * stagger, ease: "easeOut" }}
        >
          {word}
        </m.span>
      ))}
    </Tag>
  );
}
