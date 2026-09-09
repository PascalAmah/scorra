import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { Trustbar } from '@/components/landing/trustbar';
import { ProblemSection } from '@/components/landing/problem';
import { Workflow } from '@/components/landing/workflow';
import { PlatformFeatures } from '@/components/landing/platform-features';
import { AnalyticsSplit } from '@/components/landing/analytics-split';
import { Faq } from '@/components/landing/faq';
import { Testimonials } from '@/components/landing/testimonials';
import { CtaBand } from '@/components/landing/cta-band';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Trustbar />
        <ProblemSection />
        <Workflow />
        <PlatformFeatures />
        <AnalyticsSplit />
        <Faq />
        <Testimonials />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
