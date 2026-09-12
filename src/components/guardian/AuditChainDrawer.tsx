import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Hash, RefreshCw, CheckCircle2, AlertTriangle, ArrowDown } from 'lucide-react';
import { paymentApiService } from '../../services/api';
import { CryptoAuditItem } from '../../types';

interface AuditChainDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditChainDrawer: React.FC<AuditChainDrawerProps> = ({ isOpen, onClose }) => {
  const [chain, setChain] = useState<CryptoAuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    intact: boolean;
    entry_count: number;
    verified_at: string;
    details: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadChain();
    }
  }, [isOpen]);

  const loadChain = async () => {
    setLoading(true);
    try {
      const data = await paymentApiService.getAuditChain(15);
      setChain(data || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const result = await paymentApiService.verifyAuditChain();
      setVerifyResult(result);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Could not reach the audit verification endpoint.');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-800 bg-[#090E1B] p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Cryptographic Audit Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Tamper-Evident SHA-256 Chained Historical Records
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

        {/* Verification Trigger Banner */}
        <div className="mt-5 rounded-xl border border-slate-800/80 bg-[#0B1222] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Mathematical Integrity Verification
              </span>
              <p className="text-[11px] text-slate-400">
                Recalculate SHA-256 pointers across the sequence to verify zero tampering.
              </p>
            </div>

            <button
              type="button"
              disabled={verifying}
              onClick={handleVerify}
              className="shrink-0 rounded-lg border border-blue-500/40 bg-blue-600/20 hover:bg-blue-600/30 px-3.5 py-2 text-xs font-medium text-blue-300 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Verifying Hashes...' : 'Verify Chain Integrity'}
            </button>
          </div>

          {verifyError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-start gap-2"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold block">Verification Unavailable</span>
                <span className="text-[11px] text-amber-400/90">{verifyError}</span>
              </div>
            </motion.div>
          )}

          {verifyResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 rounded-lg border p-3 text-xs flex items-start gap-2 ${
                verifyResult.intact
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
              }`}
            >
              {verifyResult.intact ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div>
                <span className="font-semibold block">
                  {verifyResult.intact ? 'Audit Trail Certified Intact' : 'Chain Integrity Failure Detected'}
                </span>
                <span className={`text-[11px] ${verifyResult.intact ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                  {verifyResult.details}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Chain Block List */}
        <div className="mt-6">
          <h4 className="mb-3 text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Immutable Block Sequence
          </h4>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono">
              Fetching cryptographic blocks...
            </div>
          ) : chain.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono">
              No audit records generated yet. Run a simulated payment above.
            </div>
          ) : (
            <div className="space-y-3">
              {chain.map((block, idx) => (
                <div key={block.sequence ?? idx} className="relative">
                  <div className="rounded-lg border border-slate-800/80 bg-[#0B101D] p-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-bold text-slate-200 tabular-nums">
                          BLOCK #{block.sequence}
                        </span>
                        <span className="text-blue-400 font-semibold">{block.action}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {new Date((block.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Agent ID:</span>
                        <span className="text-slate-200">{block.agent_id}</span>
                      </div>
                      <div className="flex flex-col text-slate-400">
                        <span className="text-[10px] uppercase text-slate-500">Entry Hash (SHA-256):</span>
                        <span className="truncate text-blue-300 font-mono text-[11px]">{block.entry_hash}</span>
                      </div>
                      <div className="flex flex-col text-slate-400">
                        <span className="text-[10px] uppercase text-slate-500">Previous Block Link:</span>
                        <span className="truncate text-slate-500 font-mono text-[11px]">{block.previous_hash}</span>
                      </div>
                    </div>
                  </div>

                  {idx < chain.length - 1 && (
                    <div className="flex justify-center my-1 text-slate-700">
                      <ArrowDown className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-700/80 bg-slate-800/80 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </motion.div>
    </div>
  );
};
