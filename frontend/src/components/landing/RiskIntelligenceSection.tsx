import React from 'react';
import { motion } from 'motion/react';
import { RiskIndicator } from '../common/RiskIndicator';
import { ShieldAlert, Check, AlertCircle } from 'lucide-react';

export const RiskIntelligenceSection: React.FC = () => {
  const breakdown = [
    { name: 'Transaction Risk', score: 78, desc: 'Unusual amount vs. monthly profile', color: 'bg-orange-500' },
    { name: 'Recipient Risk', score: 72, desc: 'Newly created handle; zero shared contacts', color: 'bg-orange-500' },
    { name: 'Behavior Risk', score: 65, desc: 'Late evening deviation on unverified device', color: 'bg-amber-500' },
    { name: 'Social Engineering', score: 91, desc: 'Urgent disconnection threat in remark string', color: 'bg-rose-500' },
    { name: 'Network Risk', score: 40, desc: 'Standard cellular carrier routing path', color: 'bg-blue-500' },
  ];

  return (
    <section id="security" className="py-24 bg-[#0B1120]/80 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            Multivariate Risk Assessment
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
            Transparent Risk Intelligence
          </h2>
          <p className="mt-4 text-slate-300 text-base">
            Every score is backed by clear telemetry across five discrete risk vectors.
          </p>
        </div>

        {/* Visual Showcase Card */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Big Radial Score */}
            <div className="md:col-span-5 flex flex-col items-center text-center p-6 rounded-xl bg-[#0B1120] border border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                Live Transaction Evaluation
              </span>

              <RiskIndicator score={82} level="HIGH" size="lg" animate={true} />

              <div className="mt-4 flex items-center gap-1.5 text-xs text-orange-400 font-semibold bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Action Recommended: PAUSE</span>
              </div>

              <p className="mt-3 text-xs text-slate-400 max-w-xs">
                Payload exhibits multiple high-risk coercive signatures. System held transaction before settlement.
              </p>
            </div>

            {/* Right: Detailed Risk Breakdown Bars */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Vector Dimension</span>
                <span>Threat Weight</span>
              </div>

              {breakdown.map((item, idx) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  className="p-3.5 rounded-lg bg-[#0B1120] border border-slate-800/80"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">{item.name}</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {item.score} <span className="text-slate-500">/ 100</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2">{item.desc}</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${item.color}`}
                      initial={{ width: '0%' }}
                      whileInView={{ width: `${item.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
