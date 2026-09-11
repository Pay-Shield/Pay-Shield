import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Ban,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input, Textarea } from '../common/Input';
import { Button } from '../common/Button';
import { RiskIndicator } from '../common/RiskIndicator';
import { paymentApiService, buildTransactionFromSimulation } from '../../services/api';
import { AnalyzePaymentPayload, AnalyzePaymentResponse, Transaction } from '../../types';

interface PaymentSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated: (txn: Transaction) => void;
  onOpenDetails: (txn: Transaction) => void;
}

type SimStage = 'input' | 'analyzing' | 'result';

export const PaymentSimulatorModal: React.FC<PaymentSimulatorModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  onOpenDetails,
}) => {
  const [stage, setStage] = useState<SimStage>('input');

  // Form State
  const [recipientName, setRecipientName] = useState('Unknown Recipient');
  const [upiId, setUpiId] = useState('urgent.support@upi');
  const [amount, setAmount] = useState<number>(25000);
  const [message, setMessage] = useState('Urgent payment release now or account will be disconnected');

  // Analysis Animation Steps
  const [checkingStep, setCheckingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePaymentResponse | null>(null);
  const [createdTxn, setCreatedTxn] = useState<Transaction | null>(null);
  const [viaBackend, setViaBackend] = useState(false);

  // Human-in-the-loop checkpoint state (guardian-architecture.md §4 step 4:
  // Medium/High risk must not complete without an explicit user decision).
  type ConfirmState = 'none' | 'needs_confirm' | 'needs_verify_then_confirm' | 'resolving' | 'resolved';
  const [confirmState, setConfirmState] = useState<ConfirmState>('none');
  const [identityVerified, setIdentityVerified] = useState(false);
  const [resolvedOutcome, setResolvedOutcome] = useState<'completed' | 'cancelled' | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const presets = [
    {
      label: '1. Trusted Friend (Safe)',
      recipientName: 'Rahul Sharma',
      upiId: 'rahul@upi',
      amount: 1200,
      message: 'Lunch contribution',
      type: 'SAFE',
    },
    {
      label: '2. New Freelancer (Verify)',
      recipientName: 'Priya Patel',
      upiId: 'priya.freelance@icici',
      amount: 8500,
      message: 'Design project milestone 1',
      type: 'VERIFY',
    },
    {
      label: '3. Utility Threat Scam (Paused)',
      recipientName: 'Electricity Billing Cell',
      upiId: 'urgent.power@upi',
      amount: 25000,
      message: 'Immediate payment or power disconnect tonight',
      type: 'PAUSED',
    },
    {
      label: '4. Crypto Syndicate Scam (Blocked)',
      recipientName: 'High Yield Crypto Desk',
      upiId: 'invest-guaranteed@okhdfcbank',
      amount: 50000,
      message: 'Guaranteed 40% crypto return deposit',
      type: 'BLOCKED',
    },
  ];

  const applyPreset = (p: (typeof presets)[0]) => {
    setRecipientName(p.recipientName);
    setUpiId(p.upiId);
    setAmount(p.amount);
    setMessage(p.message);
  };

  const startAnalysis = async () => {
    setStage('analyzing');
    setCheckingStep(0);

    const payload: AnalyzePaymentPayload = {
      recipientName,
      upiId,
      amount: Number(amount) || 0,
      message,
    };

    // Sequential simulation animation
    // Step 0: Transaction
    // Step 1: Recipient
    // Step 2: Behavior
    // Step 3: Scam Signals
    // Step 4: Risk Score
    const timer1 = setTimeout(() => setCheckingStep(1), 350);
    const timer2 = setTimeout(() => setCheckingStep(2), 700);
    const timer3 = setTimeout(() => setCheckingStep(3), 1050);
    const timer4 = setTimeout(() => setCheckingStep(4), 1400);

    const { data: res, viaBackend: usedBackend } = await paymentApiService.analyzePayment(payload);

    setTimeout(() => {
      setAnalysisResult(res);
      setViaBackend(usedBackend);
      const newTxn = buildTransactionFromSimulation(payload, res);
      setCreatedTxn(newTxn);
      onTransactionCreated(newTxn);
      setStage('result');

      // SAFE completes automatically (guardian-architecture.md: HITL checkpoint
      // is "skipped only for Low"). BLOCKED is already terminal — no override
      // exists, so there's nothing to confirm. VERIFY/PAUSED must wait for an
      // explicit user decision below before they're considered resolved.
      if (res.action === 'VERIFY') {
        setConfirmState('needs_confirm');
      } else if (res.action === 'PAUSED') {
        setConfirmState('needs_verify_then_confirm');
      } else {
        setConfirmState('none');
      }
    }, 1800);
  };

  const handleVerifyIdentity = () => {
    setIdentityVerified(true);
  };

  const resolveTransaction = async (confirmed: boolean) => {
    if (!analysisResult) return;
    setConfirmState('resolving');
    setResolveError(null);
    try {
      if (viaBackend) {
        await paymentApiService.confirmTransaction(analysisResult.transaction_id, confirmed);
      }
      setResolvedOutcome(confirmed ? 'completed' : 'cancelled');
    } catch (e) {
      // Backend refused (e.g. re-scored as blocked between analyze and confirm) —
      // surface it plainly rather than silently pretending it succeeded.
      setResolveError(e instanceof Error ? e.message : 'Could not record your decision.');
      setResolvedOutcome('cancelled');
    } finally {
      setConfirmState('resolved');
    }
  };

  const handleReset = () => {
    setStage('input');
    setAnalysisResult(null);
    setCreatedTxn(null);
    setCheckingStep(0);
    setViaBackend(false);
    setConfirmState('none');
    setIdentityVerified(false);
    setResolvedOutcome(null);
    setResolveError(null);
  };

  const stepsList = [
    'Transaction payload format & telemetry',
    'Recipient identity & syndicate blacklist',
    'Behavioral expenditure baseline',
    'Scam & coercion linguistic signals',
    'Aggregated multi-factor risk score',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Payment Risk Simulator"
      subtitle="Test pre-transaction scam detection with live heuristic analysis"
    >
      <div className="space-y-5">
        {/* Simulation Notice Banner */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-cyan-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            SIMULATION MODE — NO REAL MONEY IS TRANSFERRED
          </span>
          <span className="text-[10px] font-mono text-slate-400">FAIR TEST HARNESS</span>
        </div>

        {/* 1. INPUT FORM STAGE */}
        {stage === 'input' && (
          <div className="space-y-4">
            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Quick Scenario Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2 rounded-lg bg-[#0B1120] hover:bg-[#172033] border border-slate-800 text-left transition-colors text-[11px]"
                  >
                    <div className="font-bold text-slate-200 truncate">{p.label}</div>
                    <div className="text-slate-400 text-[10px]">₹{p.amount.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Recipient Name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
              />
              <Input
                label="Recipient UPI ID / VPA"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@upi"
                required
              />
            </div>

            <Input
              label="Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="e.g. 5000"
              required
            />

            <Textarea
              label="Payment Message / Remark"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Electricity bill urgent settlement or dinner bill"
              rows={2}
            />

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={startAnalysis}
                rightIcon={<Play className="w-4 h-4 fill-current" />}
                className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/25 px-6"
              >
                ANALYZE PAYMENT
              </Button>
            </div>
          </div>
        )}

        {/* 2. ANALYZING STAGE */}
        {stage === 'analyzing' && (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-5 relative">
              <span className="absolute inset-0 rounded-2xl border border-cyan-400/40 animate-ping opacity-25" />
              <Sparkles className="w-8 h-8 animate-spin text-cyan-400" />
            </div>

            <h3 className="text-lg font-extrabold text-white tracking-tight font-display mb-1">
              PAYSHIELD IS CHECKING THIS PAYMENT
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Inspecting transaction payload, recipient trust graph, and linguistic coercion cues...
            </p>

            {/* Checklist */}
            <div className="w-full max-w-sm space-y-2.5 text-left">
              {stepsList.map((stepName, i) => {
                const isPassed = checkingStep > i;
                const isCurrent = checkingStep === i;

                return (
                  <div
                    key={stepName}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs transition-all ${
                      isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isCurrent
                        ? 'bg-blue-500/10 border-blue-500/30 text-cyan-300 font-semibold'
                        : 'bg-[#0B1120] border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </div>
                    <span>{stepName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. RESULT STAGE */}
        {stage === 'result' && analysisResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            {/* Outcome Banner */}
            {analysisResult.action === 'SAFE' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-emerald-400">PAYMENT CLEARED</h4>
                  <p className="text-xs text-slate-300">
                    Risk score: {analysisResult.risk_score} / 100 (SAFE). Verified recipient & spending behavior.
                  </p>
                </div>
              </div>
            )}

            {analysisResult.action === 'VERIFY' && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                <AlertCircle className="w-7 h-7 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-amber-400">PAYMENT REQUIRES VERIFICATION</h4>
                  <p className="text-xs text-slate-300">
                    Risk score: {analysisResult.risk_score} / 100 (WARNING). First-time recipient with no shared history.
                  </p>
                </div>
              </div>
            )}

            {analysisResult.action === 'PAUSED' && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
                <AlertTriangle className="w-7 h-7 text-orange-400 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-orange-400">PAYMENT PAUSED</h4>
                  <p className="text-xs text-slate-300">
                    Risk score: {analysisResult.risk_score} / 100 (HIGH RISK). Suspicious pressure tactics identified.
                  </p>
                </div>
              </div>
            )}

            {analysisResult.action === 'BLOCKED' && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
                <Ban className="w-7 h-7 text-rose-400 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-rose-400">PAYMENT BLOCKED</h4>
                  <p className="text-xs text-slate-300">
                    Risk score: {analysisResult.risk_score} / 100 (CRITICAL RISK). Matches verified fraudulent scam syndicate.
                  </p>
                </div>
              </div>
            )}

            {/* Reasons / Explainability */}
            <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Why Did PAYSHIELD Intervene?
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {analysisResult.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Human-in-the-loop checkpoint — required for VERIFY/PAUSED, per
                guardian-architecture.md §4 step 4. SAFE/BLOCKED never reach here. */}
            {confirmState === 'needs_verify_then_confirm' && !identityVerified && (
              <div className="p-4 rounded-xl bg-[#0B1120] border border-amber-500/30 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Identity Verification Required
                </h5>
                <p className="text-xs text-slate-300">
                  This payment is High risk. Complete a one-time identity check (simulated) before you can confirm or cancel it.
                </p>
                <Button variant="outline" size="sm" onClick={handleVerifyIdentity}>
                  Simulate OTP Verification
                </Button>
              </div>
            )}

            {(confirmState === 'needs_confirm' ||
              (confirmState === 'needs_verify_then_confirm' && identityVerified)) && (
              <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Your Decision Required
                </h5>
                <p className="text-xs text-slate-300">
                  PayShield will not process this payment until you explicitly confirm.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => resolveTransaction(true)}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Confirm &amp; Proceed
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => resolveTransaction(false)}>
                    Cancel Payment
                  </Button>
                </div>
              </div>
            )}

            {confirmState === 'resolving' && (
              <div className="text-xs text-slate-400">Recording your decision...</div>
            )}

            {confirmState === 'resolved' && resolvedOutcome === 'completed' && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                You confirmed this payment — recorded as completed in the audit log.
              </div>
            )}

            {confirmState === 'resolved' && resolvedOutcome === 'cancelled' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {resolveError ? `${resolveError} Payment was not processed.` : 'Payment cancelled — not processed.'}
              </div>
            )}

            {/* Actions — hidden while a decision is still pending, so a
                risky payment can't be waved through by just closing the modal. */}
            {(confirmState === 'none' || confirmState === 'resolved') && (
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Simulate Another
              </Button>

              <div className="flex items-center gap-2">
                {createdTxn && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenDetails(createdTxn);
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Full Investigation
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={onClose}>
                  Continue
                </Button>
              </div>
            </div>
            )}
          </motion.div>
        )}
      </div>
    </Modal>
  );
};
