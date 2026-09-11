import React, { useState } from 'react';
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
} from 'lucide-react';
import { SecurityAlert, Transaction, ScamCheckResult, Recipient } from '../../types';
import { AlertBadge, VerificationBadge } from '../common/StatusBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { Button } from '../common/Button';
import { Textarea } from '../common/Input';
import { paymentApiService } from '../../services/api';

interface FraudAndAlertsViewProps {
  alerts: SecurityAlert[];
  transactions: Transaction[];
  recipients: Recipient[];
  onSelectTransaction: (txn: Transaction) => void;
  onVerifyRecipient: (recipient: Recipient) => void;
}

export const FraudAndAlertsView: React.FC<FraudAndAlertsViewProps> = ({
  alerts,
  transactions,
  recipients,
  onSelectTransaction,
  onVerifyRecipient,
}) => {
  // Scam Check Tool State
  const [scamInput, setScamInput] = useState(
    'Your account will be blocked today. Send ₹20,000 immediately to 9876543210@paytm or face power disconnection.'
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scamResult, setScamResult] = useState<ScamCheckResult | null>(null);

  // Filter for alerts
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO'>('ALL');

  const handleRunScamCheck = async () => {
    if (!scamInput.trim()) return;
    setIsScanning(true);
    const result = await paymentApiService.checkScamMessage(scamInput);
    setTimeout(() => {
      setScamResult(result);
      setIsScanning(false);
    }, 600);
  };

  const filteredAlerts = alerts.filter(
    (a) => selectedSeverity === 'ALL' || a.severity === selectedSeverity
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Top Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
          Fraud & Alerts
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Scam interception telemetry, active threat signals, and recipient trust verification
        </p>
      </div>

      {/* Top 5 KPI Cards (Section 28) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            High-Risk Txns
          </span>
          <div className="mt-2 text-2xl font-bold text-white">2</div>
          <span className="text-[10px] text-orange-400">Requires scrutiny</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Scam Attempts
          </span>
          <div className="mt-2 text-2xl font-bold text-white">19</div>
          <span className="text-[10px] text-rose-400">Coercion detected</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Flagged Payees
          </span>
          <div className="mt-2 text-2xl font-bold text-white">1</div>
          <span className="text-[10px] text-amber-400">Blacklisted VPA</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Payments Paused
          </span>
          <div className="mt-2 text-2xl font-bold text-white">1</div>
          <span className="text-[10px] text-cyan-400">Held for review</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Payments Blocked
          </span>
          <div className="mt-2 text-2xl font-bold text-white">1</div>
          <span className="text-[10px] text-rose-400">Hard blocked</span>
        </div>
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
