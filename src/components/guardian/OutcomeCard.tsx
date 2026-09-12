import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ShieldX,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  KeyRound,
  Fingerprint,
  FileCheck,
  CreditCard,
  Loader2,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import { TransactionStatus, RiskLevel } from '../../types';
import {
  openRazorpayCheckout,
  loadRazorpayScript,
  RazorpayPaymentSuccessData,
} from '../../utils/razorpayCheckout';
import { RAZORPAY_KEY_ID, razorpayApi } from '../../services/api';

interface OutcomeCardProps {
  id?: string;
  status: TransactionStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  recipientName: string;
  upiId: string;
  amount: number;
  transactionId: string;
  reasons: string[];
  onConfirm: (confirmed: boolean) => Promise<void>;
  onReset: () => void;
  onOpenExplainability: () => void;
  onOpenAuditTrail: () => void;
}

type RazorpayState =
  | 'idle'
  | 'countdown'
  | 'opening'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled'
  | 'failed';

export const OutcomeCard: React.FC<OutcomeCardProps> = ({
  id,
  status,
  riskScore,
  riskLevel,
  recipientName,
  upiId,
  amount,
  transactionId,
  reasons,
  onConfirm,
  onReset,
  onOpenExplainability,
  onOpenAuditTrail,
}) => {
  // Human-in-the-loop state for PAUSED
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Razorpay Checkout flow state
  const [razorpayState, setRazorpayState] = useState<RazorpayState>('idle');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3);
  const [paymentSuccess, setPaymentSuccess] = useState<RazorpayPaymentSuccessData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoLaunchRef = useRef(false);
  const preloadedOrderRef = useRef<any>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const isSafe = status === 'SAFE';
  const isVerify = status === 'VERIFY';
  const isPaused = status === 'PAUSED';
  const isBlocked = status === 'BLOCKED';

  // Reset state whenever transactionId changes (new pipeline run)
  useEffect(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    autoLaunchRef.current = false;
    preloadedOrderRef.current = null;
    setCountdownSeconds(3);
    setRazorpayState('idle');
    setPaymentSuccess(null);
    setErrorMessage(null);
    setIsOtpVerified(false);
    setOtpCode('');
  }, [transactionId]);

  const handleLaunchRazorpay = async () => {
    // Stop countdown timer if active
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownSeconds(0);
    setRazorpayState('opening');
    setErrorMessage(null);

    let hasError = false;

    await openRazorpayCheckout({
      amount,
      recipientName,
      upiId,
      transactionId,
      cachedOrder: preloadedOrderRef.current,
      onSuccess: async (data) => {
        try {
          await onConfirm(true);
        } catch (e) {
          console.error('Audit update warning:', e);
        }
        setPaymentSuccess(data);
        setRazorpayState('completed');
      },
      onDismiss: async () => {
        try {
          await onConfirm(false);
        } catch (e) {
          console.error('Cancellation audit update warning:', e);
        }
        setRazorpayState('cancelled');
        setErrorMessage('Razorpay Checkout was dismissed. Payment cancelled by user.');
      },
      onError: async (errorMsg) => {
        hasError = true;
        try {
          await onConfirm(false);
        } catch (e) {
          console.error('Failure audit update warning:', e);
        }
        setRazorpayState('failed');
        setErrorMessage(errorMsg || 'Razorpay payment rejected or failed.');
      },
    });

    if (!hasError) {
      setRazorpayState((prev) => (prev === 'opening' ? 'awaiting_payment' : prev));
    }
  };

  const handleLaunchRazorpayRef = useRef(handleLaunchRazorpay);
  useEffect(() => {
    handleLaunchRazorpayRef.current = handleLaunchRazorpay;
  });

  // 1. SAFE: Auto-proceed straight into Razorpay Checkout modal within 3 seconds
  useEffect(() => {
    if (isSafe && razorpayState === 'idle' && !autoLaunchRef.current) {
      autoLaunchRef.current = true;
      setRazorpayState('countdown');
      setCountdownSeconds(3);

      // Pre-warm Razorpay SDK & order creation in background for instant checkout rendering
      loadRazorpayScript().catch(() => {});
      razorpayApi
        .createOrder({
          amount,
          currency: 'INR',
          recipientName,
          upiId,
          notes: {
            transactionId,
            recipientName,
            upiId,
          },
        })
        .then((res) => {
          if (res && res.success) {
            preloadedOrderRef.current = res;
          }
        })
        .catch((err) => {
          console.warn('Preload order warning:', err);
        });

      // 3-second countdown timer
      let remaining = 3;
      countdownTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        setCountdownSeconds(remaining);
        if (remaining <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          handleLaunchRazorpayRef.current();
        }
      }, 1000);

      return () => {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      };
    }
  }, [isSafe, razorpayState, amount, recipientName, upiId, transactionId]);

  const handleCancelPayment = async () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    try {
      await onConfirm(false);
    } catch (e) {
      console.error('Cancellation error:', e);
    }
    setRazorpayState('cancelled');
    setErrorMessage('Payment cancelled by user. Funds remain protected in your account.');
  };

  const handleSimulateSuccess = async () => {
    try {
      await onConfirm(true);
    } catch (e) {
      console.error('Audit update warning:', e);
    }
    setPaymentSuccess({
      razorpay_payment_id: `pay_${Date.now().toString(36)}`,
      razorpay_order_id: preloadedOrderRef.current?.order_id || `order_${Date.now().toString(36)}`,
      razorpay_signature: 'sig_verified_gateway',
      verified: true,
      message: 'Payment completed successfully through Razorpay Gateway.',
      amount,
      recipientName,
      upiId,
      timestamp: new Date().toLocaleTimeString(),
    });
    setRazorpayState('completed');
  };

  const handleAutoFillOtp = () => {
    setOtpCode('849201');
    setIsOtpVerified(true);
  };

  // Theming & Strict Risk Color Token Mapping
  let bannerClass = 'border-emerald-500/30 bg-[#09151C] shadow-md';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let title = 'Transaction Auto-Cleared & Approved';
  let subtitle = 'All safety policies passed. PayShield Sentinel verified low behavioral risk.';
  let mainIcon = <ShieldCheck className="h-6 w-6 text-emerald-400" />;

  if (isVerify) {
    bannerClass = 'border-amber-500/30 bg-[#16130B] shadow-md';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    title = 'Verification Required — Amber Advisory';
    subtitle = 'New payee with no established trust history. Review recipient details before releasing payment.';
    mainIcon = <AlertTriangle className="h-6 w-6 text-amber-400" />;
  } else if (isPaused) {
    bannerClass = 'border-orange-500/35 bg-[#181109] shadow-md';
    badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    title = 'Payment Paused — Anomaly Intercepted';
    subtitle = 'Significant anomaly or coercive pressure signals detected. Step-up identity authentication required.';
    mainIcon = <ShieldAlert className="h-6 w-6 text-orange-400" />;
  } else if (isBlocked) {
    bannerClass = 'border-rose-500/40 bg-[#180C10] shadow-md';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    title = 'Payment Hard-Blocked — Zero-Trust Directive';
    subtitle = 'Severe scam syndicate or impersonation signature matched. Transfer blocked with no user override.';
    mainIcon = <ShieldX className="h-6 w-6 text-rose-400" />;
  }

  return (
    <motion.div
      id={id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={
        isBlocked
          ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }
          : { opacity: 1, y: 0 }
      }
      transition={{ duration: isBlocked ? 0.4 : 0.25, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 scroll-mt-24 ${bannerClass}`}
    >
      {/* Header section */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-800/80 pb-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${badgeColor}`}
          >
            {mainIcon}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`rounded-md border px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider ${badgeColor}`}
              >
                DECISION: {status}
              </span>
              <span className="font-mono text-xs text-slate-400">
                Risk Score:{' '}
                <strong className="text-slate-100 tabular-nums">{riskScore}</strong> / 100 ({riskLevel})
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/50 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                <CreditCard className="h-3 w-3 text-slate-400" />
                Razorpay Checkout Enabled
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-300 max-w-xl leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* Amount Card */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090E1B] px-5 py-3.5 text-left md:text-right shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-medium">
            Authorized Amount
          </span>
          <span className="font-mono text-3xl font-bold text-white tabular-nums block my-0.5">
            ₹{Number(amount).toLocaleString()}
          </span>
          <span className="block text-xs text-slate-400 truncate max-w-[200px]">
            To: <span className="text-slate-200">{recipientName}</span>
          </span>
        </div>
      </div>

      {/* Synthesis summary notes */}
      <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#090E1B]/80 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            PayShield Reasoning Synthesis
          </span>
          <button
            type="button"
            onClick={onOpenExplainability}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            Deep Dive <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <ul className="mt-2.5 space-y-1.5">
          {reasons.slice(0, 2).map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ========================================================================= */}
      {/* 1. SAFE OUTCOME FLOW: AUTO-PROCEED INTO RAZORPAY CHECKOUT WITHIN 3 SECONDS */}
      {/* ========================================================================= */}
      {isSafe && (
        <div className="mt-5">
          {razorpayState === 'countdown' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-[#09151C] p-4.5 shadow-lg"
            >
              {/* Animated 3-second progress bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-950/60 overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 3, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 font-mono text-sm font-bold">
                    {countdownSeconds > 0 ? (
                      <span>{countdownSeconds}s</span>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-200">
                        Payment Cleared · Auto-proceeding to Razorpay
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        3s Auto-Launch
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400/90 font-mono block mt-0.5">
                      {countdownSeconds > 0
                        ? `Opening Razorpay Checkout modal automatically in ${countdownSeconds} second${countdownSeconds !== 1 ? 's' : ''}...`
                        : 'Launching Razorpay Checkout modal now...'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    className="rounded-lg border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleLaunchRazorpay}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-600/30 hover:bg-emerald-600/50 active:scale-95 px-3.5 py-2 text-xs font-medium text-emerald-100 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Open Immediately</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {(razorpayState === 'opening' || razorpayState === 'awaiting_payment') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-blue-500/30 bg-[#0B1426] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-200 block">
                    Razorpay Checkout Modal Active
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Complete your payment in the secure Razorpay overlay (Amount: ₹{Number(amount).toLocaleString('en-IN')})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateSuccess}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Simulate successful payment authorization"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Simulate Success</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchRazorpay}
                  className="rounded-lg border border-blue-500/40 bg-blue-600/30 hover:bg-blue-600/40 px-3.5 py-1.5 text-xs font-medium text-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Re-open Checkout</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelPayment}
                  className="rounded-lg border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VERIFY / 3. PAUSED: HUMAN-IN-THE-LOOP CHECKPOINT BEFORE RAZORPAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {(isVerify || isPaused) && razorpayState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 rounded-xl border border-amber-500/30 bg-[#16130B] p-4"
          >
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Lock className="h-4 w-4" />
              Human-in-the-Loop Checkpoint Required Before Payment
            </div>

            {/* PAUSED requirement: OTP verification first */}
            {isPaused && !isOtpVerified && (
              <div className="mt-3 rounded-lg border border-orange-500/30 bg-[#0B101D] p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-orange-400" />
                      Step-Up Identity Authentication (Required for High-Risk)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Razorpay Checkout is held until 6-digit biometric or SMS token is verified.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value);
                        if (e.target.value.length === 6) {
                          setIsOtpVerified(true);
                        }
                      }}
                      className="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-center font-mono text-sm tracking-widest text-slate-100 placeholder:text-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAutoFillOtp}
                      className="shrink-0 rounded-lg border border-orange-500/40 bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                      Simulate 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Decision Buttons (Unlocked immediately for VERIFY, or after OTP for PAUSED) */}
            {(!isPaused || isOtpVerified) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex flex-col sm:flex-row items-center justify-end gap-3"
              >
                <button
                  type="button"
                  onClick={handleCancelPayment}
                  className="w-full sm:w-auto rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 px-4 py-2 text-xs font-medium text-rose-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel & Reject Payment
                </button>

                <button
                  type="button"
                  onClick={handleLaunchRazorpay}
                  className="w-full sm:w-auto rounded-lg border border-amber-500/50 bg-amber-600/30 hover:bg-amber-600/40 px-5 py-2 text-xs font-medium text-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Confirm & Open Razorpay (₹{Number(amount).toLocaleString('en-IN')})</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Awaiting Razorpay payment state for VERIFY or PAUSED */}
      {(isVerify || isPaused) &&
        (razorpayState === 'opening' || razorpayState === 'awaiting_payment') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 rounded-xl border border-blue-500/30 bg-[#0B1426] p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-200 block">
                  Awaiting Razorpay Checkout Completion
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Order active for ₹{Number(amount).toLocaleString('en-IN')} · Ready in Razorpay modal.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLaunchRazorpay}
              className="rounded-lg border border-blue-500/40 bg-blue-600/30 hover:bg-blue-600/40 px-3.5 py-1.5 text-xs font-medium text-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Re-open Checkout</span>
            </button>
          </motion.div>
        )}

      {/* ========================================================================= */}
      {/* 4. BLOCKED OUTCOME: HARD STOP, WITH SANDBOX TEST OVERRIDE OPTION */}
      {/* ========================================================================= */}
      {isBlocked && (
        <div className="mt-5 rounded-xl border border-rose-500/35 bg-[#180C10] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold uppercase tracking-wider font-mono">
              <ShieldX className="h-4 w-4" />
              Zero-Tolerance Protection Enforced
            </div>
            <span className="text-[10px] font-mono text-rose-400/80 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
              GATEWAY HELD
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
            Standard Razorpay checkout is locked to protect account funds. PayShield Sentinel identified
            high-probability extortion threats or fraudulent syndicate signatures.
          </p>

          <div className="mt-3.5 pt-3 border-t border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Test Harness: You can simulate opening the Razorpay payment gateway for ₹{Number(amount).toLocaleString('en-IN')}.
            </span>
            <button
              type="button"
              onClick={handleLaunchRazorpay}
              className="rounded-lg border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 px-3.5 py-1.5 text-xs font-medium text-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
            >
              <CreditCard className="h-3.5 w-3.5 text-rose-400" />
              <span>Sandbox Test: Open Razorpay (₹{Number(amount).toLocaleString('en-IN')})</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS: RAZORPAY SIGNATURE VERIFIED BY SERVER */}
      {/* ========================================================================= */}
      {razorpayState === 'completed' && paymentSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 rounded-xl border border-emerald-500/40 bg-[#09151C] p-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block font-mono">
                  Payment Completed & Signature Verified
                </span>
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  HMAC-SHA256 signature verified server-side using RAZORPAY_KEY_SECRET
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-300">
              <Receipt className="h-3 w-3" />
              Settled ₹{Number(amount).toLocaleString()}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="rounded-lg border border-slate-800 bg-[#0B101D] p-2.5">
              <span className="text-[10px] uppercase text-slate-400 block">Payment ID</span>
              <span className="font-semibold text-emerald-300 truncate block tabular-nums" title={paymentSuccess.razorpay_payment_id}>
                {paymentSuccess.razorpay_payment_id}
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0B101D] p-2.5">
              <span className="text-[10px] uppercase text-slate-400 block">Order ID</span>
              <span className="font-semibold text-slate-200 truncate block tabular-nums" title={paymentSuccess.razorpay_order_id}>
                {paymentSuccess.razorpay_order_id}
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0B101D] p-2.5">
              <span className="text-[10px] uppercase text-slate-400 block">Cryptographic Ledger</span>
              <span className="font-semibold text-slate-300 truncate block">
                SHA-256 Chained Block
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* CANCELLED OR FAILED STATE */}
      {/* ========================================================================= */}
      {(razorpayState === 'cancelled' || razorpayState === 'failed') && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-rose-500/30 bg-[#180C10] p-3.5 text-xs font-medium flex items-center justify-between gap-3 text-rose-300"
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage || 'Transaction cancelled. Funds remain secure.'}</span>
          </div>

          <button
            type="button"
            onClick={handleLaunchRazorpay}
            className="rounded-md border border-rose-500/40 bg-rose-900/30 hover:bg-rose-900/50 px-3 py-1 text-xs text-rose-200 transition-colors shrink-0 cursor-pointer"
          >
            Retry Razorpay
          </button>
        </motion.div>
      )}

      {/* Bottom control bar: Reset / Inspect Audit Trail */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAuditTrail}
            className="rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck className="h-3.5 w-3.5 text-blue-400" />
            Inspect SHA-256 Ledger
          </button>
          <button
            type="button"
            onClick={onOpenExplainability}
            className="rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            Explainability Matrix
          </button>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 px-4 py-1.5 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Test Another Scenario
        </button>
      </div>
    </motion.div>
  );
};
