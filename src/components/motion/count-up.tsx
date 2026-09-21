import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

/**
 * Viewport-triggered number counter for stat rows ("15+ yıl", "5000 müşteri").
 * Counts from 0 to `to` once when scrolled into view; honors reduced motion
 * (jumps straight to the final value).
 *
 *   <CountUp to={5000} suffix="+" className="text-5xl font-display" />
 *   <CountUp to={4.9} decimals={1} duration={1.2} />
 */
export function CountUp({
  to,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  /** Seconds from 0 to the final value. */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(to * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
