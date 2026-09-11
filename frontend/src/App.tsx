/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_ALERTS,
  INITIAL_RECIPIENTS,
  INITIAL_DEVICES,
  INITIAL_SECURITY_EVENTS,
} from './data/mockData';
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
import { SecurityCenterView } from './components/security/SecurityCenterView';
import { ProfileView } from './components/profile/ProfileView';
import { PaymentSimulatorModal } from './components/simulator/PaymentSimulatorModal';
import { TransactionDetailModal } from './components/transactions/TransactionDetailModal';
import { RecipientVerificationModal } from './components/fraud/RecipientVerificationModal';

export default function App() {
  // Navigation / Route state
  const [route, setRoute] = useState<'landing' | 'login' | 'signup' | 'app'>('landing');
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

  const handleTransactionCreated = (newTxn: Transaction) => {
    setTransactions((prev) => [newTxn, ...prev]);

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
  };

  const handleTransactionAction = (
    action: 'verify' | 'cancel' | 'override',
    txn: Transaction
  ) => {
    if (action === 'cancel') {
      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id ? { ...t, status: 'BLOCKED' } : t))
      );
      setSelectedTransaction(null);
    } else if (action === 'override') {
      setTransactions((prev) =>
        prev.map((t) => (t.id === txn.id ? { ...t, status: 'SAFE' } : t))
      );
      setSelectedTransaction(null);
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
        unresolvedAlertCount={alerts.filter((a) => !a.resolved).length}
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
          {currentTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onNavigateTransactions={() => setCurrentTab('transactions')}
              userName={user.name.split(' ')[0]}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {currentTab === 'fraud' && (
            <FraudAndAlertsView
              alerts={alerts}
              transactions={transactions}
              recipients={recipients}
              onSelectTransaction={(txn) => setSelectedTransaction(txn)}
              onVerifyRecipient={(recipient) => setSelectedRecipientForVerify(recipient)}
            />
          )}

          {currentTab === 'security' && (
            <SecurityCenterView
              recipients={recipients}
              devices={devices}
              events={securityEvents}
              protectionMode={protectionMode}
              onUpdateProtectionMode={handleUpdateProtectionMode}
              onOpenVerifyModal={(recipient) => setSelectedRecipientForVerify(recipient)}
              onRemoveDevice={handleRemoveDevice}
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

