import React, { useState } from 'react';
import { Recipient, VerificationLevel } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { VerificationBadge } from '../common/StatusBadge';
import { ShieldCheck, UserCheck, Phone, CheckCircle2, Lock } from 'lucide-react';

interface RecipientVerificationModalProps {
  recipient: Recipient | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVerification: (recipientId: string, newLevel: VerificationLevel) => void;
}

export const RecipientVerificationModal: React.FC<RecipientVerificationModalProps> = ({
  recipient,
  isOpen,
  onClose,
  onConfirmVerification,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<VerificationLevel>('LEVEL_3_VERIFIED');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!recipient) return null;

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsCompleted(true);
      setTimeout(() => {
        onConfirmVerification(recipient.id, selectedLevel);
        setIsCompleted(false);
        onClose();
      }, 1000);
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title="Verify Recipient Trust"
      subtitle={`Establish reputational confidence for ${recipient.name}`}
    >
      <div className="space-y-5">
        {/* Recipient Snapshot */}
        <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-bold text-white text-sm">{recipient.name}</div>
            <div className="text-xs font-mono text-slate-400">{recipient.upiId}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
              Current Trust
            </span>
            <VerificationBadge level={recipient.trustLevel} size="sm" />
          </div>
        </div>

        {isCompleted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Trust Tier Elevated!</h4>
            <p className="text-xs text-slate-400">
              {recipient.name} has been upgraded. Subsequent transfers will receive expedited clearance.
            </p>
          </div>
        ) : (
          <>
            {/* Choose Target Verification Tier */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select Upgraded Trust Level
              </label>

              <div className="space-y-2">
                {[
                  {
                    level: 'LEVEL_2_IDENTIFIED' as const,
                    name: 'Level 2 — Identified',
                    desc: 'Basic banking registry name match. Reduces warning threshold for small payments.',
                  },
                  {
                    level: 'LEVEL_3_VERIFIED' as const,
                    name: 'Level 3 — Verified',
                    desc: 'Identity validated via phone OTP confirmation or PAN record.',
                  },
                  {
                    level: 'LEVEL_4_TRUSTED' as const,
                    name: 'Level 4 — Trusted',
                    desc: 'Highest confidence payee (e.g. close family or regular merchant). Zero friction.',
                  },
                ].map((tier) => (
                  <div
                    key={tier.level}
                    onClick={() => setSelectedLevel(tier.level)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedLevel === tier.level
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-[#0B1120] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold mb-0.5 text-slate-200">{tier.name}</div>
                    <div className="text-[11px] text-slate-400">{tier.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Second-Factor */}
            <div className="p-3 rounded-lg bg-[#0B1120] border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Security Confirmation</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Simulated biometric or SMS confirmation to verify payee trust upgrade.
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit confirmation PIN (e.g. 123456)"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full bg-[#111827] text-slate-200 text-xs px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isVerifying}
                onClick={handleVerify}
                className="bg-blue-600 hover:bg-blue-500"
              >
                Confirm Verification
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
