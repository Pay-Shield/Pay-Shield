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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative rounded-2xl overflow-hidden p-8 sm:p-14 border border-slate-800 bg-gradient-to-b from-[#111A2E] to-[#0A0F1D] shadow-xl"
        >
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug">
              Before you send. <br />
              <span className="text-slate-300">
                Let PayShield verify.
              </span>
            </h2>

            <p className="mt-4 text-slate-300 text-base leading-relaxed font-normal">
              Join thousands of users protecting their digital transactions from high-pressure social engineering and deceptive recipients.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto px-8"
              >
                Get Started
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070B14] py-12 text-sm text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                P
              </div>
              <span className="font-bold text-white tracking-tight text-base">PayShield</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Secure every payment before it happens. Real-time pre-transaction scam protection.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 font-mono">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><span>Guardian Flow</span></li>
              <li><span>Operations Console</span></li>
              <li><span>Fraud & Alerts</span></li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 font-mono">Security</h4>
            <ul className="space-y-2 text-xs">
              <li><span>Risk Heuristics</span></li>
              <li><span>Recipient Trust Levels</span></li>
              <li><span>SHA-256 Audit Ledger</span></li>
              <li><span>Zero-Trust Policies</span></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 font-mono">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><span>About PayShield</span></li>
              <li><span>Architecture Whitepaper</span></li>
              <li><span>Privacy & Telemetry</span></li>
              <li><span>Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} PayShield. Demo project — not a real payment provider.</p>
          <div className="flex items-center gap-6">
            <span className="text-slate-400">Razorpay Test Sandbox</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
