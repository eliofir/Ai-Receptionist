import { m } from "framer-motion";
import type { ReactNode } from "react";
import { useReveal } from "./use-reveal";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

/**
 * Cascading entrance for a group: children reveal one after another when the
 * container scrolls into view. Wrap the grid/list with <Stagger>, wrap each
 * card/child with <StaggerItem>.
 *
 *   <Stagger className="grid gap-6 md:grid-cols-3">
 *     {cards.map(c => <StaggerItem key={c.id}><Card …/></StaggerItem>)}
 *   </Stagger>
 *
 * Reveal is driven by `useReveal`, not by `whileInView` alone: a grid that mounts
 * after its data arrives (every product list, category page and filtered tab) must
 * never be able to stay at opacity 0 because an observer missed it. See use-reveal.ts.
 */
export function Stagger({
  children,
  gap = 0.1,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Seconds between each child's entrance. */
  gap?: number;
  /** Seconds before the first child starts. */
  delay?: number;
  className?: string;
}) {
  const { ref, revealed } = useReveal();

  return (
    <m.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={revealed ? "show" : "hidden"}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <m.div className={className} variants={item}>
      {children}
    </m.div>
  );
}
