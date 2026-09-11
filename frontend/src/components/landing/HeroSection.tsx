import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight, Shield, Activity, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';

interface HeroSectionProps {
  onGetStarted: () => void;
  onSeeHowItWorks?: () => void;
  onSimulatePayment?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const [activeStage, setActiveStage] = useState(0);

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
    { label: 'Protected', icon: ShieldCheck, detail: 'Payment Paused • Scams Blocked', status: 'SECURED' },
  ];

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Subtle status tag */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-cyan-400 text-xs font-semibold mb-6 tracking-wide"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PRE-TRANSACTION DEFENSE PLATFORM</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-display leading-[1.15]"
          >
            Secure every payment <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-300">
              before it happens.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal"
          >
            PAYSHIELD analyzes transaction behavior, recipient trust and suspicious payment signals to protect you before your money moves.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="mt-9 flex items-center justify-center"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="px-8 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25"
            >
              GET STARTED
            </Button>
          </motion.div>
        </div>

        {/* Abstract Transaction-Security Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-slate-800 bg-[#0B1120]/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl shadow-black/50">
            {/* Header label */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="uppercase tracking-wider font-semibold text-slate-300">Live Interception Pipeline</span>
              </div>
              <span>Latency: 1.42s avg</span>
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
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#172033] border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                        : isPassed
                        ? 'bg-[#111827] border-blue-500/30 text-slate-300'
                        : 'bg-[#111827]/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isCurrent
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : isPassed
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">0{idx + 1}</span>
                    </div>

                    <div className="text-xs font-bold tracking-tight text-white mb-1">
                      {st.label}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                      {st.detail}
                    </div>

                    {isCurrent && (
                      <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-cyan-400"
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
      </div>
    </section>
  );
};
