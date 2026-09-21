import { createFileRoute } from "@tanstack/react-router";
import { FadeIn } from "@/components/motion/fade-in";
import { AboutSection } from "@/components/sections/about-section";
import { StaffDirectory } from "@/components/sections/staff-directory";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
      <FadeIn>
        <AboutSection />
      </FadeIn>
      <FadeIn delay={0.1} className="mt-14">
        <StaffDirectory />
      </FadeIn>
    </main>
  );
}
