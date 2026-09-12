import React from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { StarBackground } from '../components/landing/StarBackground';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { IntelligentProtectionSection } from '../components/landing/IntelligentProtectionSection';
import { SecurityFeaturesSection } from '../components/landing/SecurityFeaturesSection';
import { Footer } from '../components/landing/LandingCTA';

interface LandingPageProps {
  onLogin: () => void;
  onLaunchApp: () => void;
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onLaunchApp,
  onGetStarted,
}) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  return (
    <div className="relative min-h-screen bg-[#070B14] text-slate-100 selection:bg-blue-600 selection:text-white overflow-x-hidden font-sans">
      {/* Thin scroll-progress bar (1-2px) at top of long page */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-blue-500 z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Subtle Star Particle Canvas Background - ONLY on Landing Page */}
      <StarBackground />

      {/* Landing Navigation */}
      <LandingNavbar
        onLogin={onLogin}
        onLaunchApp={onLaunchApp}
        onSignUp={onGetStarted}
      />

      {/* Main Content */}
      <main className="relative z-10">
        <HeroSection
          onGetStarted={onGetStarted}
          onSimulatePayment={onLaunchApp}
        />

        <ProblemSection />

        <HowItWorksSection />

        <IntelligentProtectionSection />

        <SecurityFeaturesSection />
      </main>

      {/* Landing Footer */}
      <Footer />
    </div>
  );
};
