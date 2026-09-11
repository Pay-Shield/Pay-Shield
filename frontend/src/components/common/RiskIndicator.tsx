import React, { useEffect, useState } from 'react';
import { RiskLevel } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';

interface RiskIndicatorProps {
  score: number; // 0 - 100
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  animate?: boolean;
  className?: string;
}

export const getRiskConfig = (level: RiskLevel) => {
  switch (level) {
    case 'SAFE':
      return {
        label: 'SAFE',
        fullLabel: '🟢 SAFE',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        strokeColor: '#10B981',
        icon: ShieldCheck,
      };
    case 'WARNING':
      return {
        label: 'WARNING',
        fullLabel: '🟡 WARNING',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        strokeColor: '#F59E0B',
        icon: AlertTriangle,
      };
    case 'HIGH':
      return {
        label: 'HIGH RISK',
        fullLabel: '🟠 HIGH RISK',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        badgeBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        strokeColor: '#F97316',
        icon: AlertCircle,
      };
    case 'CRITICAL':
      return {
        label: 'CRITICAL RISK',
        fullLabel: '🔴 CRITICAL RISK',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30',
        badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        strokeColor: '#EF4444',
        icon: ShieldAlert,
      };
  }
};

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  score,
  level,
  size = 'md',
  showDetails = true,
  animate = true,
  className = '',
}) => {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const config = getRiskConfig(level);
  const Icon = config.icon;

  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }
    let current = 0;
    const step = Math.max(1, Math.ceil(score / 35));
    const timer = setInterval(() => {
      current += step;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(current);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [score, animate]);

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-semibold ${config.badgeBg} ${className}`}>
        <span>{config.fullLabel}</span>
        <span className="opacity-75">({displayScore})</span>
      </div>
    );
  }

  if (size === 'lg') {
    const circumference = 2 * Math.PI * 46;
    const strokeDashoffset = circumference - (circumference * displayScore) / 100;

    return (
      <div className={`flex flex-col items-center justify-center p-6 rounded-xl border bg-[#111827]/80 backdrop-blur-sm ${config.borderColor} ${className}`}>
        <div className="relative flex items-center justify-center w-36 h-36">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              className="text-slate-800"
              strokeWidth="7"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke={config.strokeColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold tracking-tight text-white">{displayScore}</span>
            <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">/ 100</span>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 text-center">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.badgeBg}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{config.fullLabel}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border bg-[#111827] ${config.borderColor} ${className}`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.bgColor} ${config.color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white">{config.fullLabel}</span>
          <span className="text-sm font-bold text-slate-200">{displayScore} / 100</span>
        </div>
        <div className="w-full h-1.5 mt-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${displayScore}%`, backgroundColor: config.strokeColor }}
          />
        </div>
      </div>
    </div>
  );
};
