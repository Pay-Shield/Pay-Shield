import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ShieldCheck, ArrowRight, Shield, Activity, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';

interface HeroSectionProps {
  onGetStarted: () => void;
  onSeeHowItWorks?: () => void;
  onSimulatePayment?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const [activeStage, setActiveStage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Restrained scroll-linked parallax/fade on hero
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.25]);
  const heroY = useTransform(scrollYProgress, [0, 0.7], [0, 40]);

  // Cycle through the abstract transaction steps
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % 5);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const stages = [
    { label: 'Payment Request', icon: Shield, detail: '₹25,000 → unknown@upi', status: 'INITIATED' },
    { label: 'Analyze', icon: Activity, detail: '14 behavioral signals parsed', status: 'PROCESSING' },
    { label: 'Verify', icon: UserCheck, detail: 'Recipient trust: Level 1', status: 'EVALUATING' },
    { label: 'Risk Score', icon: AlertTriangle, detail: 'Score: 82/100 (High Risk)', status: 'ALERT' },
    { label: 'Protected', icon: ShieldCheck, detail: 'Payment Paused · Scam Blocked', status: 'SECURED' },
  ];

  return (
    <section ref={containerRef} className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <motion.div
        style={{ opacity: heroOpacity, y: heroY }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="max-w-3xl mx-auto text-center">
          {/* Status Tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-slate-700/80 bg-[#0B101D] text-slate-300 text-xs font-mono mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="uppercase tracking-wider font-medium text-[11px]">Pre-Transaction Defense Platform</span>
          </motion.div>

          {/* Main Heading - Clear Type Scale 40–56px, -0.02em letter spacing */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Secure every payment <br className="hidden sm:inline" />
            <span className="text-slate-300">
              before it happens.
            </span>
          </motion.h1>

          {/* Subheading - 18-20px comfortable line-height (1.6) */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12, ease: 'easeOut' }}
            className="mt-6 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto font-normal"
          >
            PayShield analyzes transaction behavior, recipient trust networks, and social engineering signals to protect your accounts before money moves.
          </motion.p>

          {/* Single Primary CTA above fold */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18, ease: 'easeOut' }}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="px-7 py-3 text-sm font-medium rounded-lg"
            >
              Get Started
            </Button>
          </motion.div>

          {/* Micro Trust Indicators */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="mt-4 text-xs text-slate-400 font-sans"
          >
            This is a simulation — no real money moves during a demo.
          </motion.p>
        </div>

        {/* Abstract Transaction-Security Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32, ease: 'easeOut' }}
          className="mt-12 max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-slate-800/80 bg-[#0A0F1D]/90 backdrop-blur-md p-6 sm:p-8 shadow-xl">
            {/* Header label */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="uppercase tracking-wider font-semibold text-slate-300">Example Payment Flow</span>
              </div>
            </div>

            {/* Stepper Pipeline Flow */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-6">
              {stages.map((st, idx) => {
                const Icon = st.icon;
                const isCurrent = activeStage === idx;
                const isPassed = activeStage > idx;

                return (
                  <div
                    key={st.label}
                    onClick={() => setActiveStage(idx)}
                    className={`relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#111A2E] border-blue-500/70 shadow-sm'
                        : isPassed
                        ? 'bg-[#0B101D] border-slate-800 text-slate-300'
                        : 'bg-[#0B101D]/60 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isCurrent
                            ? 'bg-blue-600/20 text-blue-400'
                            : isPassed
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-800/50 text-slate-500'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">0{idx + 1}</span>
                    </div>

                    <div className="text-xs font-semibold tracking-tight text-white mb-1">
                      {st.label}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug font-mono tabular-nums line-clamp-2">
                      {st.detail}
                    </div>

                    {isCurrent && (
                      <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-500"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 2.8, ease: 'linear' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
