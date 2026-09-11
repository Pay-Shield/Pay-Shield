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
      title: 'Real-Time Payment Analysis',
      icon: Zap,
      description: 'Sub-second inspection of every outbound transfer request prior to credential prompt.',
    },
    {
      title: 'Recipient Verification',
      icon: BadgeCheck,
      description: 'Four-tier trust classification checking NPCI registries and KYC identity records.',
    },
    {
      title: 'Explainable Alerts',
      icon: HelpCircle,
      description: 'Plain-English breakdown of why a payment was flagged, paused, or verified.',
    },
    {
      title: 'Pause & Block Mechanism',
      icon: ShieldCheck,
      description: 'Zero unauthorized fund movement. Scams are halted and held for your explicit review.',
    },
    {
      title: 'Human-in-the-Loop Protection',
      icon: UserCheck,
      description: 'You always remain in total control. Override or confirm payments after reviewing evidence.',
    },
    {
      title: 'Complete Audit History',
      icon: History,
      description: 'Cryptographically verifiable, immutable audit trail for every security decision and intervention.',
    },
  ];

  return (
    <section id="security" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
            Platform Capabilities
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
            Engineered for Uncompromising Trust
          </h2>
          <p className="mt-4 text-slate-300 text-base">
            Comprehensive defenses designed to eliminate payment fraud while maintaining an effortless user experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              >
                <Card
                  variant="surface"
                  hoverEffect
                  className="p-6 h-full flex flex-col justify-between bg-[#111827] border-slate-800"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
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
