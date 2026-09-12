import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Plus, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Transaction, TransactionStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { RiskIndicator } from '../common/RiskIndicator';
import { Button } from '../common/Button';

interface TransactionsViewProps {
  transactions: Transaction[];
  onSelectTransaction: (txn: Transaction) => void;
  onOpenSimulator: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onSelectTransaction,
  onOpenSimulator,
  isLoading = false,
  error = null,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [riskSort, setRiskSort] = useState<'desc' | 'asc' | 'none'>('none');
  const [amountFilter, setAmountFilter] = useState<'all' | 'under1k' | '1k-10k' | 'above10k'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

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
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
              Transactions
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>{transactions.length} PERSISTED</span>
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time pre-authorization log and Guardian security decisions synced with MongoDB Atlas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? 'animate-spin text-blue-400' : ''}`} />}
            >
              {isRefreshing || isLoading ? 'Syncing...' : 'Refresh'}
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={onOpenSimulator}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Simulate Payment
          </Button>
        </div>
      </div>

      {/* Error Message if any */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{error}</span>
          </div>
          {onRefresh && (
            <button onClick={handleRefresh} className="underline hover:text-amber-100 font-semibold cursor-pointer">
              Retry
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0E1526] space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search recipient name, UPI ID, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#090E1B] text-sm text-slate-200 placeholder-slate-500 pl-9 pr-4 py-2.5 rounded-lg border border-slate-700/80 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Amount and Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value as any)}
              className="bg-[#090E1B] text-xs text-slate-300 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
            >
              <option value="all">All Amounts</option>
              <option value="under1k">Under ₹1,000</option>
              <option value="1k-10k">₹1,000 – ₹10,000</option>
              <option value="above10k">Above ₹10,000</option>
            </select>

            <button
              onClick={() => {
                if (riskSort === 'none') setRiskSort('desc');
                else if (riskSort === 'desc') setRiskSort('asc');
                else setRiskSort('none');
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                riskSort !== 'none'
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                  : 'bg-[#090E1B] border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
              title="Sort by risk score"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                {riskSort === 'none' ? 'Risk' : riskSort === 'desc' ? 'Risk High' : 'Risk Low'}
              </span>
            </button>
          </div>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-mono mr-1">Status:</span>
          {(['ALL', 'SAFE', 'VERIFY', 'PAUSED', 'BLOCKED'] as const).map((status) => {
            const isSelected = statusFilter === status;
            const count =
              status === 'ALL'
                ? transactions.length
                : transactions.filter((t) => t.status === status).length;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#090E1B] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && transactions.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-slate-800 bg-[#0E1526]/50">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Loading transactions from MongoDB Atlas...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving persistent ledger records</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center rounded-xl border border-dashed border-slate-800 bg-[#0E1526]/40">
          <p className="text-sm font-semibold text-slate-300">No transactions match the selected criteria</p>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search or adjusting active filters.</p>
        </div>
      ) : (
        /* Transactions Table / List */
        <div className="rounded-xl border border-slate-800/80 bg-[#0E1526] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0A0F1D] text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payee</th>
                  <th className="py-3 px-4">UPI Handle</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredTransactions.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => onSelectTransaction(txn)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={txn.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {txn.recipientName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{txn.id}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {txn.upiId}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      ₹{txn.amount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <RiskIndicator score={txn.riskScore} size="sm" showScore={false} />
                        <span className="text-xs font-mono text-slate-300">{txn.riskScore}/100</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {txn.timestamp}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTransaction(txn);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
