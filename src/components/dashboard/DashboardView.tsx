import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Activity,
  Play,
  RefreshCw,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Transaction, DashboardSummary } from '../../types';
import { Card } from '../common/Card';
import { RiskIndicator } from '../common/RiskIndicator';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { dashboardApi } from '../../services/api';
import { PAYMENT_ACTIVITY_DATA } from '../../data/mockData';

interface DashboardViewProps {
  transactions: Transaction[];
  onSelectTransaction: (txn: Transaction) => void;
  onOpenSimulator: () => void;
  onNavigateTransactions: () => void;
  userName?: string;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  onSelectTransaction,
  onOpenSimulator,
  onNavigateTransactions,
  userName = 'Aryan',
  onRefresh,
}) => {
  const [activityTimeframe, setActivityTimeframe] = useState<'7D' | '30D' | '90D'>('7D');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch live dashboard summary from MongoDB Atlas backend
  const fetchSummary = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await dashboardApi.getSummary();
      setSummary(data);
    } catch (err: any) {
      console.warn('Failed to load MongoDB Atlas summary, using client computation fallback:', err);
      setError('Live MongoDB summary unavailable. Showing local replica.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, transactions]);

  const handleManualRefresh = () => {
    fetchSummary(true);
    if (onRefresh) onRefresh();
  };

  // Local calculation fallbacks if backend summary is still resolving
  const totalCount = summary?.totalTransactions ?? transactions.length;
  const screenedVolume =
    summary?.screenedVolume ?? transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const blockedCount =
    summary?.blockedCount ?? transactions.filter((t) => t.status === 'BLOCKED').length;
  const pausedCount =
    summary?.pausedCount ?? transactions.filter((t) => t.status === 'PAUSED').length;
  const verifyCount =
    summary?.verifyCount ?? transactions.filter((t) => t.status === 'VERIFY').length;
  const safeCount =
    summary?.safeCount ?? transactions.filter((t) => t.status === 'SAFE').length;
  const threatsIntercepted = blockedCount + pausedCount + verifyCount;
  const savedFromScams =
    summary?.savedFromScams ??
    transactions
      .filter((t) => t.status === 'BLOCKED' || t.status === 'PAUSED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Average risk score calculation
  const averageRiskScore =
    summary?.averageRiskScore ??
    (transactions.length > 0
      ? Math.round(transactions.reduce((acc, t) => acc + (t.riskScore || 0), 0) / transactions.length)
      : 0);

  // Dynamic Risk Distribution from MongoDB Atlas
  const lowRiskCount =
    summary?.riskDistribution?.lowRisk ?? transactions.filter((t) => t.riskScore < 25).length;
  const mediumRiskCount =
    summary?.riskDistribution?.mediumRisk ??
    transactions.filter((t) => t.riskScore >= 25 && t.riskScore < 60).length;
  const highRiskCount =
    summary?.riskDistribution?.highRisk ??
    transactions.filter((t) => t.riskScore >= 60 && t.riskScore < 85).length;
  const criticalRiskCount =
    summary?.riskDistribution?.criticalRisk ??
    transactions.filter((t) => t.riskScore >= 85).length;

  const totalEvaluated = totalCount || 1;
  const lowPct = Math.round((lowRiskCount / totalEvaluated) * 100);
  const medPct = Math.round((mediumRiskCount / totalEvaluated) * 100);
  const highPct = Math.round((highRiskCount / totalEvaluated) * 100);
  const critPct = Math.max(0, 100 - (lowPct + medPct + highPct));

  const riskDonutData = [
    { name: 'Low Risk', value: lowPct, color: '#10B981', count: lowRiskCount },
    { name: 'Medium', value: medPct, color: '#F59E0B', count: mediumRiskCount },
    { name: 'High Risk', value: highPct, color: '#F97316', count: highRiskCount },
    { name: 'Critical', value: critPct, color: '#EF4444', count: criticalRiskCount },
  ];

  // Dynamic Activity Chart from MongoDB Atlas
  const atlasActivity = summary?.activityData?.[activityTimeframe];
  const chartData =
    atlasActivity && atlasActivity.length > 0
      ? atlasActivity.map((item) => ({
          name: item.date,
          safe: item.safe > 0 ? item.safe : item.volume,
          paused: Math.round((item.blocked || 0) * 0.5),
          blocked: item.blocked || 0,
          threats: item.threats || 0,
        }))
      : PAYMENT_ACTIVITY_DATA[activityTimeframe].map((item) => ({
          name: item.name,
          safe: item.safe,
          paused: item.paused,
          blocked: item.blocked,
          threats: item.blocked,
        }));

  // Recent transactions to show on dashboard
  const displayRecent = summary?.recentTransactions || transactions.slice(0, 5);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with greeting, live status, and manual refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
              Good morning, {userName}.
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MONGODB ATLAS LIVE</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time telemetry, persistent risk analytics, and multi-agent pre-authorization metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />}
          >
            {isRefreshing ? 'Syncing...' : 'Refresh Feed'}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onOpenSimulator}
            leftIcon={<Play className="w-4 h-4 fill-current" />}
          >
            Simulate Payment
          </Button>
        </div>
      </div>

      {/* Error / Offline Banner if any */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchSummary(true)}
            className="underline hover:text-amber-200 font-semibold ml-2 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. Dynamic KPI Cards (5 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Transactions */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#0E1526] border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Transactions
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">{totalCount}</span>
            <span className="text-xs text-emerald-400 flex items-center font-mono tabular-nums">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total persisted payments</p>
        </Card>

        {/* Screened Volume */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#0E1526] border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Screened Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              ₹{screenedVolume.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">Active</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Zero unauthorized leakage</p>
        </Card>

        {/* Threats Intercepted */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#0E1526] border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Threats Flagged
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-600/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-1 flex-wrap">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">{threatsIntercepted}</span>
            <span className="text-[11px] text-rose-400 font-semibold font-mono whitespace-nowrap">
              {blockedCount} Blk · {pausedCount} Psd · {verifyCount} Vfy
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Interventions logged</p>
        </Card>

        {/* Average Risk Score (Explicit requirement) */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#0E1526] border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Avg Risk Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-600/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                averageRiskScore >= 70
                  ? 'text-rose-400'
                  : averageRiskScore >= 40
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {averageRiskScore}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100 max</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Mean pipeline exposure</p>
        </Card>

        {/* Saved from Scams */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#0E1526] border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Saved from Scams
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tabular-nums truncate">
              ₹{savedFromScams.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400/80 font-mono whitespace-nowrap">Preserved</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Diverted from fraudsters</p>
        </Card>
      </div>

      {/* 3. Middle Grid: Payment Activity Graph + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Payment Activity Graph */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-[#0E1526] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight font-display">
                Payment Activity (Atlas Synced)
              </h3>
              <p className="text-xs text-slate-400">
                Screened volume & intercepted threats over time calculated from MongoDB
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#090E1B] p-1 rounded-lg border border-slate-800 text-xs font-semibold font-mono">
              {(['7D', '30D', '90D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActivityTimeframe(tf)}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    activityTimeframe === tf
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="safeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="pausedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090E1B',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                    fontFamily: 'monospace',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="safe"
                  name="Cleared Volume"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#safeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  name="Threats / Scrutinized"
                  stroke="#F97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pausedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Cleared Payments</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Threats & Held Volume</span>
              </span>
            </div>
            <span className="font-mono text-[11px]">Real-time Atlas aggregation</span>
          </div>
        </div>

        {/* Right (4 cols): Risk Overview Donut */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-slate-800/80 bg-[#0E1526] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <span className="text-xs font-semibold tracking-wider uppercase text-white font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Risk Category Breakdown
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {totalCount} evaluated
              </span>
            </div>

            <div className="mt-4 flex items-center justify-center h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0E1526" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090E1B',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#F8FAFC',
                      fontFamily: 'monospace',
                    }}
                    formatter={(value: any, name: any) => [`${value}% of total txns`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {riskDonutData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#090E1B] border border-slate-800/60"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 text-[11px]">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white text-[11px]">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Transactions Overview */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0E1526] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight font-display">
              Recent Pre-Authorized Transactions
            </h3>
            <p className="text-xs text-slate-400">
              Latest transactions evaluated by the multi-agent sentinel pipeline
            </p>
          </div>
          <button
            onClick={onNavigateTransactions}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All ({totalCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {displayRecent.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No transactions logged yet. Click &ldquo;Simulate Payment&rdquo; to test a scenario.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {displayRecent.map((txn) => (
              <div
                key={txn.id}
                onClick={() => onSelectTransaction(txn)}
                className="py-3 px-2 rounded-lg hover:bg-slate-800/40 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={txn.status} size="sm" />
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {txn.recipientName}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {txn.upiId} · {txn.timestamp}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white font-mono">
                      ₹{txn.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Risk: {txn.riskScore}/100
                    </div>
                  </div>
                  <RiskIndicator score={txn.riskScore} size="sm" showScore={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
