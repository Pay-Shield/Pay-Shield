import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Plus,
  Trash2,
  Database,
  BookmarkPlus,
  Loader2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { SavedScenario } from '../../services/api';

interface PaymentInputFormProps {
  recipientName: string;
  setRecipientName: (val: string) => void;
  upiId: string;
  setUpiId: (val: string) => void;
  amount: number;
  setAmount: (val: number) => void;
  message: string;
  setMessage: (val: string) => void;

  // Dynamic MongoDB Atlas Scenarios
  scenarios: SavedScenario[];
  selectedScenarioId: string | null;
  onSelectScenario: (scenario: SavedScenario) => void;
  onDeleteScenario: (id: string, e: React.MouseEvent) => void;
  onOpenAddModal: () => void;
  onSaveCurrentAsScenario: () => void;
  isSavingCurrent?: boolean;
  isAtlasConnected: boolean;

  onSubmit: () => void;
  isAnalyzing: boolean;
  onOpenHowItWorks?: () => void;
}

export const PaymentInputForm: React.FC<PaymentInputFormProps> = ({
  recipientName,
  setRecipientName,
  upiId,
  setUpiId,
  amount,
  setAmount,
  message,
  setMessage,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onDeleteScenario,
  onOpenAddModal,
  onSaveCurrentAsScenario,
  isSavingCurrent = false,
  isAtlasConnected,
  onSubmit,
  isAnalyzing,
  onOpenHowItWorks,
}) => {
  const [touched, setTouched] = useState({
    recipient: false,
    upi: false,
    amount: false,
  });

  // Basic validation rules
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  const isUpiValid = upiId ? upiRegex.test(upiId) : true;
  const isAmountValid = amount > 0;
  const isRecipientValid = recipientName.trim().length > 0;

  const isFormValid = isRecipientValid && isUpiValid && isAmountValid && !!upiId;

  return (
    <div className="rounded-2xl border border-slate-800/85 bg-gradient-to-b from-[#0D1424] to-[#090E1B] p-6 shadow-lg backdrop-blur-md">
      {/* Top Bar with Trust Signal and Mode */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-800/50 px-2 py-0.5 font-mono text-[11px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Sandbox Environment · Razorpay Test Mode
          </span>
        </div>

        {onOpenHowItWorks && (
          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer font-medium"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>How This Works</span>
          </button>
        )}
      </div>

      {/* Dynamic MongoDB Atlas Test Scenarios Section */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-blue-400" />
              Test Vectors & Scenarios
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium border ${
                isAtlasConnected
                  ? 'border-slate-700/80 bg-slate-800/50 text-slate-300'
                  : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isAtlasConnected ? 'bg-blue-400' : 'bg-amber-400'
                }`}
              />
              {isAtlasConnected ? 'Atlas Synced' : 'Connecting...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveCurrentAsScenario}
              disabled={isSavingCurrent || !isFormValid}
              aria-label="Save current form inputs into MongoDB Atlas"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#131C2E] hover:bg-[#1A263E] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isSavingCurrent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5 text-blue-400" />
              )}
              <span>Save Scenario</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              aria-label="Add custom test scenario"
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 hover:bg-blue-600/30 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Custom Scenario</span>
            </button>
          </div>
        </div>

        {/* Empty state when zero scenarios exist in MongoDB Atlas */}
        {scenarios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-[#0B101D] p-4 text-center">
            <p className="text-xs font-medium text-slate-300">
              No test scenarios found in database
            </p>
            <p className="mt-1 text-[11px] text-slate-400 max-w-md mx-auto">
              Fill in the transaction details below and click{' '}
              <span className="text-blue-300 font-medium">Save Scenario</span> to persist vectors for quick testing.
            </p>
          </div>
        ) : (
          /* Render saved scenarios from MongoDB Atlas */
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {scenarios.map((scen) => {
              const isSelected = selectedScenarioId === scen.id;
              let badgeClass = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
              if (scen.outcomeType === 'VERIFY') {
                badgeClass = 'border-amber-500/30 text-amber-400 bg-amber-500/10';
              } else if (scen.outcomeType === 'PAUSED') {
                badgeClass = 'border-orange-500/30 text-orange-400 bg-orange-500/10';
              } else if (scen.outcomeType === 'BLOCKED') {
                badgeClass = 'border-rose-500/30 text-rose-400 bg-rose-500/10';
              }

              return (
                <div
                  key={scen.id}
                  className={`group relative flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500/80 bg-[#131E33] shadow-sm'
                      : 'border-slate-800/80 bg-[#0B101D] hover:border-slate-700/80 hover:bg-[#0E1526]'
                  }`}
                  onClick={() => onSelectScenario(scen)}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-100 truncate" title={scen.label}>
                      {scen.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase border ${badgeClass}`}
                      >
                        {scen.outcomeType}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => onDeleteScenario(scen.id, e)}
                        aria-label={`Delete scenario ${scen.label}`}
                        title="Delete scenario"
                        className="rounded p-1 text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <span className="mt-1.5 text-xs text-slate-300 truncate w-full font-mono tabular-nums">
                    ₹{Number(scen.amount).toLocaleString()} · {scen.recipientName}
                  </span>

                  {scen.message && (
                    <span className="mt-0.5 text-[11px] text-slate-400 truncate w-full italic">
                      "{scen.message}"
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Fields Grid with Real Form Validation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Recipient Name */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Recipient Full Name
          </label>
          <input
            type="text"
            disabled={isAnalyzing}
            value={recipientName}
            onBlur={() => setTouched((t) => ({ ...t, recipient: true }))}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className={`w-full rounded-lg border bg-[#0B101D] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors ${
              touched.recipient && !isRecipientValid
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-slate-700/80 focus:border-blue-500'
            }`}
          />
          {touched.recipient && !isRecipientValid && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Recipient name is required
            </p>
          )}
        </div>

        {/* UPI / Account ID */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Payee UPI / Account ID
          </label>
          <input
            type="text"
            disabled={isAnalyzing}
            value={upiId}
            onBlur={() => setTouched((t) => ({ ...t, upi: true }))}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="e.g. rahul@upi"
            className={`w-full rounded-lg border bg-[#0B101D] px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors ${
              touched.upi && (!upiId || !isUpiValid)
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-slate-700/80 focus:border-blue-500'
            }`}
          />
          {touched.upi && (!upiId || !isUpiValid) && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Valid UPI VPA required (e.g. handle@bank)
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Transfer Amount (INR ₹)
          </label>
          <input
            type="number"
            disabled={isAnalyzing}
            value={amount === 0 ? '' : amount}
            onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="e.g. 5000"
            min="1"
            className={`w-full rounded-lg border bg-[#0B101D] px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors ${
              touched.amount && !isAmountValid
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-slate-700/80 focus:border-blue-500'
            }`}
          />
          {touched.amount && !isAmountValid && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Amount must be greater than ₹0
            </p>
          )}
        </div>

        {/* Payment Message / Context */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Payment Note / Context
          </label>
          <input
            type="text"
            disabled={isAnalyzing}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Lunch contribution"
            className="w-full rounded-lg border border-slate-700/80 bg-[#0B101D] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 flex items-center justify-end gap-4 border-t border-slate-800/80 pt-5">
        <button
          type="button"
          disabled={isAnalyzing || !isFormValid}
          onClick={onSubmit}
          aria-label="Pay with PayShield: Screen and Pay"
          className="relative inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-500/40 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:shadow-blue-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Play className="h-4 w-4 fill-current text-white" />
          )}
          <span>
            {isAnalyzing ? 'Evaluating Multi-Agent Pipeline...' : 'Pay with PayShield (Screen & Pay)'}
          </span>
        </button>
      </div>
    </div>
  );
};
