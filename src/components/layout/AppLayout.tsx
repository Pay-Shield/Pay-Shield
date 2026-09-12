import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'fraud' | 'profile';

interface AppSidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSimulator?: () => void;
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
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0A0F1D] border-r border-slate-800/80 text-slate-300 select-none relative overflow-hidden">
      {/* Top Header / Brand with Embedded Collapse Toggle */}
      <div
        className={`h-16 border-b border-slate-800/80 flex items-center transition-all ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
        }`}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center p-0.5 shrink-0 text-blue-400 shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  PayShield
                </span>
                <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase truncate">
                  Zero-Trust Defense
                </span>
              </div>
            </div>

            {/* Embedded Desktop Collapse Toggle Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex w-7 h-7 rounded-lg bg-[#0E1526] border border-slate-700/70 hover:border-blue-500/50 hover:bg-blue-600/15 text-slate-400 hover:text-blue-300 shadow-sm items-center justify-center cursor-pointer transition-all duration-150 shrink-0"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Collapsed State: Embedded Expand Toggle in Header */
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-9 h-9 rounded-xl bg-[#0E1526] border border-slate-700/80 hover:border-blue-500/60 hover:bg-blue-600/15 text-blue-400 shadow-sm items-center justify-center cursor-pointer transition-all duration-150 group"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <div className="relative flex items-center justify-center">
              <Shield className="w-4 h-4 transition-transform group-hover:scale-75 group-hover:opacity-40" />
              <ChevronRight className="w-3.5 h-3.5 absolute opacity-0 group-hover:opacity-100 text-blue-300 transition-opacity" />
            </div>
          </button>
        )}

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center rounded-xl text-xs font-medium tracking-normal transition-all cursor-pointer relative ${
                  isCollapsed
                    ? 'justify-center w-10 h-10 mx-auto p-0'
                    : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
                title={isCollapsed ? undefined : item.label}
              >
                <Icon
                  className={`shrink-0 transition-colors ${
                    isCollapsed ? 'w-4 h-4' : 'w-4 h-4'
                  } ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                />

                {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}

                {/* Badge when expanded - neatly embedded inside the box */}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                    {item.badge}
                  </span>
                )}

                {/* Badge indicator when collapsed - embedded in corner */}
                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0A0F1D] absolute top-1.5 right-1.5" />
                )}
              </button>

              {/* Floating Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] border border-slate-700/90 rounded-lg text-xs font-medium text-slate-100 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom User / Logout Section */}
      <div className={`border-t border-slate-800/80 mt-auto ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className="relative group">
          <button
            onClick={onLogout}
            className={`w-full flex items-center rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ${
              isCollapsed
                ? 'justify-center w-10 h-10 mx-auto p-0'
                : 'gap-3 px-3 py-2.5'
            }`}
            title={isCollapsed ? undefined : 'Logout'}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>

          {/* Tooltip for Logout when collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] border border-slate-700/90 rounded-lg text-xs font-medium text-rose-300 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50">
              Logout
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar with silky width transition */}
      <aside
        className={`hidden md:block transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] shrink-0 ${
          isCollapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        <div
          className="fixed top-0 bottom-0 left-0 z-30 transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ width: isCollapsed ? '72px' : '240px' }}
        >
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
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
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
  onOpenSimulator?: () => void;
  user: { name: string; email: string };
}> = ({ onOpenMobileMenu, user }) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0A0F1D]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          aria-label="Open menu"
        >
          <div className="w-5 h-4 flex flex-col justify-between">
            <span className="w-full h-0.5 bg-slate-300 rounded" />
            <span className="w-full h-0.5 bg-slate-300 rounded" />
            <span className="w-full h-0.5 bg-slate-300 rounded" />
          </div>
        </button>

        {/* Global Security Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">PROTECTION ACTIVE</span>
          <span className="sm:hidden">ACTIVE</span>
        </div>

        <span className="hidden md:inline-block text-slate-700 font-mono text-xs">|</span>
        <span className="hidden md:inline-block text-xs font-mono text-slate-400">
          MongoDB Atlas <span className="text-emerald-400 font-semibold">Synced</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* User Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
          <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold font-mono text-[11px]">
            {user.name.charAt(0)}
          </div>
          <span className="hidden sm:inline text-slate-200 font-medium">{user.name}</span>
        </div>
      </div>
    </header>
  );
};
