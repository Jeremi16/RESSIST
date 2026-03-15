import { LandingNavbar } from "@/components/LandingNavbar";
import { HeroSection } from "@/components/landing-page/HeroSection";
import { FeaturesSection } from "@/components/landing-page/FeaturesSection";
import { StepsSection } from "@/components/landing-page/StepsSection";
import { Footer } from "@/components/landing-page/Footer";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-white">
      <LandingNavbar />
      <main className="flex-1">
        <section id="hero">
          <HeroSection />
        </section>
        <section id="features">
          <FeaturesSection />
        </section>
        <section id="how-it-works">
          <StepsSection />
        </section>
      </main>
      <Footer />
    </div>
  );
}
