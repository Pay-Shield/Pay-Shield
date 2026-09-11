import React from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  UserCheck,
  BrainCircuit,
  ShieldAlert,
  Gauge,
  FileCheck2,
} from 'lucide-react';

export const IntelligentProtectionSection: React.FC = () => {
  const capabilities = [
    {
      title: 'Transaction Analysis',
      icon: CreditCard,
      description: 'Parses payload structure, currency velocity, and payment volume against typical spend baselines.',
    },
    {
      title: 'Recipient Verification',
      icon: UserCheck,
      description: 'Verifies recipient banking registration, VPA reputation records, and NPCI syndicate reports.',
    },
    {
      title: 'Behavioral Analysis',
      icon: BrainCircuit,
      description: 'Evaluates time of day, active device session posture, typing cadence, and geolocation consistency.',
    },
    {
      title: 'Scam Detection',
      icon: ShieldAlert,
      description: 'Detects natural language coercion patterns: urgent disconnections, fake prize bonuses, and impersonations.',
    },
    {
      title: 'Deterministic Risk Scoring',
      icon: Gauge,
      description: 'Combines multiple risk vectors into a mathematically grounded 0–100 index for immediate policy action.',
    },
    {
      title: 'Explainable Security Alerts',
      icon: FileCheck2,
      description: 'Provides plain-English rationale behind every paused or blocked transaction without cryptic error codes.',
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
            Full-Spectrum Context
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
            Protection that understands context.
          </h2>
          <p className="mt-4 text-slate-300 text-base leading-relaxed">
            Scams succeed when systems look only at numbers. PAYSHIELD inspects human intent, urgency markers, and recipient identity simultaneously.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <div className="p-6 rounded-xl border border-slate-800 bg-[#111827] hover:border-slate-700 transition-all h-full flex flex-col">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1.5">{cap.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{cap.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
