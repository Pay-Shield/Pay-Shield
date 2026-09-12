import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Database,
  ShieldAlert,
  Copy,
  Loader2,
} from 'lucide-react';
import { SavedScenario, scenariosApi } from '../../services/api';

interface AddScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioAdded: (scenario: SavedScenario) => void;
  initialValues?: {
    recipientName: string;
    upiId: string;
    amount: number;
    message: string;
  };
}

export const AddScenarioModal: React.FC<AddScenarioModalProps> = ({
  isOpen,
  onClose,
  onScenarioAdded,
  initialValues,
}) => {
  const [label, setLabel] = useState('');
  const [outcomeType, setOutcomeType] = useState<'SAFE' | 'VERIFY' | 'PAUSED' | 'BLOCKED'>('SAFE');
  const [recipientName, setRecipientName] = useState(initialValues?.recipientName || '');
  const [upiId, setUpiId] = useState(initialValues?.upiId || '');
  const [amount, setAmount] = useState<number>(initialValues?.amount || 5000);
  const [message, setMessage] = useState(initialValues?.message || '');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && initialValues) {
      if (!recipientName) setRecipientName(initialValues.recipientName);
      if (!upiId) setUpiId(initialValues.upiId);
      if (!amount) setAmount(initialValues.amount);
      if (!message) setMessage(initialValues.message);
    }
  }, [isOpen, initialValues]);

  const handleCopyFromForm = () => {
    if (initialValues) {
      setRecipientName(initialValues.recipientName);
      setUpiId(initialValues.upiId);
      setAmount(initialValues.amount);
      setMessage(initialValues.message);
      if (!label) {
        setLabel(`${initialValues.recipientName} Test Vector`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Please provide a scenario name or title.');
      return;
    }
    if (!recipientName.trim()) {
      setError('Please provide a recipient name.');
      return;
    }
    if (!upiId.trim()) {
      setError('Please provide a payee UPI ID.');
      return;
    }
    if (amount <= 0) {
      setError('Transfer amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await scenariosApi.create({
        label: label.trim(),
        outcomeType,
        recipientName: recipientName.trim(),
        upiId: upiId.trim(),
        amount: Number(amount),
        message: message.trim(),
        description: description.trim() || undefined,
      });

      onScenarioAdded(created);
      onClose();
      setLabel('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to save scenario to MongoDB Atlas');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-[#090E1B] p-6 text-slate-100 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/15 text-blue-400">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Add Custom Scenario
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-300">
                    MongoDB Atlas
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Persists into <code className="text-slate-300 font-mono">payshield.test_scenarios</code>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick populate action */}
          {initialValues && (
            <div className="mt-3.5 flex items-center justify-between rounded-lg border border-slate-800 bg-[#0B101D] px-3.5 py-2 text-xs">
              <span className="text-slate-400">Have values in current payment form?</span>
              <button
                type="button"
                onClick={handleCopyFromForm}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                Fill from Active Form
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
            {/* Scenario Name & Category */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  Scenario Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Urgent Power Cut Threat"
                  className="w-full rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">Expected Outcome Category</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['SAFE', 'VERIFY', 'PAUSED', 'BLOCKED'] as const).map((cat) => {
                    const isSelected = outcomeType === cat;
                    let color = 'border-slate-800 bg-[#0B101D] text-slate-400';
                    if (isSelected) {
                      if (cat === 'SAFE') color = 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 font-semibold';
                      if (cat === 'VERIFY') color = 'border-amber-500/50 bg-amber-950/40 text-amber-300 font-semibold';
                      if (cat === 'PAUSED') color = 'border-orange-500/50 bg-orange-950/40 text-orange-300 font-semibold';
                      if (cat === 'BLOCKED') color = 'border-rose-500/50 bg-rose-950/40 text-rose-300 font-semibold';
                    }
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setOutcomeType(cat)}
                        className={`rounded-md border px-1.5 py-1.5 text-center text-[10px] uppercase font-mono transition-all cursor-pointer ${color}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recipient Name & UPI ID */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  Payee Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Electricity Department Cell"
                  className="w-full rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  UPI ID / Virtual Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. urgent-disconnection@okhdfc"
                  className="w-full rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-2 font-mono text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Amount & Description */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  Transfer Amount (INR ₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="25000"
                  className="w-full rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-2 font-mono text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">Description / Vector Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Simulates utility cutoff coercion"
                  className="w-full rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Payment Message / Coercive Note */}
            <div>
              <label className="mb-1 block font-medium text-slate-300">
                Payment Note / Intent Text (Evaluated by LLM Reasoning Agent)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Immediate penalty payment required tonight or legal warrant will be issued"
                className="w-full rounded-lg border border-slate-700/80 bg-[#0B101D] px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-700/80 bg-[#0B101D] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-500/40 px-5 py-2 text-xs font-medium text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Saving to Atlas...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-3.5 w-3.5 text-white" />
                    <span>Save Scenario</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
