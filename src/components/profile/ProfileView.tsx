import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Smartphone,
  Sliders,
  LogOut,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { ProtectionMode, Recipient, TrustedDevice } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Card } from '../common/Card';

interface ProfileViewProps {
  user: { name: string; email: string };
  onUpdateUser: (updated: { name: string; email: string }) => void;
  protectionMode: ProtectionMode;
  onUpdateProtectionMode: (mode: ProtectionMode) => void;
  recipientsCount: number;
  devicesCount: number;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateUser,
  protectionMode,
  onUpdateProtectionMode,
  recipientsCount,
  devicesCount,
  onLogout,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState('+91 98765 43210');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ name, email });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
          Account Profile & Security Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your identity details and protection settings
        </p>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">
            Connected Devices
          </span>
          <div className="mt-2 text-2xl font-extrabold text-white">{devicesCount} Active</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">
            Trusted Payees
          </span>
          <div className="mt-2 text-2xl font-extrabold text-white">{recipientsCount} Verified</div>
        </div>
      </div>

      {/* Personal Information Form */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Personal Information</h3>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully
              </span>
            ) : (
              <span />
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Security Preferences */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Security Preferences</h3>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Protection Mode selection */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1120] border border-slate-800">
            <div className="flex items-start gap-3">
              <Sliders className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div>
                <div className="font-bold text-white">Active Protection Mode</div>
                <p className="text-slate-400 text-[11px]">
                  Currently set to <span className="text-cyan-300 font-semibold">{protectionMode}</span>
                </p>
              </div>
            </div>
            <select
              value={protectionMode}
              onChange={(e) => onUpdateProtectionMode(e.target.value as ProtectionMode)}
              className="bg-[#111827] text-white border border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="STANDARD">Standard</option>
              <option value="STRICT">Strict</option>
              <option value="MAXIMUM">Maximum</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logout Row */}
      <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-rose-400">Sign Out</h4>
          <p className="text-xs text-slate-400">Terminate current session on this device</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={onLogout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
        >
          Logout
        </Button>
      </div>
    </div>
  );
};
