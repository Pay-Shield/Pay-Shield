import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

interface LandingNavbarProps {
  onLogin?: () => void;
  onSignUp?: () => void;
  onLaunchApp?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onLogin,
  onLaunchApp,
  onNavigateSection,
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSectionClick = (sectionId: string) => {
    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 border-none ${
        scrolled
          ? 'bg-[#070B14]/90 backdrop-blur-md py-3.5 border-b border-slate-800/80 shadow-md shadow-black/40'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            PayShield
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleSectionClick('features')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => handleSectionClick('how-it-works')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleSectionClick('security')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Security
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 cursor-pointer"
            >
              Sign In
            </button>
          )}
          {onLaunchApp && (
            <button
              type="button"
              onClick={onLaunchApp}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-500/30 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm transition-colors cursor-pointer"
            >
              Launch App
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
