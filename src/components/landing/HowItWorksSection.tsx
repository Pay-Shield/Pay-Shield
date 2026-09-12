import React from 'react';
import { motion } from 'motion/react';
import { ScanSearch, UserCheck2, Calculator, ShieldAlert } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'INGEST',
      subtitle: 'Evaluate payload & device context',
      description: 'As you initiate a payment, PayShield validates the recipient handle and amount before anything else runs.',
      icon: ScanSearch,
      details: ['Amount vs. personal baseline', 'UPI handle format check', 'Velocity & time-of-day context'],
    },
    {
      num: '02',
      title: 'PARALLEL AGENTS',
      subtitle: 'Recipient trust & network analysis',
      description: 'Cross-checks payee VPA against banking directories, registered scam syndicates, and mutual interaction density.',
      icon: UserCheck2,
      details: ['Known scam-handle registry', 'Recipient trust tier', 'New vs. frequent payee'],
    },
    {
      num: '03',
      title: 'RISK SYNTHESIS',
      subtitle: 'Deterministic scoring & policy matching',
      description: 'Combines the rule signals and the local LLM\'s read of the note into a transparent 0–100 risk score.',
      icon: Calculator,
      details: ['Rules require correlated signals, not one alone', 'Local LLM reads the note for coercion', 'Every rule is independently auditable'],
    },
    {
      num: '04',
      title: 'INTERVENTION',
      subtitle: 'Auto-Clear, Verify, Pause, or Block',
      description: 'Enforces the exact policy tier: seamlessly cleared for verified payees, step-up check for new vendors, or hard lock for scams.',
      icon: ShieldAlert,
      details: ['Instant Razorpay for Safe tier', 'Step-up 2FA for Paused tier', 'Zero override on Blocked scams'],
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#090E1B] relative border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
            Pipeline Architecture
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug">
            How PayShield Works
          </h2>
          <p className="mt-4 text-slate-300 text-base leading-relaxed font-normal">
            A 5-step automated defense pipeline engineered to halt fraudulent transfers before funds ever leave your account.
          </p>
        </motion.div>

        {/* Connected Timeline */}
        <div className="relative">
          {/* Subtle connecting track */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-[1px] bg-slate-800 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: idx * 0.08, ease: 'easeOut' }}
                  className="flex flex-col h-full bg-[#0E1526] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 tabular-nums">
                      {step.num}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-white tracking-wider uppercase mb-1">
                    {step.title}
                  </h3>
                  <div className="text-xs font-medium text-blue-300 mb-2">
                    {step.subtitle}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
                    {step.description}
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                    {step.details.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
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
