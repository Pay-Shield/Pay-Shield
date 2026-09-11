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
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-none ${
        scrolled
          ? 'bg-[#070B14]/90 backdrop-blur-md py-3.5 shadow-lg shadow-black/40'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center p-0.5 shadow-md shadow-blue-500/20">
            <div className="w-full h-full bg-[#070B14] rounded-[7px] flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-wider text-white font-display">
              PAYSHIELD
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium text-slate-300">
          <button
            onClick={() => handleSectionClick('features')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => handleSectionClick('how-it-works')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => handleSectionClick('security')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Security
          </button>
        </nav>
      </div>
    </header>
  );
};
