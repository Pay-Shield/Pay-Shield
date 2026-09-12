import React from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Bot } from 'lucide-react';
import { RiskBreakdown, RiskLevel, TransactionStatus } from '../../types';

interface ExplainabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reasons: string[];
  breakdown: RiskBreakdown | null;
  riskScore: number;
  riskLevel: RiskLevel;
  action: TransactionStatus;
  recipientName: string;
  amount: number;
  message?: string;
  llmReasoning?: string | null;
  llmScoreAdjustment?: number;
}

export const ExplainabilityDrawer: React.FC<ExplainabilityDrawerProps> = ({
  isOpen,
  onClose,
  reasons,
  breakdown,
  riskScore,
  action,
  amount,
  message,
  llmReasoning,
  llmScoreAdjustment,
}) => {
  if (!isOpen) return null;

  const dimensions = [
    {
      name: 'Transaction Deviation',
      description: 'Deviation from user 30-day spending baseline (₹3,000 average)',
      score: breakdown?.transactionRisk ?? Math.min(100, Math.round((amount / 3000) * 15)),
      color: 'from-blue-600 to-blue-400',
    },
    {
      name: 'Recipient Association Risk',
      description: 'Directory verification, account age, syndicate blacklist matches',
      score: breakdown?.recipientRisk ?? (action === 'SAFE' ? 5 : action === 'VERIFY' ? 45 : 90),
      color: 'from-cyan-600 to-cyan-400',
    },
    {
      name: 'Behavioral Velocity Risk',
      description: 'Rapid payment attempts to unknown payees within 5-minute window',
      score: breakdown?.behaviorRisk ?? (action === 'BLOCKED' ? 85 : action === 'PAUSED' ? 70 : 15),
      color: 'from-indigo-600 to-blue-500',
    },
    {
      name: 'Social Engineering & Coercion',
      description: 'Linguistic markers: urgency, extortion, disconnection threats',
      score: breakdown?.socialEngineeringRisk ?? (message?.toLowerCase().includes('court') || message?.toLowerCase().includes('disconnect') ? 95 : 10),
      color: 'from-amber-600 to-amber-400',
    },
    {
      name: 'Network Proximity',
      description: 'Shared IP clusters, known mule accounts, device anomalies',
      score: breakdown?.networkRisk ?? (action === 'BLOCKED' ? 92 : 12),
      color: 'from-rose-600 to-rose-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-[#090E1B] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Explainability Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Rules-Based Risk Factor Breakdown
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Executive summary banner */}
        <div className="mt-5 rounded-xl border border-slate-800/80 bg-[#0B1222] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-medium">Composite Risk Verdict</span>
            <span
              className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold border tabular-nums ${
                action === 'SAFE'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : action === 'VERIFY'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : action === 'PAUSED'
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {action} · {riskScore}/100
            </span>
          </div>

          <p className="mt-2.5 text-xs text-slate-300 leading-relaxed font-normal">
            {action === 'SAFE'
              ? 'Zero red flags detected. Recipient is verified and standard behavioral parameters were met.'
              : action === 'VERIFY'
              ? 'Payee lacks bilateral transaction history. User confirmation required before releasing funds.'
              : action === 'PAUSED'
              ? 'Coercive social engineering markers detected. Mandatory 2FA step-up identity authentication enforced.'
              : 'Direct match with syndicate signatures or extortion terms. Payment hard-blocked.'}
          </p>
        </div>

        {/* Key Rationale Bullets */}
        <div className="mt-5">
          <h4 className="mb-2.5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Why Sentinel Intervened
          </h4>
          <div className="space-y-2">
            {reasons.map((reason, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-[#0B101D] p-3 text-xs text-slate-300"
              >
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-600/20 text-blue-400 font-mono text-[10px] font-bold">
                  {idx + 1}
                </div>
                <span className="leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Factor Radar / Bar Breakdown */}
        <div className="mt-6">
          <h4 className="mb-3 text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Risk Factor Breakdown (0–100)
          </h4>
          <div className="space-y-3">
            {dimensions.map((dim) => (
              <div key={dim.name} className="rounded-lg border border-slate-800/80 bg-[#0B101D] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{dim.name}</span>
                  <span className="font-mono font-semibold text-slate-300 tabular-nums">{dim.score}/100</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{dim.description}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${dim.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${dim.score}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Semantic Highlights */}
        {message && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-[#0B101D] p-3.5">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Analyzed Payment Note Semantic Scan
            </h4>
            <div className="rounded-md bg-[#070B14] p-2.5 font-mono text-xs text-slate-300 border border-slate-800/80">
              "{message}"
            </div>
          </div>
        )}

        {/* AI Reasoning — supplementary LLM signal, kept visually distinct from the
            rules-driven breakdown above. Rules alone decide action/riskLevel; this
            section only explains the bounded ±15 adjustment applied to riskScore. */}
        {llmReasoning && (
          <div className="mt-6 rounded-lg border border-violet-500/30 bg-violet-950/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-violet-300">
                <Bot className="h-3.5 w-3.5" />
                AI Reasoning
              </h4>
              {typeof llmScoreAdjustment === 'number' && (
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold border tabular-nums ${
                    llmScoreAdjustment > 0
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : llmScoreAdjustment < 0
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700/80 bg-slate-800/50 text-slate-300'
                  }`}
                >
                  {llmScoreAdjustment > 0 ? '+' : ''}
                  {llmScoreAdjustment} · AI adjustment to risk score
                </span>
              )}
            </div>
            <p className="rounded-md border border-violet-500/20 bg-[#0B0A1A] p-2.5 text-xs leading-relaxed text-slate-300">
              {llmReasoning}
            </p>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Supplementary local-model signal — the rules engine above is the sole authority on the SAFE/VERIFY/PAUSED/BLOCKED decision.
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-700/80 bg-slate-800/80 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Explainability Matrix
          </button>
        </div>
      </motion.div>
    </div>
  );
};
