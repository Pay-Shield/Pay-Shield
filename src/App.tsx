/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_ALERTS,
  INITIAL_RECIPIENTS,
  INITIAL_DEVICES,
  INITIAL_SECURITY_EVENTS,
} from './data/mockData';
import { transactionsApi } from './services/api';
import {
  Transaction,
  SecurityAlert,
  Recipient,
  TrustedDevice,
  SecurityEvent,
  ProtectionMode,
  VerificationLevel,
} from './types';
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './components/auth/AuthPages';
import { AppSidebar, AppHeader, NavTab } from './components/layout/AppLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { FraudAndAlertsView } from './components/fraud/FraudAndAlertsView';
import { ProfileView } from './components/profile/ProfileView';
import { PaymentSimulatorModal } from './components/simulator/PaymentSimulatorModal';
import { TransactionDetailModal } from './components/transactions/TransactionDetailModal';
import { RecipientVerificationModal } from './components/fraud/RecipientVerificationModal';
import { GuardianApp } from './components/guardian/GuardianApp';

export default function App() {
  // Navigation / Route state
  const [route, setRoute] = useState<'guardian' | 'landing' | 'login' | 'signup' | 'app'>('guardian');
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // App Sidebar Collapse & Mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authenticated User
  const [user, setUser] = useState<{ name: string; email: string }>({
    name: 'Aryan Chippa',
    email: 'aryan@payshield.security',
  });

  // Application Data States
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  // Replace mock seed data with real persisted transactions from MongoDB
  // Atlas, once available. Falls back to (and keeps) the mock data if the
  // backend/DB is unreachable, so the Fraud-Ops Console never renders empty.
  const refreshTransactions = async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    try {
      const real = await transactionsApi.getAll({ limit: 200 });
      if (real && real.length > 0) {
        setTransactions(real);
      }
    } catch {
      setTransactionsError('Could not reach MongoDB Atlas — showing last known data.');
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    refreshTransactions();
  }, []);
  const [alerts, setAlerts] = useState<SecurityAlert[]>(INITIAL_ALERTS);
  const [recipients, setRecipients] = useState<Recipient[]>(INITIAL_RECIPIENTS);
  const [devices, setDevices] = useState<TrustedDevice[]>(INITIAL_DEVICES);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(INITIAL_SECURITY_EVENTS);
  const [protectionMode, setProtectionMode] = useState<ProtectionMode>('STRICT');

  // Modals
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedRecipientForVerify, setSelectedRecipientForVerify] = useState<Recipient | null>(null);

  // Handlers
  const handleLoginSuccess = (userData: { name: string; email: string }) => {
    setUser(userData);
    setRoute('app');
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setRoute('landing');
  };

  const handleTransactionCreated = async (newTxn: Transaction) => {
    setTransactions((prev) => {
      const exists = prev.some((t) => t.id === newTxn.id);
      if (exists) {
        return prev.map((t) => (t.id === newTxn.id ? newTxn : t));
      }
      return [newTxn, ...prev];
    });

    // If transaction is paused or blocked, add an alert
    if (newTxn.status === 'PAUSED' || newTxn.status === 'BLOCKED') {
      const newAlert: SecurityAlert = {
        id: `ALT-${Date.now().toString().slice(-4)}`,
        title: newTxn.status === 'BLOCKED' ? 'Fraud Syndicate Intercepted' : 'Suspicious Payment Paused',
        description: `Transfer of ${newTxn.currency}${newTxn.amount.toLocaleString()} to ${newTxn.recipientName} held under ${newTxn.status} policy.`,
        severity: newTxn.status === 'BLOCKED' ? 'CRITICAL' : 'HIGH',
        timestamp: 'Just now',
        transactionId: newTxn.id,
        actionRequired: true,
        resolved: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);
    }

    // Backstop persistence — /api/transactions/analyze already saves server-side
    // for real backend calls, but the client-side fallback simulator (when the
    // backend/DB is unreachable) never reaches that code path, so persist here too.
    try {
      await transactionsApi.saveTransaction(newTxn);
      refreshTransactions();
    } catch (err) {
      console.warn('Failed to save transaction to backend:', err);
    }
  };

  const handleTransactionAction = async (
    action: 'verify' | 'cancel' | 'override',
    txn: Transaction
  ) => {
    if (action === 'cancel') {
      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id ? { ...t, status: 'BLOCKED', hitlOutcome: 'cancelled' } : t))
      );
      setSelectedTransaction(null);
      try {
        await transactionsApi.updateTransactionStatus(txn.id, 'BLOCKED', 'cancelled');
        refreshTransactions();
      } catch (e) {
        console.warn('Failed to update status in backend:', e);
      }
    } else if (action === 'override') {
      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id ? { ...t, status: 'SAFE', hitlOutcome: 'confirmed' } : t))
      );
      setSelectedTransaction(null);
      try {
        await transactionsApi.updateTransactionStatus(txn.id, 'SAFE', 'confirmed');
        refreshTransactions();
      } catch (e) {
        console.warn('Failed to update status in backend:', e);
      }
    } else if (action === 'verify') {
      const matchedRecipient = recipients.find(
        (r) => r.name.toLowerCase() === txn.recipientName.toLowerCase() || r.upiId === txn.upiId
      ) || {
        id: `REC-${Date.now()}`,
        name: txn.recipientName,
        upiId: txn.upiId,
        trustLevel: txn.verificationLevel,
        totalTransactions: 1,
        totalVolume: txn.amount,
        lastPaymentDate: 'Today',
        flaggedCount: 0,
      };
      setSelectedRecipientForVerify(matchedRecipient);
    }
  };

  const handleConfirmVerification = (recipientId: string, newLevel: VerificationLevel) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === recipientId ? { ...r, trustLevel: newLevel } : r))
    );

    // Also update any matching transactions
    if (selectedRecipientForVerify) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.upiId === selectedRecipientForVerify.upiId
            ? { ...t, verificationLevel: newLevel, status: newLevel === 'LEVEL_4_TRUSTED' ? 'SAFE' : t.status }
            : t
        )
      );
    }

    // Add security event
    const newEvent: SecurityEvent = {
      id: `EVT-${Date.now()}`,
      title: 'Recipient Trust Elevated',
      description: `${selectedRecipientForVerify?.name || 'Payee'} upgraded to ${newLevel}.`,
      timestamp: 'Just now',
      type: 'RECIPIENT_VERIFIED',
      severity: 'INFO',
    };
    setSecurityEvents((prev) => [newEvent, ...prev]);
  };

  const handleUpdateProtectionMode = (mode: ProtectionMode) => {
    setProtectionMode(mode);
    const newEvent: SecurityEvent = {
      id: `EVT-${Date.now()}`,
      title: 'Protection Policy Updated',
      description: `Active security enforcement mode adjusted to ${mode}.`,
      timestamp: 'Just now',
      type: 'POLICY_TRIGGERED',
      severity: 'INFO',
    };
    setSecurityEvents((prev) => [newEvent, ...prev]);
  };

  const handleRemoveDevice = (deviceId: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    const newEvent: SecurityEvent = {
      id: `EVT-${Date.now()}`,
      title: 'Device Access Revoked',
      description: 'Hardware certificate for remote session revoked.',
      timestamp: 'Just now',
      type: 'POLICY_TRIGGERED',
      severity: 'MEDIUM',
    };
    setSecurityEvents((prev) => [newEvent, ...prev]);
  };

  // 0. PRIMARY PAYSHIELD AI GUARDIAN PIPELINE (REDESIGNED FLOW)
  if (route === 'guardian') {
    return (
      <GuardianApp
        onSwitchToOps={() => {
          refreshTransactions();
          setRoute('app');
        }}
      />
    );
  }

  // 1. LANDING PAGE
  if (route === 'landing') {
    return (
      <LandingPage
        onLogin={() => setRoute('login')}
        onLaunchApp={() => {
          setRoute('app');
          setCurrentTab('dashboard');
        }}
        onGetStarted={() => setRoute('signup')}
      />
    );
  }

  // 2. AUTHENTICATION PAGES (LOGIN / SIGNUP)
  if (route === 'login' || route === 'signup') {
    return (
      <AuthPages
        initialMode={route}
        onSuccess={handleLoginSuccess}
        onCancel={() => setRoute('landing')}
      />
    );
  }

  // Count unhandled flagged transactions for sidebar badge
  const unresolvedAlertCount = transactions.filter(
    (t) =>
      ['VERIFY', 'PAUSED', 'BLOCKED'].includes(t.status) &&
      t.hitlOutcome !== 'confirmed' &&
      t.hitlOutcome !== 'cancelled'
  ).length;

  // 3. MAIN PROTECTED APPLICATION
  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-blue-600 selection:text-white font-sans">
      {/* Responsive Collapsible Sidebar */}
      <AppSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        unresolvedAlertCount={unresolvedAlertCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky App Header */}
        <AppHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          user={user}
        />

        {/* Dynamic View Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-950/20 px-4 py-2 text-xs text-blue-300">
            <span>Viewing Historical Fraud-Ops Console</span>
            <button
              onClick={() => setRoute('guardian')}
              className="font-semibold text-blue-200 hover:text-white underline flex items-center gap-1 cursor-pointer"
            >
              Back to AI Guardian Sentinel Flow →
            </button>
          </div>
          {currentTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onNavigateTransactions={() => setCurrentTab('transactions')}
              userName={user.name.split(' ')[0]}
              onRefresh={refreshTransactions}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              isLoading={transactionsLoading}
              error={transactionsError}
              onRefresh={refreshTransactions}
            />
          )}

          {currentTab === 'fraud' && (
            <FraudAndAlertsView
              alerts={alerts}
              transactions={transactions}
              recipients={recipients}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onVerifyRecipient={(recipient) => setSelectedRecipientForVerify(recipient)}
              onRefresh={refreshTransactions}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              user={user}
              onUpdateUser={setUser}
              protectionMode={protectionMode}
              onUpdateProtectionMode={handleUpdateProtectionMode}
              recipientsCount={recipients.length}
              devicesCount={devices.length}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Payment Simulator Modal */}
      <PaymentSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onTransactionCreated={handleTransactionCreated}
        onOpenDetails={(txn) => setSelectedTransaction(txn)}
      />

      {/* Transaction Detail & Investigation Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onAction={handleTransactionAction}
      />

      {/* Recipient Verification Modal */}
      <RecipientVerificationModal
        recipient={selectedRecipientForVerify}
        isOpen={!!selectedRecipientForVerify}
        onClose={() => setSelectedRecipientForVerify(null)}
        onConfirmVerification={handleConfirmVerification}
      />
    </div>
  );
}

