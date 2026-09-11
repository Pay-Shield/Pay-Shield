import React from 'react';
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
  return (
    <div className="relative min-h-screen bg-[#070B14] text-slate-100 selection:bg-blue-600 selection:text-white overflow-x-hidden font-sans">
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
