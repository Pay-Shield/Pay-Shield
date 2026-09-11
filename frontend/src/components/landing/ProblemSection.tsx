import React from 'react';
import { motion } from 'motion/react';
import { MessageSquareWarning, UserX, AlertOctagon, ArrowUpRight } from 'lucide-react';
import { Card } from '../common/Card';

export const ProblemSection: React.FC = () => {
  const problems = [
    {
      title: 'SOCIAL ENGINEERING',
      icon: MessageSquareWarning,
      tag: 'Psychological Coercion',
      description: 'Urgency, impersonation, and intense pressure tactics engineered to force rushed payments before victims can think or verify.',
      example: 'Fake electricity disconnection notices, urgent family emergencies, simulated tax audits.',
      stat: '68% of digital fraud',
    },
    {
      title: 'UNKNOWN RECIPIENTS',
      icon: UserX,
      tag: 'Identity Deception',
      description: 'New, unverified, or suspicious recipients with zero transaction history, synthetic accounts, or newly minted payment handles.',
      example: 'Freshly registered UPI handles posing as authorized merchants or institutional billing desks.',
      stat: '84% unrecovered funds',
    },
    {
      title: 'ABNORMAL TRANSACTIONS',
      icon: AlertOctagon,
      tag: 'Behavioral Outliers',
      description: 'Unusual amounts, late-night timing, unfamiliar devices, or payment behaviors that wildly diverge from normal habits.',
      example: 'Spike transfers occurring after midnight from a newly connected browser session.',
      stat: '5.2x risk multiplier',
    },
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
            Vulnerabilities & Vectors
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
            Digital payment scams move fast. <br />
            <span className="text-slate-400">Your protection should too.</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base leading-relaxed">
            Traditional banks only detect fraud after money has already left your account. PAYSHIELD intercepts the intent before authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((prob, index) => {
            const Icon = prob.icon;
            return (
              <motion.div
                key={prob.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
              >
                <Card
                  variant="surface"
                  hoverEffect
                  className="h-full flex flex-col justify-between p-6 bg-[#111827] border-slate-800"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-wider bg-[#0B1120] px-2.5 py-1 rounded border border-slate-800">
                        {prob.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight mb-2">
                      {prob.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {prob.description}
                    </p>

                    <div className="p-3 rounded-lg bg-[#0B1120] border border-slate-800/80 text-xs text-slate-400 mb-4">
                      <span className="font-semibold text-slate-300">Vector context:</span> {prob.example}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-rose-400 font-semibold">{prob.stat}</span>
                    <span className="text-slate-400 flex items-center gap-1">
                      Intercepted <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </span>
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
