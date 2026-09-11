import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Tablet,
  Sliders,
  History,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Radio,
  Plus,
  Trash2,
} from 'lucide-react';
import { ProtectionMode, Recipient, TrustedDevice, SecurityEvent } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { VerificationBadge } from '../common/StatusBadge';

interface SecurityCenterViewProps {
  recipients: Recipient[];
  devices: TrustedDevice[];
  events: SecurityEvent[];
  protectionMode: ProtectionMode;
  onUpdateProtectionMode: (mode: ProtectionMode) => void;
  onOpenVerifyModal: (recipient: Recipient) => void;
  onRemoveDevice: (deviceId: string) => void;
}

export const SecurityCenterView: React.FC<SecurityCenterViewProps> = ({
  recipients,
  devices,
  events,
  protectionMode,
  onUpdateProtectionMode,
  onOpenVerifyModal,
  onRemoveDevice,
}) => {
  const [securityScore] = useState(92);

  const protectionModes: {
    id: ProtectionMode;
    title: string;
    description: string;
    threshold: string;
  }[] = [
    {
      id: 'STANDARD',
      title: 'Standard Protection',
      description: 'Flags known malicious scam syndicates and high-urgency keywords. Best for everyday transfers.',
      threshold: 'Triggers on risk score ≥ 80',
    },
    {
      id: 'STRICT',
      title: 'Strict Protection (Recommended)',
      description: 'Requires verification for all new payees and amounts exceeding ₹10,000. Balanced security.',
      threshold: 'Triggers on risk score ≥ 65',
    },
    {
      id: 'MAXIMUM',
      title: 'Maximum Shield',
      description: 'Zero trust mode. Every first-time payee is paused. Device biometric re-authentication mandatory.',
      threshold: 'Triggers on risk score ≥ 40',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
          Security Center
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage hardware devices, policy enforcement sensitivity, and verified recipient trust
        </p>
      </div>

      {/* Top Row: Overall Security Score & Active Protection Mode */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Security Score (Section 32) */}
        <div className="md:col-span-4 rounded-xl border border-slate-800 bg-[#111827] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Posture Score
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> High Defense
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-extrabold text-white">{securityScore}%</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" style={{ width: `${securityScore}%` }} />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Based on device enclave verification, trusted payee ratio, and active Protection Mode settings.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Hardware Enclave: Synced</span>
            <span className="text-emerald-400">Active</span>
          </div>
        </div>

        {/* Protection Mode Switcher */}
        <div className="md:col-span-8 rounded-xl border border-slate-800 bg-[#111827] p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Protection Mode</h3>
              <p className="text-xs text-slate-400">Select pre-authorization sensitivity</p>
            </div>
            <Sliders className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {protectionModes.map((pm) => {
              const isSelected = protectionMode === pm.id;
              return (
                <div
                  key={pm.id}
                  onClick={() => onUpdateProtectionMode(pm.id)}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10'
                      : 'bg-[#0B1120] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-white uppercase tracking-wider">
                        {pm.id}
                      </span>
                      {isSelected ? (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </div>
                    <div className="font-semibold text-slate-200 mb-1">{pm.title}</div>
                    <p className="text-[11px] text-slate-400 leading-snug">{pm.description}</p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-cyan-400">
                    {pm.threshold}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 33: Pause / Block Policy States Reference */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">Pause & Block Interception States</h3>
          <p className="text-xs text-slate-400">
            How PAYSHIELD enforces deterministic safety tiers prior to transaction settlement
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0B1120] border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400">SAFE (0–34)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs font-semibold text-white mb-1">Payment Cleared</div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Transfer to verified payee or routine merchant. No delay introduced.
            </p>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              ACTION: ALLOW
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1120] border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400">VERIFY (35–69)</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xs font-semibold text-white mb-1">Requires Confirmation</div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              First-time payee or elevated amount. Prompt to confirm beneficiary.
            </p>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              ACTION: CONFIRM
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1120] border border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-orange-400">PAUSED (70–89)</span>
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xs font-semibold text-white mb-1">Payment Paused</div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Urgency remarks, unverified handle, or spike volume. Money held for review.
            </p>
            <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
              ACTION: HOLD & VERIFY
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1120] border border-rose-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-400">BLOCKED (90–100)</span>
              <Lock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xs font-semibold text-white mb-1">Payment Blocked</div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Known syndicate handle, extortion threat, or blacklisted scammer.
            </p>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
              ACTION: HARD BLOCK
            </span>
          </div>
        </div>
      </div>

      {/* Trusted Recipients & Trusted Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trusted Recipients List */}
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Trusted Recipients</h3>
              <p className="text-xs text-slate-400">Verified contacts with active clearance rules</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="space-y-3">
            {recipients.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-lg border border-slate-800 bg-[#0B1120] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{rec.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">{rec.upiId}</div>
                  <div className="mt-1">
                    <VerificationBadge level={rec.trustLevel} size="sm" />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenVerifyModal(rec)}
                  className="text-cyan-300 border-cyan-500/30 text-xs"
                >
                  Adjust Trust
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Trusted Devices List */}
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Trusted Devices</h3>
              <p className="text-xs text-slate-400">Hardware authorized for cryptographic token signing</p>
            </div>
            <Smartphone className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="space-y-3">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="p-3 rounded-lg border border-slate-800 bg-[#0B1120] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-cyan-400 flex items-center justify-center shrink-0">
                    {dev.deviceType === 'desktop' ? (
                      <Laptop className="w-4 h-4" />
                    ) : dev.deviceType === 'tablet' ? (
                      <Tablet className="w-4 h-4" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{dev.name}</span>
                      {dev.isCurrent && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {dev.ipAddress} • {dev.location}
                    </div>
                  </div>
                </div>

                {!dev.isCurrent && (
                  <button
                    onClick={() => onRemoveDevice(dev.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Revoke device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Events Audit Log */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Security Events</h3>
            <p className="text-xs text-slate-400">Cryptographic audit log of defense triggers</p>
          </div>
          <History className="w-4 h-4 text-slate-400" />
        </div>

        <div className="space-y-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 rounded-lg border border-slate-800 bg-[#0B1120] text-xs flex items-start justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-200">{evt.title}</span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase bg-cyan-500/10 px-1.5 py-0.5 rounded">
                    {evt.type}
                  </span>
                </div>
                <p className="text-slate-400">{evt.description}</p>
              </div>
              <span className="text-slate-500 font-mono text-[11px] shrink-0">{evt.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
