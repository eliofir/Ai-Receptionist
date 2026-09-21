import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal state that can NEVER strand content invisible.
 *
 * The motion kit's entrance animations start at `opacity: 0` and depend on an
 * IntersectionObserver to reveal them. That is safe for markup present at first
 * paint — but every data-driven list mounts LATER: it renders only after its
 * query resolves, frequently during a client-side route change. In that window
 * the observer can be created against a node whose layout has not settled and
 * report "not intersecting"; because the kit uses `once: true`, the element then
 * stays at opacity 0 permanently. The rows are in the DOM, correct, and
 * invisible — which is the worst failure a site can have, and the cause of the
 * chronic "category page / tab shows no items after a couple of switches" bug.
 *
 * Fix: never ask an observer about something that is ALREADY on screen. After
 * mount we measure the node once; if any part of it is inside the viewport we
 * reveal it immediately (the entrance still animates, it just isn't gated on the
 * observer). Genuinely below-the-fold content is untouched and still reveals on
 * scroll, so the effect is unchanged — only the stuck state disappears.
 *
 * The failsafe applies only when `once` is true, since that is the sole
 * configuration that can get stuck; a repeating reveal re-evaluates forever.
 */
export function useReveal({
  once = true,
  margin = "-80px",
}: { once?: boolean; margin?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  // `margin` is a plain CSS length string; framer types it as a template literal
  // union, so widen at the call boundary rather than forcing callers to match it.
  const inView = useInView(ref, { once, margin: margin as any });
  const [onScreenAtMount, setOnScreenAtMount] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Runs after paint, so layout is settled and the rect is real.
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh && r.bottom > 0) setOnScreenAtMount(true);
  }, []);

  return { ref, revealed: once ? inView || onScreenAtMount : inView };
}
