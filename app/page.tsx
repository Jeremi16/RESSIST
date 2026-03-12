import { Navbar } from '@/components/landing-page/Navbar'
import { HeroSection } from '@/components/landing-page/HeroSection'
import { FeaturesSection } from '@/components/landing-page/FeaturesSection'
import { StepsSection } from '@/components/landing-page/StepsSection'
import { Footer } from '@/components/landing-page/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
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
  )
}
