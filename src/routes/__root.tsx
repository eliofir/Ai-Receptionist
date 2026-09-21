import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Component, type ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { SiteHeader } from "@/components/site-header";

/**
 * Contain any render crash to a graceful fallback instead of white-screening the WHOLE site.
 * A missing / oddly-typed field routinely throws during render — `x.toLocaleString()` when `x`
 * is undefined, `.map()` on a value that isn't an array, `obj.prop.sub` on a null — and without
 * a boundary that single throw blanks the entire page. Here it degrades to one contained
 * message; the rest of the site keeps working. `componentDidCatch` re-logs to the console AND
 * beacons the platform's site-activity collector (React render errors do NOT trigger
 * window.onerror, so the collector would otherwise never see them) — so the error still reaches
 * the builder to fix.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: unknown) {
    console.error("[render-error]", error, info);
    try {
      const v = (window as any).__VINCEN__;
      if (v?.logUrl && navigator?.sendBeacon) {
        navigator.sendBeacon(
          v.logUrl,
          JSON.stringify({
            type: "js-error",
            kind: "render",
            message: String(error?.message || error),
            stack: error?.stack,
            siteId: v.siteId,
          }),
        );
      }
    } catch {
      /* best-effort — never let logging throw */
    }
  }
  render() {
    if (this.state.error) {
      return (
        // `data-vincen-error-boundary` is a machine-readable marker: the platform's
        // self-check (scripts/verify_site.py) looks for it to detect a route that
        // threw during render and fell back here — a real bug (usually an unguarded
        // null/undefined field) that would otherwise stay invisible because the
        // boundary swallows the throw (no window.onerror, page not blank).
        <div
          data-vincen-error-boundary=""
          className="mx-auto max-w-md px-6 py-16 text-center"
        >
          <p className="text-lg font-medium text-foreground">משהו השתבש</p>
          <p className="mt-2 text-sm text-muted-foreground">
            החלק הזה לא נטען. אנא רעננו את העמוד.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createRootRoute({
  component: () => (
    // LazyMotion(domAnimation) keeps the motion bundle small; the motion kit in
    // @/components/motion uses the lightweight `m` component and needs this
    // provider. MotionConfig reducedMotion="user" disables transform animations
    // for users with prefers-reduced-motion — accessibility comes centrally.
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-background text-foreground">
          <SiteHeader />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </MotionConfig>
    </LazyMotion>
  ),
});
