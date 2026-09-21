import { useEffect, useRef } from "react";

/**
 * Looping background video with a soft JS crossfade at the loop point (no hard
 * cut). For hero/section backgrounds ONLY when a video file exists in the
 * site's assets — resolve it with useAssets().src("hero.mp4"). Never generate
 * video yourself; if no video asset was provided, use an image or gradient.
 *
 * Honors prefers-reduced-motion: the video stays paused on its poster frame.
 *
 *   const { src } = useAssets();
 *   <div className="relative">
 *     <FadingVideo src={src("hero.mp4")} poster={src("hero.jpg")} />
 *     <div className="relative z-10">…content…</div>
 *   </div>
 */
export function FadingVideo({
  src,
  poster,
  fadeMs = 500,
  className,
}: {
  src: string;
  poster?: string;
  /** Crossfade duration at loop start/end, in ms. */
  fadeMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      v.style.opacity = "1";
      return;
    }

    let raf = 0;
    const fadeTo = (target: number) => {
      cancelAnimationFrame(raf);
      const from = Number(v.style.opacity || "1");
      const start = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / fadeMs);
        v.style.opacity = String(from + (target - from) * k);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    // loop attribute is OFF on purpose — we loop manually so the seam can fade.
    const onLoaded = () => {
      v.style.opacity = "0";
      v.play().catch(() => {});
      fadeTo(1);
    };
    const onTime = () => {
      if (v.duration && v.duration - v.currentTime < 0.55) fadeTo(0);
    };
    const onEnded = () => {
      v.currentTime = 0;
      v.play().catch(() => {});
      fadeTo(1);
    };

    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [fadeMs]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      playsInline
      autoPlay
      preload="metadata"
      aria-hidden="true"
      className={className ?? "absolute inset-0 h-full w-full object-cover"}
      style={{ opacity: 0 }}
    />
  );
}
