import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  AlertOctagon,
  Ban,
  PauseCircle,
  UserCheck,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { SecurityAlert, Transaction, ScamCheckResult, Recipient } from '../../types';
import { AlertBadge, VerificationBadge } from '../common/StatusBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { Button } from '../common/Button';
import { Textarea } from '../common/Input';
import { paymentApiService, transactionsApi } from '../../services/api';

interface FraudAndAlertsViewProps {
  alerts: SecurityAlert[];
  transactions: Transaction[];
  recipients: Recipient[];
  onSelectTransaction: (txn: Transaction) => void;
  onVerifyRecipient: (recipient: Recipient) => void;
  onRefresh?: () => void;
}

export const FraudAndAlertsView: React.FC<FraudAndAlertsViewProps> = ({
  alerts,
  transactions,
  recipients,
  onSelectTransaction,
  onVerifyRecipient,
  onRefresh,
}) => {
  // Scam Check Tool State
  const [scamInput, setScamInput] = useState(
    'Your account will be blocked today. Send ₹20,000 immediately to 9876543210@paytm or face power disconnection.'
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scamResult, setScamResult] = useState<ScamCheckResult | null>(null);

  // Filter for alerts
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO'>('ALL');

  // Filter for flagged transactions (VERIFY, PAUSED, BLOCKED)
  const [flaggedFilter, setFlaggedFilter] = useState<'ALL' | 'VERIFY' | 'PAUSED' | 'BLOCKED'>('ALL');

  // Live flagged data from MongoDB Atlas
  const [liveFlagged, setLiveFlagged] = useState<Transaction[]>([]);
  const [isLoadingFlagged, setIsLoadingFlagged] = useState(false);
  const [flaggedError, setFlaggedError] = useState<string | null>(null);

  const fetchFlaggedFromAtlas = useCallback(async () => {
    setIsLoadingFlagged(true);
    setFlaggedError(null);
    try {
      const data = await transactionsApi.getFlagged();
      // Ensure only VERIFY, PAUSED, BLOCKED transactions are kept (never SAFE)
      const validFlagged = data.filter((t) => ['VERIFY', 'PAUSED', 'BLOCKED'].includes(t.status));
      setLiveFlagged(validFlagged);
    } catch (err: any) {
      console.warn('Failed to fetch flagged from MongoDB Atlas, falling back to client cache:', err);
      setFlaggedError('Could not sync with MongoDB Atlas. Showing local state.');
    } finally {
      setIsLoadingFlagged(false);
    }
  }, []);

  useEffect(() => {
    fetchFlaggedFromAtlas();
  }, [fetchFlaggedFromAtlas, transactions]);

  const handleManualRefresh = async () => {
    await fetchFlaggedFromAtlas();
    if (onRefresh) onRefresh();
  };

  const handleRunScamCheck = async () => {
    if (!scamInput.trim()) return;
    setIsScanning(true);
    const result = await paymentApiService.checkScamMessage(scamInput);
    setTimeout(() => {
      setScamResult(result);
      setIsScanning(false);
    }, 600);
  };

  // Combine liveFlagged from backend with any newly added in-memory transactions (excluding SAFE)
  const allFlaggedTransactions = React.useMemo(() => {
    const combinedMap = new Map<string, Transaction>();

    // Add local transactions that are flagged (VERIFY, PAUSED, BLOCKED)
    for (const t of transactions) {
      if (['VERIFY', 'PAUSED', 'BLOCKED'].includes(t.status)) {
        combinedMap.set(t.id, t);
      }
    }

    // Add / update with live backend flagged
    for (const t of liveFlagged) {
      if (['VERIFY', 'PAUSED', 'BLOCKED'].includes(t.status)) {
        combinedMap.set(t.id, t);
      }
    }

    // Sort descending by timestamp or risk score
    return Array.from(combinedMap.values()).sort((a, b) => {
      return (b.riskScore || 0) - (a.riskScore || 0);
    });
  }, [transactions, liveFlagged]);

  const verifyCount = allFlaggedTransactions.filter((t) => t.status === 'VERIFY').length;
  const pausedCount = allFlaggedTransactions.filter((t) => t.status === 'PAUSED').length;
  const blockedCount = allFlaggedTransactions.filter((t) => t.status === 'BLOCKED').length;
  const highRiskCount = allFlaggedTransactions.filter((t) => t.riskScore >= 60).length;
  const flaggedPayeesCount = new Set(allFlaggedTransactions.map((t) => t.upiId)).size;

  const filteredFlaggedTransactions = allFlaggedTransactions.filter((t) => {
    if (flaggedFilter === 'ALL') return true;
    return t.status === flaggedFilter;
  });

  const filteredAlerts = alerts.filter(
    (a) => selectedSeverity === 'ALL' || a.severity === selectedSeverity
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Fraud & Alerts
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>{allFlaggedTransactions.length} INTERCEPTIONS</span>
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Scam interception telemetry, flagged AI agent pipeline decisions, and recipient trust verification
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleManualRefresh}
            disabled={isLoadingFlagged}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoadingFlagged ? 'animate-spin text-rose-400' : ''}`} />}
          >
            {isLoadingFlagged ? 'Syncing...' : 'Refresh Feed'}
          </Button>
        </div>
      </div>

      {flaggedError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{flaggedError}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="underline hover:text-amber-100 font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 5 Dynamic KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            High-Risk Txns
          </span>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{highRiskCount}</div>
          <span className="text-[10px] text-orange-400">Score &ge; 60/100</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Flagged Payees
          </span>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{flaggedPayeesCount}</div>
          <span className="text-[10px] text-amber-400">Unverified / Blacklisted</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Requires Verify
          </span>
          <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">{verifyCount}</div>
          <span className="text-[10px] text-amber-300">Friction step needed</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Payments Paused
          </span>
          <div className="mt-2 text-2xl font-bold text-orange-400 font-mono">{pausedCount}</div>
          <span className="text-[10px] text-orange-300">Held for review</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Payments Blocked
          </span>
          <div className="mt-2 text-2xl font-bold text-rose-400 font-mono">{blockedCount}</div>
          <span className="text-[10px] text-rose-300">Hard blocked</span>
        </div>
      </div>

      {/* Flagged Transactions Intervention Queue */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-lg font-bold text-white tracking-tight font-display">
                Flagged Transactions Queue
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Transactions where the AI Agent Pipeline returned <span className="text-amber-400 font-semibold">VERIFY</span>, <span className="text-orange-400 font-semibold">PAUSED</span>, or <span className="text-rose-400 font-semibold">BLOCKED</span>. Click any transaction to review full agent reasoning & audit breakdown.
            </p>
          </div>

          {/* Outcome State Filters */}
          <div className="flex items-center gap-1.5 bg-[#0B1120] p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs font-mono">
            <button
              onClick={() => setFlaggedFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                flaggedFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Flagged ({allFlaggedTransactions.length})
            </button>
            <button
              onClick={() => setFlaggedFilter('VERIFY')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                flaggedFilter === 'VERIFY'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Verify ({verifyCount})
            </button>
            <button
              onClick={() => setFlaggedFilter('PAUSED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                flaggedFilter === 'PAUSED'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-slate-400 hover:text-orange-300'
              }`}
            >
              Paused ({pausedCount})
            </button>
            <button
              onClick={() => setFlaggedFilter('BLOCKED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                flaggedFilter === 'BLOCKED'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Blocked ({blockedCount})
            </button>
          </div>
        </div>

        {/* Flagged Transactions List */}
        {filteredFlaggedTransactions.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 bg-[#0B1120]/50">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No Flagged Transactions In This Category</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Any transactions evaluated as Verify, Paused, or Blocked by the multi-agent pipeline will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredFlaggedTransactions.map((txn) => {
              // Color styling mapping per outcome
              const isVerify = txn.status === 'VERIFY';
              const isPaused = txn.status === 'PAUSED';
              const isBlocked = txn.status === 'BLOCKED';

              const cardBorder = isVerify
                ? 'border-amber-500/40 hover:border-amber-400 bg-amber-950/15'
                : isPaused
                ? 'border-orange-500/40 hover:border-orange-400 bg-orange-950/15'
                : 'border-rose-500/40 hover:border-rose-400 bg-rose-950/15';

              const badgeColor = isVerify
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isPaused
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

              const statusIcon = isVerify ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : isPaused ? (
                <PauseCircle className="w-4 h-4 text-orange-400" />
              ) : (
                <Ban className="w-4 h-4 text-rose-400" />
              );

              return (
                <div
                  key={txn.id}
                  onClick={() => onSelectTransaction(txn)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer shadow-md hover:shadow-lg ${cardBorder}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        {statusIcon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                            {txn.status}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{txn.id}</span>
                          <span className="text-xs text-slate-400 font-mono">• {txn.timestamp}</span>
                        </div>
                        <div className="mt-1 font-bold text-sm text-white flex items-center gap-2">
                          <span>{txn.recipientName}</span>
                          <span className="text-xs font-mono text-slate-400">({txn.upiId})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-white font-mono">
                          ₹{txn.amount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Risk Score:{' '}
                          <span
                            className={`font-bold font-mono ${
                              txn.riskScore >= 80
                                ? 'text-rose-400'
                                : txn.riskScore >= 50
                                ? 'text-orange-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {txn.riskScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Status / HITL resolution tag */}
                      <div className="text-right pl-3 border-l border-slate-700/50">
                        <span className="text-[10px] uppercase font-mono tracking-wider block text-slate-400">
                          HITL Status
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            txn.hitlOutcome === 'confirmed'
                              ? 'text-emerald-400'
                              : txn.hitlOutcome === 'cancelled'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {txn.hitlOutcome === 'confirmed'
                            ? 'Verified & Confirmed'
                            : txn.hitlOutcome === 'cancelled'
                            ? 'Cancelled / Blocked'
                            : 'Pending Review'}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center text-xs font-mono text-cyan-400 group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Explainability Risk Reasons */}
                  {txn.reasons && txn.reasons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>AI Agent Explainability & Interception Signals:</span>
                      </div>
                      <div className="space-y-1">
                        {txn.reasons.map((reason, idx) => (
                          <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span className="leading-relaxed">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {txn.message && (
                    <div className="mt-2 text-xs text-slate-400 italic bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                      Remark: &ldquo;{txn.message}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 34: SCAM CHECK TOOL */}
      <div className="rounded-2xl border border-blue-500/30 bg-[#111827] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-cyan-400 flex items-center justify-center">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">SCAM CHECK</h3>
              <p className="text-xs text-slate-400">
                Paste any suspicious payment message, SMS, WhatsApp, or email to inspect psychological pressure & extortion patterns
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
            HEURISTIC SCANNER
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Side */}
          <div className="lg:col-span-7 space-y-4">
            <Textarea
              label="Suspicious Payment Request or Message"
              rows={3}
              value={scamInput}
              onChange={(e) => setScamInput(e.target.value)}
              placeholder="e.g. Electricity bill unpaid, pay immediately or account will be disconnected..."
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setScamInput(
                      'Your account will be blocked today. Send ₹20,000 immediately.'
                    )
                  }
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Load Example 1
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() =>
                    setScamInput(
                      'Dear customer, KYC expired on bank app. Update at bit.ly/kyc-pay or ₹5,000 penalty.'
                    )
                  }
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Load Example 2
                </button>
              </div>

              <Button
                variant="primary"
                size="md"
                isLoading={isScanning}
                onClick={handleRunScamCheck}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
              >
                Scan Message
              </Button>
            </div>
          </div>

          {/* Result Side */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0B1120] p-5 flex flex-col justify-between">
            {scamResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400">Scam Risk</span>
                  <RiskIndicator
                    score={scamResult.scamRiskScore}
                    level={scamResult.riskLevel}
                    size="sm"
                    animate={false}
                  />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                    Detected Indicators:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <span className={scamResult.signalsDetected.urgency ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                      {scamResult.signalsDetected.urgency ? '✓' : '—'} Urgency
                    </span>
                    <span className={scamResult.signalsDetected.impersonation ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                      {scamResult.signalsDetected.impersonation ? '✓' : '—'} Impersonation
                    </span>
                    <span className={scamResult.signalsDetected.threat ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                      {scamResult.signalsDetected.threat ? '✓' : '—'} Threat / Coercion
                    </span>
                    <span className={scamResult.signalsDetected.paymentPressure ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                      {scamResult.signalsDetected.paymentPressure ? '✓' : '—'} Payment Pressure
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#111827] border border-slate-800 text-xs">
                  <span className="font-bold text-amber-400 block mb-1">Recommendation:</span>
                  <p className="text-slate-300 leading-relaxed font-medium">
                    {scamResult.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400">
                <FileSearch className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs">Click "Scan Message" to run real-time scam threat analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Section: Security Alerts & Recipient Verification Levels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Security Alerts (Section 31) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Security Alerts</h3>
              <p className="text-xs text-slate-400">Click any alert to inspect the flagged transaction</p>
            </div>

            {/* Severity filter */}
            <div className="flex items-center gap-1 text-[11px] bg-[#0B1120] p-1 rounded-lg border border-slate-800">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    selectedSeverity === sev ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const matchedTxn = alert.transactionId
                ? transactions.find((t) => t.id === alert.transactionId)
                : undefined;

              return (
                <div
                  key={alert.id}
                  onClick={() => matchedTxn && onSelectTransaction(matchedTxn)}
                  className={`p-4 rounded-xl border transition-all ${
                    matchedTxn
                      ? 'hover:border-slate-600 hover:bg-[#172033]/60 cursor-pointer'
                      : 'opacity-90'
                  } bg-[#0B1120] border-slate-800/80`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <AlertBadge severity={alert.severity} />
                      <span className="text-xs font-mono text-slate-400">{alert.timestamp}</span>
                    </div>
                    {matchedTxn && (
                      <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-mono">
                        Inspect Txn <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{alert.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Recipient Trust Verification Levels (Section 30) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111827] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Recipient Trust Levels</h3>
                <p className="text-xs text-slate-400">Four-tier identity & reputational trust engine</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>

            <div className="space-y-3">
              {recipients.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-lg border border-slate-800 bg-[#0B1120] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate">{rec.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{rec.upiId}</div>
                    <div className="mt-1.5">
                      <VerificationBadge level={rec.trustLevel} size="sm" />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVerifyRecipient(rec)}
                    className="shrink-0 text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    Verify Recipient
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Level 4 Trusted recipients bypass pre-transaction friction for instantaneous clearing.
          </div>
        </div>
      </div>
    </div>
  );
};
