import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'fraud' | 'security' | 'profile';

interface AppSidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSimulator: () => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  unresolvedAlertCount?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSimulator,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  unresolvedAlertCount = 2,
}) => {
  const navItems: { id: NavTab; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'fraud', label: 'Fraud & Alerts', icon: ShieldAlert, badge: unresolvedAlertCount },
    { id: 'security', label: 'Security Center', icon: ShieldCheck },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1120] border-r border-slate-800 text-slate-300">
      {/* Top Header / Brand */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center p-0.5 shrink-0 shadow-sm shadow-blue-500/30">
            <div className="w-full h-full bg-[#0B1120] rounded-[6px] flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-white tracking-wider font-display">
                PAYSHIELD
              </span>
              <span className="text-[10px] text-cyan-400 font-mono tracking-tight">
                ACTIVE DEFENSE
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Simulator CTA Button */}
      <div className="p-3">
        <button
          onClick={() => {
            onOpenSimulator();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-xs tracking-wide transition-all ${
            isCollapsed
              ? 'bg-blue-600/20 text-cyan-400 hover:bg-blue-600/30 border border-blue-500/30 p-2'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-600/20 px-3'
          }`}
          title="Simulate Payment"
        >
          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
          {!isCollapsed && <span>Simulate Payment</span>}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-colors relative ${
                isActive
                  ? 'bg-[#172033] text-cyan-400 border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isCollapsed
                      ? 'absolute top-1 right-1 w-2 h-2 p-0 bg-rose-500'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {!isCollapsed && item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User / Logout */}
      <div className="p-3 border-t border-slate-800 mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 shrink-0 ${
          isCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        <div className="fixed top-0 bottom-0 left-0 z-30 transition-all duration-300" style={{ width: isCollapsed ? '4.5rem' : '15rem' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export const AppHeader: React.FC<{
  onOpenMobileMenu: () => void;
  onOpenSimulator: () => void;
  user: { name: string; email: string };
}> = ({ onOpenMobileMenu, onOpenSimulator, user }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Open menu"
        >
          <div className="w-5 h-4 flex flex-col justify-between">
            <span className="w-full h-0.5 bg-slate-300 rounded" />
            <span className="w-full h-0.5 bg-slate-300 rounded" />
            <span className="w-full h-0.5 bg-slate-300 rounded" />
          </div>
        </button>

        {/* Global Security Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">PROTECTION ACTIVE</span>
          <span className="sm:hidden">ACTIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Simulator CTA */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Simulate Payment</span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
          <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-cyan-300 font-bold">
            {user.name.charAt(0)}
          </div>
          <span className="hidden lg:inline text-slate-300 font-medium">{user.name}</span>
        </div>
      </div>
    </header>
  );
};
