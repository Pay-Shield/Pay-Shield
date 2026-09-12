import React from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  BadgeCheck,
  HelpCircle,
  ShieldCheck,
  UserCheck,
  History,
} from 'lucide-react';
import { Card } from '../common/Card';

export const SecurityFeaturesSection: React.FC = () => {
  const features = [
    {
      title: 'Real-Time Payment Screening',
      icon: Zap,
      description: 'Sub-second inspection of every outbound transfer request prior to credential prompt.',
    },
    {
      title: 'Four-Tier Recipient Verification',
      icon: BadgeCheck,
      description: 'Hierarchical trust classification checking NPCI registries and historical peer transactions.',
    },
    {
      title: 'Plain-Language Explainability',
      icon: HelpCircle,
      description: 'Human-readable breakdown of why a payment was auto-cleared, paused, or blocked.',
    },
    {
      title: 'Automated Pause & Block',
      icon: ShieldCheck,
      description: 'Zero unauthorized fund movement. High-risk scams are intercepted and held for explicit review.',
    },
    {
      title: 'Human-in-the-Loop Controls',
      icon: UserCheck,
      description: 'You remain in control. Confirm or cancel payments after reviewing plain-English rationale.',
    },
    {
      title: 'Cryptographic SHA-256 Audit Trail',
      icon: History,
      description: 'Mathematically linked hash ledger for every security decision and intervention.',
    },
  ];

  return (
    <section id="security" className="py-24 relative bg-[#090E1B] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
            Platform Capabilities
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug">
            Engineered for Uncompromising Trust
          </h2>
          <p className="mt-4 text-slate-300 text-base leading-relaxed font-normal">
            Comprehensive defenses designed to eliminate payment fraud while maintaining an effortless user experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.07, ease: 'easeOut' }}
              >
                <Card
                  variant="surface"
                  hoverEffect
                  className="p-6 h-full flex flex-col justify-between bg-[#0E1526] border-slate-800/80 rounded-xl"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-normal">{feat.description}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
