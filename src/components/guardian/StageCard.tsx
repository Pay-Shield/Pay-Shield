import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { StageStatus } from '../../types';

interface StageCardProps {
  id: string;
  stepNumber: string;
  name: string;
  icon: React.ReactNode;
  status: StageStatus;
  summary?: string;
  metric?: string;
  subtitle?: string;
  details?: string[];
  isHighlighted?: boolean;
  accentColor?: 'cyan' | 'blue' | 'purple' | 'amber' | 'emerald' | 'rose';
}

export const StageCard: React.FC<StageCardProps> = ({
  id,
  stepNumber,
  name,
  icon,
  status,
  summary,
  metric,
  subtitle,
}) => {
  const isPending = status === 'idle';
  const isRunning = status === 'running';
  const isDone = status === 'completed';
  const isFlagged = status === 'flagged';
  const isBlocked = status === 'blocked';

  // Strict color discipline & refined card treatment
  let borderClass = 'border-slate-800/80 bg-[#0C1222]/70';
  let statusBadge = (
    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
      IDLE
    </span>
  );

  if (isRunning) {
    borderClass = 'border-blue-500/80 bg-[#0F1A30] shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/40';
    statusBadge = (
      <span className="flex items-center gap-1.5 text-[11px] text-blue-400 font-mono font-semibold">
        <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
        ANALYZING
      </span>
    );
  } else if (isDone) {
    borderClass = 'border-emerald-500/30 bg-[#0A181C]/40';
    statusBadge = (
      <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono font-medium">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        CLEARED
      </span>
    );
  } else if (isFlagged) {
    borderClass = 'border-amber-500/40 bg-[#1A1408]/40';
    statusBadge = (
      <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono font-medium">
        <AlertTriangle className="h-3 w-3 text-amber-400" />
        FLAGGED
      </span>
    );
  } else if (isBlocked) {
    borderClass = 'border-rose-500/50 bg-[#1C0D11]/40';
    statusBadge = (
      <span className="flex items-center gap-1.5 text-[11px] text-rose-400 font-mono font-medium">
        <XCircle className="h-3 w-3 text-rose-400" />
        BLOCKED
      </span>
    );
  }

  return (
    <motion.div
      id={id}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-xl border p-4 transition-all duration-300 scroll-mt-28 ${borderClass}`}
    >
      {/* Top row: step number + icon + name + status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              isRunning
                ? 'border-blue-400/50 bg-blue-500/20 text-blue-300'
                : isDone
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : isFlagged
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : isBlocked
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                : 'border-slate-800 bg-slate-800/50 text-slate-400'
            }`}
          >
            {icon}
          </div>

          <div>
            <span className="block font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {stepNumber}
            </span>
            <h4 className="text-sm font-semibold text-slate-100 tracking-tight">{name}</h4>
          </div>
        </div>

        <div>{statusBadge}</div>
      </div>

      {/* Subtitle / context description */}
      {subtitle && isPending && (
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">{subtitle}</p>
      )}

      {/* Live running progress bar — ONLY active step pulses */}
      {isRunning && (
        <div className="mt-3 space-y-1.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full bg-blue-500"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-[11px] font-mono text-blue-300">
            {summary || 'Evaluating rules...'}
          </p>
        </div>
      )}

      {/* Completed Summary & Metric */}
      {(isDone || isFlagged || isBlocked) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <p className="text-slate-300 line-clamp-1 pr-2 text-[11px] leading-tight font-normal">
            {summary || 'Completed with verified signals'}
          </p>
          {metric && (
            <span className="font-mono text-[10px] font-semibold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0">
              {metric}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
