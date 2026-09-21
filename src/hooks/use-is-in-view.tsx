import * as React from 'react';
import { useInView, type UseInViewOptions } from 'motion/react';

interface UseIsInViewOptions {
  inView?: boolean;
  inViewOnce?: boolean;
  inViewMargin?: UseInViewOptions['margin'];
}

function useIsInView<T extends HTMLElement = HTMLElement>(
  ref: React.Ref<T>,
  options: UseIsInViewOptions = {},
) {
  const { inView, inViewOnce = false, inViewMargin = '0px' } = options;
  const localRef = React.useRef<T>(null);
  React.useImperativeHandle(ref, () => localRef.current as T);
  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });

  // Failsafe for the one configuration that can strand content: `inView` +
  // `inViewOnce`. There the element starts hidden and only an IntersectionObserver
  // can reveal it, so if that observer is created while layout hasn't settled — the
  // normal case for anything that mounts after async data or during a client-side
  // route change — it reports "not intersecting", `once` stops it looking, and the
  // element stays hidden forever. Same failure the motion kit had (see
  // components/motion/use-reveal.ts); this keeps the whole animate-ui set immune.
  //
  // Fix: never ask an observer about something already on screen. Measure once
  // after mount and reveal immediately if any part of the node is in the viewport.
  // Genuinely below-the-fold content is untouched and still reveals on scroll.
  const [onScreenAtMount, setOnScreenAtMount] = React.useState(false);
  React.useEffect(() => {
    if (!inView || !inViewOnce) return;
    const el = localRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh && r.bottom > 0) setOnScreenAtMount(true);
  }, [inView, inViewOnce]);

  const isInView = !inView || inViewResult || onScreenAtMount;
  return { ref: localRef, isInView };
}

export { useIsInView, type UseIsInViewOptions };
