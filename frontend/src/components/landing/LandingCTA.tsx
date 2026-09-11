import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

interface LandingCTAProps {
  onGetStarted: () => void;
}

export const LandingCTA: React.FC<LandingCTAProps> = ({ onGetStarted }) => {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 border border-blue-500/30 bg-gradient-to-r from-blue-900/40 via-[#0B1120] to-cyan-900/30 backdrop-blur-md shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
              Before you send. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Let PAYSHIELD check.
              </span>
            </h2>

            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              Join thousands of users protecting their digital transactions from high-pressure social engineering and deceptive recipients.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/25"
              >
                GET STARTED
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Footer: React.FC<{ onNavigateSection?: (id: string) => void }> = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070B14] py-12 text-sm text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                P
              </div>
              <span className="font-extrabold text-white tracking-wider font-display">PAYSHIELD</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Secure every payment before it happens. Real-time pre-transaction scam protection.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Dashboard</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Transactions</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Fraud & Alerts</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Security Center</span></li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Security</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Risk Analysis</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Recipient Verification</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Protection Engine</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Policy Controls</span></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">About PAYSHIELD</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Contact</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Privacy Policy</span></li>
              <li><span className="hover:text-cyan-400 cursor-pointer transition-colors">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} PAYSHIELD Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All Systems Operational
            </span>
            <span>NPCI / UPI Protocol Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
