import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Filter,
  CheckCircle2,
  Clock,
  Play,
  Search,
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
import { Transaction } from '../../types';
import { Card } from '../common/Card';
import { RiskIndicator } from '../common/RiskIndicator';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { PAYMENT_ACTIVITY_DATA } from '../../data/mockData';

interface DashboardViewProps {
  transactions: Transaction[];
  onSelectTransaction: (txn: Transaction) => void;
  onOpenSimulator: () => void;
  onNavigateTransactions: () => void;
  userName?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  onSelectTransaction,
  onOpenSimulator,
  onNavigateTransactions,
  userName = 'Aryan',
}) => {
  const [activityTimeframe, setActivityTimeframe] = useState<'7D' | '30D' | '90D'>('7D');

  const chartData = PAYMENT_ACTIVITY_DATA[activityTimeframe];

  // Risk Distribution Data
  const riskDonutData = [
    { name: 'Low Risk', value: 74, color: '#10B981' },
    { name: 'Medium', value: 17, color: '#F59E0B' },
    { name: 'High Risk', value: 7, color: '#F97316' },
    { name: 'Critical', value: 2, color: '#EF4444' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with greeting and live status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Good morning, {userName}.
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PROTECTION ACTIVE</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Your payments are protected. Continuous behavioral and recipient trust monitoring is active.
          </p>
        </div>

        {/* Quick Simulator CTA */}
        <Button
          variant="primary"
          size="md"
          onClick={onOpenSimulator}
          leftIcon={<Play className="w-4 h-4 fill-current" />}
          className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20"
        >
          Simulate Payment
        </Button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Transactions */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#111827] border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Transactions
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">1,284</span>
            <span className="text-xs text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">All outbound verified payments</p>
        </Card>

        {/* Payment Volume */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#111827] border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Payment Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-600/10 text-cyan-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">₹84,320</span>
            <span className="text-xs text-slate-400">This month</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Protected against fraudulent diversion</p>
        </Card>

        {/* Threats Blocked */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#111827] border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Threats Blocked
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-600/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">27</span>
            <span className="text-xs text-rose-400 font-semibold">100% Intercepted</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">₹1,14,500 saved from scams</p>
        </Card>

        {/* Protection Score */}
        <Card variant="surface" hoverEffect className="p-5 bg-[#111827] border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Protection Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">96%</span>
            <span className="text-xs text-slate-400">Optimal Security</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Strict policy tier active</p>
        </Card>
      </div>

      {/* 3. Middle Grid: Payment Activity Graph + Protection Pulse + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Payment Activity Graph */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Payment Activity</h3>
              <p className="text-xs text-slate-400">Protected volume & intercepted threats over time</p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#0B1120] p-1 rounded-lg border border-slate-800 text-xs font-semibold">
              {(['7D', '30D', '90D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActivityTimeframe(tf)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activityTimeframe === tf
                      ? 'bg-blue-600 text-white shadow-xs'
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
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="pausedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
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
                    backgroundColor: '#0B1120',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="safe"
                  name="Cleared Volume"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#safeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="paused"
                  name="Paused / Scrutinized"
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
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Cleared Payments</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Paused / High Risk</span>
              </span>
            </div>
            <span>Updated real-time</span>
          </div>
        </div>

        {/* Right (4 cols): Protection Pulse + Risk Overview */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 23: Protection Pulse */}
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                PROTECTION PULSE
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Last Analysis</span>
                <span className="font-mono text-slate-200">2 seconds ago</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Signals Analyzed</span>
                <span className="font-mono text-cyan-400 font-bold">14 vectors</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Threats Prevented</span>
                <span className="font-mono text-rose-400 font-bold">27</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 font-semibold">Protected</span>
              </div>
            </div>
          </div>

          {/* Section 21: Risk Overview */}
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Risk Distribution
              </h4>
              <span className="text-[11px] text-slate-400">All time</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="w-24 h-24 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDonutData}
                      innerRadius={28}
                      outerRadius={40}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low
                  </span>
                  <span className="font-mono font-bold text-slate-200">74%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium
                  </span>
                  <span className="font-mono font-bold text-slate-200">17%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> High
                  </span>
                  <span className="font-mono font-bold text-slate-200">7%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical
                  </span>
                  <span className="font-mono font-bold text-slate-200">2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section 22: Recent Transactions */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Click any payment to review Guardian investigation & evidence</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateTransactions}
            rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
          >
            View All
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#0B1120]/60 uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">UPI ID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.slice(0, 5).map((txn) => (
                <tr
                  key={txn.id}
                  onClick={() => onSelectTransaction(txn)}
                  className="hover:bg-[#172033]/60 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {txn.recipientName}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{txn.upiId}</td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {txn.currency}{txn.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <RiskIndicator
                      score={txn.riskScore}
                      level={txn.riskLevel}
                      size="sm"
                      animate={false}
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={txn.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{txn.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
