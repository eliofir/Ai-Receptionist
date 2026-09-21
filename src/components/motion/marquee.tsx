import type { ReactNode } from "react";

/**
 * Infinite horizontal loop for logo strips / partner rows / tag ribbons.
 * Pure CSS animation (keyframes live in styles.css); pauses on hover and
 * stops entirely under prefers-reduced-motion. Children are rendered twice
 * to make the loop seamless — pass the SINGLE set, not a duplicated list.
 *
 *   <Marquee speed={30} className="py-6">
 *     {logos.map(l => <img key={l.name} src={src(l.path)} className="h-8 opacity-60" />)}
 *   </Marquee>
 */
export function Marquee({
  children,
  speed = 30,
  gap = "3rem",
  className,
}: {
  children: ReactNode;
  /** Seconds for one full loop — higher is slower. */
  speed?: number;
  /** Gap between items (CSS length). */
  gap?: string;
  className?: string;
}) {
  return (
    <div
      className={`marquee ${className ?? ""}`}
      style={{ ["--marquee-duration" as string]: `${speed}s`, ["--marquee-gap" as string]: gap }}
    >
      <div className="marquee-track" aria-hidden="false">
        {children}
      </div>
      <div className="marquee-track" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
