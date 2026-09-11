import React from 'react';
import { TransactionStatus, VerificationLevel, AlertSeverity } from '../../types';
import { CheckCircle2, AlertCircle, PauseCircle, Ban, ShieldCheck, ShieldAlert, Info } from 'lucide-react';

interface StatusBadgeProps {
  status: TransactionStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getProps = () => {
    switch (status) {
      case 'SAFE':
        return {
          icon: CheckCircle2,
          text: 'SAFE',
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'VERIFY':
        return {
          icon: AlertCircle,
          text: 'VERIFY',
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'PAUSED':
        return {
          icon: PauseCircle,
          text: 'PAUSED',
          className: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        };
      case 'BLOCKED':
        return {
          icon: Ban,
          text: 'BLOCKED',
          className: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };
    }
  };

  const { icon: Icon, text, className } = getProps();
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-md border tracking-wide uppercase ${padding} ${className}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{text}</span>
    </span>
  );
};

export const VerificationBadge: React.FC<{ level: VerificationLevel; size?: 'sm' | 'md' }> = ({
  level,
  size = 'md',
}) => {
  const getDetails = () => {
    switch (level) {
      case 'LEVEL_1_UNKNOWN':
        return { text: 'LEVEL 1 — UNKNOWN', bg: 'bg-slate-800 text-slate-400 border-slate-700' };
      case 'LEVEL_2_IDENTIFIED':
        return { text: 'LEVEL 2 — IDENTIFIED', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'LEVEL_3_VERIFIED':
        return { text: 'LEVEL 3 — VERIFIED', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'LEVEL_4_TRUSTED':
        return { text: 'LEVEL 4 — TRUSTED', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    }
  };

  const { text, bg } = getDetails();
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border tracking-wider uppercase ${pad} ${bg}`}>
      <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{text}</span>
    </span>
  );
};

export const AlertBadge: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  switch (severity) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <ShieldAlert className="w-3 h-3" />
          <span>CRITICAL</span>
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
          <AlertCircle className="w-3 h-3" />
          <span>HIGH</span>
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertCircle className="w-3 h-3" />
          <span>MEDIUM</span>
        </span>
      );
    case 'INFO':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <Info className="w-3 h-3" />
          <span>INFO</span>
        </span>
      );
  }
};
