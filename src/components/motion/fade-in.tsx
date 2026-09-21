import { m } from "framer-motion";
import type { ReactNode } from "react";
import { useReveal } from "./use-reveal";

/**
 * Scroll-triggered entrance: the block fades in and rises once when it enters
 * the viewport. The default motion tier — safe on every section of every site.
 *
 *   <FadeIn><AboutSection /></FadeIn>
 *   <FadeIn delay={0.15}><StatsRow /></FadeIn>
 *
 * Reveal is driven by `useReveal`, not by `whileInView` alone, so a section that
 * mounts after async data (or during a route change) can never be stranded at
 * opacity 0 by an observer that missed it. See use-reveal.ts.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 24,
  once = true,
  className,
}: {
  children: ReactNode;
  /** Seconds before the animation starts (stagger siblings by 0.1–0.15). */
  delay?: number;
  /** Initial downward offset in px. */
  y?: number;
  /** Animate only the first time it scrolls into view. */
  once?: boolean;
  className?: string;
}) {
  const { ref, revealed } = useReveal({ once });

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </m.div>
  );
}
