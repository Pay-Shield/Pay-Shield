import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Download, Plus, ShieldCheck } from 'lucide-react';
import { Transaction, TransactionStatus } from '../../types';
import { StatusBadge, VerificationBadge } from '../common/StatusBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { Button } from '../common/Button';

interface TransactionsViewProps {
  transactions: Transaction[];
  onSelectTransaction: (txn: Transaction) => void;
  onOpenSimulator: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onSelectTransaction,
  onOpenSimulator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [riskSort, setRiskSort] = useState<'desc' | 'asc' | 'none'>('none');
  const [amountFilter, setAmountFilter] = useState<'all' | 'under1k' | '1k-10k' | 'above10k'>('all');

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((txn) => {
        // Status filter
        if (statusFilter !== 'ALL' && txn.status !== statusFilter) return false;

        // Amount filter
        if (amountFilter === 'under1k' && txn.amount >= 1000) return false;
        if (amountFilter === '1k-10k' && (txn.amount < 1000 || txn.amount > 10000)) return false;
        if (amountFilter === 'above10k' && txn.amount <= 10000) return false;

        // Search text
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = txn.recipientName.toLowerCase().includes(term);
          const matchUpi = txn.upiId.toLowerCase().includes(term);
          const matchId = txn.id.toLowerCase().includes(term);
          if (!matchName && !matchUpi && !matchId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (riskSort === 'desc') return b.riskScore - a.riskScore;
        if (riskSort === 'asc') return a.riskScore - b.riskScore;
        return 0;
      });
  }, [transactions, statusFilter, amountFilter, searchTerm, riskSort]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time pre-authorization log and Guardian security decisions
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onOpenSimulator}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-blue-600 hover:bg-blue-500"
        >
          Simulate Payment
        </Button>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#111827] space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search recipient name, UPI ID, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B1120] text-sm text-slate-200 placeholder-slate-500 pl-9 pr-4 py-2.5 rounded-lg border border-slate-700/80 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Amount and Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value as any)}
              className="bg-[#0B1120] text-xs text-slate-300 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Amounts</option>
              <option value="under1k">Under ₹1,000</option>
              <option value="1k-10k">₹1,000 – ₹10,000</option>
              <option value="above10k">Above ₹10,000</option>
            </select>

            <button
              onClick={() =>
                setRiskSort((prev) => (prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none'))
              }
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                riskSort !== 'none'
                  ? 'bg-blue-600/20 text-cyan-300 border-blue-500/40'
                  : 'bg-[#0B1120] text-slate-300 border-slate-700/80 hover:bg-slate-800'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                Risk: {riskSort === 'desc' ? 'Highest' : riskSort === 'asc' ? 'Lowest' : 'Default'}
              </span>
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 mr-1 text-[11px] uppercase font-mono">Status:</span>
          {(['ALL', 'SAFE', 'VERIFY', 'PAUSED', 'BLOCKED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#0B1120] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="ml-auto text-xs text-slate-400 font-mono">
            {filteredTransactions.length} records found
          </span>
        </div>
      </div>

      {/* Table & Responsive Cards */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-200">No matching transactions</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No records found matching your current search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-[#0B1120]/60 uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">UPI Handle</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Evaluation</th>
                  <th className="py-3.5 px-4">Decision</th>
                  <th className="py-3.5 px-4">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => onSelectTransaction(txn)}
                    className="hover:bg-[#172033]/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-400 group-hover:text-slate-300">
                      {txn.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white group-hover:text-cyan-400 transition-colors">
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
        )}
      </div>
    </div>
  );
};
