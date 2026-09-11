import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Transaction, TransactionStatus } from '../../types';
import { Modal } from '../common/Modal';
import { RiskIndicator } from '../common/RiskIndicator';
import { StatusBadge, VerificationBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: 'verify' | 'cancel' | 'override', txn: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onAction,
}) => {
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  useEffect(() => {
    if (isOpen && transaction) {
      setActiveStepIdx(0);
      const timer = setInterval(() => {
        setActiveStepIdx((prev) => {
          if (prev < transaction.investigationSteps.length) {
            return prev + 1;
          }
          clearInterval(timer);
          return prev;
        });
      }, 350);
      return () => clearInterval(timer);
    }
  }, [isOpen, transaction]);

  if (!transaction) return null;

  const breakdownItems = [
    { label: 'Transaction Risk', val: transaction.riskBreakdown.transactionRisk },
    { label: 'Recipient Risk', val: transaction.riskBreakdown.recipientRisk },
    { label: 'Behavior Risk', val: transaction.riskBreakdown.behaviorRisk },
    { label: 'Social Engineering', val: transaction.riskBreakdown.socialEngineeringRisk },
    { label: 'Network Risk', val: transaction.riskBreakdown.networkRisk },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={`Transaction Inspection — ${transaction.id}`}
      subtitle={`Initiated ${transaction.timestamp} • Evaluated in ${transaction.analysisDurationSeconds}s`}
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-white tracking-tight">
                {transaction.currency}{transaction.amount.toLocaleString()}
              </span>
              <StatusBadge status={transaction.status} />
            </div>
            <div className="text-xs text-slate-400">
              To <span className="text-slate-200 font-semibold">{transaction.recipientName}</span> ({transaction.upiId})
            </div>
            {transaction.message && (
              <div className="mt-1 text-xs text-slate-400 italic">
                Remark: "{transaction.message}"
              </div>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Trust Tier</span>
            <VerificationBadge level={transaction.verificationLevel} size="sm" />
          </div>
        </div>

        {/* Risk Score & Vector Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Big Score Card */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-xl bg-[#0B1120] border border-slate-800">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Composite Risk Score
            </span>
            <RiskIndicator
              score={transaction.riskScore}
              level={transaction.riskLevel}
              size="lg"
              animate={false}
            />
          </div>

          {/* Breakdown Vector Bars */}
          <div className="md:col-span-7 p-5 rounded-xl bg-[#0B1120] border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Risk Dimensions Breakdown
            </span>
            <div className="space-y-2.5">
              {breakdownItems.map((b) => (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{b.label}</span>
                    <span className="font-mono font-bold text-slate-200">{b.val} / 100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        b.val >= 75
                          ? 'bg-rose-500'
                          : b.val >= 50
                          ? 'bg-orange-500'
                          : b.val >= 25
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${b.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Guardian Investigation Timeline */}
        <div className="p-5 rounded-xl bg-[#0B1120] border border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Guardian Security Investigation Timeline
              </span>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              Analysis completed in {transaction.analysisDurationSeconds} seconds
            </span>
          </div>

          <div className="space-y-3 relative pl-2">
            {transaction.investigationSteps.map((step, idx) => {
              const isVisible = idx <= activeStepIdx;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: isVisible ? 1 : 0.3, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-3 text-xs"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      step.status === 'flagged'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {step.status === 'flagged' ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{step.step}</span>
                      <span className="text-[11px] font-mono text-slate-400">{step.timestamp}</span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{step.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Explainability: Why did PAYSHIELD Intervene? */}
        <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">
              WHY DID PAYSHIELD INTERVENE?
            </h4>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {transaction.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Policy Decision Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Policy Enforcement: <span className="text-white font-semibold">{transaction.status}</span>
          </div>

          <div className="flex items-center gap-3">
            {transaction.status === 'SAFE' && (
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            )}

            {transaction.status === 'VERIFY' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction?.('cancel', transaction)}
                  className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                >
                  Cancel Payment
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAction?.('verify', transaction)}
                >
                  Verify Recipient
                </Button>
              </>
            )}

            {transaction.status === 'PAUSED' && (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onAction?.('cancel', transaction)}
                >
                  Cancel Payment
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onAction?.('verify', transaction)}
                >
                  Verify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction?.('override', transaction)}
                  className="text-amber-400 border-amber-500/30"
                >
                  Override & Send
                </Button>
              </>
            )}

            {transaction.status === 'BLOCKED' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-slate-300"
                >
                  Acknowledge & Close
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    alert('Fraud report submitted to NPCI cyber cell.');
                    onClose();
                  }}
                >
                  Report Syndicate
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
