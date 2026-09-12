import React from 'react';
import { motion } from 'motion/react';
import { MessageSquareWarning, UserX, AlertOctagon } from 'lucide-react';
import { Card } from '../common/Card';

export const ProblemSection: React.FC = () => {
  const problems = [
    {
      title: 'SOCIAL ENGINEERING',
      icon: MessageSquareWarning,
      tag: 'Psychological Coercion',
      description: 'Urgency, impersonation, and intense pressure tactics engineered to force rushed payments before victims can verify.',
      example: 'Simulated disconnection alerts, fake emergency calls, fraudulent tax audits.',
    },
    {
      title: 'UNKNOWN RECIPIENTS',
      icon: UserX,
      tag: 'Identity Deception',
      description: 'New, unverified, or synthetic recipients with zero transaction history, shell entities, or disposable handles.',
      example: 'Freshly registered UPI handles spoofing authorized merchant or utility desks.',
    },
    {
      title: 'ABNORMAL TRANSACTIONS',
      icon: AlertOctagon,
      tag: 'Behavioral Outliers',
      description: 'Sudden spike amounts, atypical late-night timing, or anomalous velocity that diverges from historical spending baselines.',
      example: 'Rapid successive transfers executed off-hours from an unfamiliar browser fingerprint.',
    },
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
            Vulnerabilities & Threat Vectors
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug">
            Digital payment scams move fast. <br />
            <span className="text-slate-400 font-normal">Your protection must move faster.</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base leading-relaxed max-w-2xl mx-auto font-normal">
            Traditional banks react only after money has already cleared. PayShield intercepts malicious intent prior to authorization.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((prob, index) => {
            const Icon = prob.icon;
            return (
              <motion.div
                key={prob.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
              >
                <Card
                  variant="surface"
                  hoverEffect
                  className="h-full flex flex-col justify-between p-6 bg-[#0E1526] border-slate-800/80 rounded-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-wider bg-[#0B101D] px-2.5 py-1 rounded border border-slate-800 font-medium">
                        {prob.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight mb-2">
                      {prob.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4 font-normal">
                      {prob.description}
                    </p>

                    <div className="p-3 rounded-lg bg-[#080D1A] border border-slate-800/80 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Scenario Context:</span> {prob.example}
                    </div>
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
