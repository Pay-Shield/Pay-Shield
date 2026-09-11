import React from 'react';
import { motion } from 'motion/react';
import { ScanSearch, UserCheck2, Calculator, ShieldAlert } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'ANALYZE',
      subtitle: 'Analyze transaction & behavioral signals',
      description: 'As you initiate a transfer, PAYSHIELD evaluates timing, amount deviation, network hops, and device fingerprint integrity.',
      icon: ScanSearch,
      details: ['Amount baseline check', 'Device & IP telemetry', 'Velocity & session context'],
    },
    {
      num: '02',
      title: 'VERIFY',
      subtitle: 'Check recipient trust & identity',
      description: 'Cross-checks payee VPA and phone number against national scam registers, trust clusters, and mutual history graphs.',
      icon: UserCheck2,
      details: ['National scam blacklists', 'Mutual contact density', 'Handle age & KYC validation'],
    },
    {
      num: '03',
      title: 'ACCESSIBILITY',
      subtitle: 'Calculate risk & accessibility heuristics',
      description: 'Synthesizes 14 distinct behavioral risk dimensions into a deterministic, transparent 0–100 risk score in under 1.5 seconds.',
      icon: Calculator,
      details: ['Multi-factor weighting', 'Social coercion heuristics', 'Dynamic policy comparison'],
    },
    {
      num: '04',
      title: 'PROTECT',
      subtitle: 'Allow, verify, pause or block',
      description: 'Enforces the exact policy tier: seamlessly cleared for verified friends, one-time confirm for new vendors, or hard paused for scams.',
      icon: ShieldAlert,
      details: ['Zero friction for trusted payees', 'Interactive verification modals', 'Hard lock on verified scams'],
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0B1120]/60 relative border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            Architecture & Workflow
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
            How PAYSHIELD Works
          </h2>
          <p className="mt-4 text-slate-300 text-base">
            A 4-step automated defense pipeline engineered to halt scams while keeping legitimate payments effortless.
          </p>
        </div>

        {/* Connected Timeline */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-500 -translate-y-1/2 opacity-30 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.1 }}
                  className="flex flex-col h-full bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      {step.num}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-1">
                    {step.title}
                  </h3>
                  <div className="text-xs font-medium text-cyan-300 mb-2">
                    {step.subtitle}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
                    {step.description}
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 space-y-1">
                    {step.details.map((item) => (
                      <div key={item} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <div className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
