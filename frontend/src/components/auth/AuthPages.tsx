import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Mail, User, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { StarBackground } from '../landing/StarBackground';

interface AuthPagesProps {
  initialMode?: 'login' | 'signup';
  onSuccess: (user: { name: string; email: string }) => void;
  onCancel: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  initialMode = 'login',
  onSuccess,
  onCancel,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('Aryan Chippa');
  const [email, setEmail] = useState('user@payshield.security');
  const [password, setPassword] = useState('SecureP@ss2026');
  const [confirmPassword, setConfirmPassword] = useState('SecureP@ss2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup') {
      if (!fullName) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    // Simulate authentication
    setTimeout(() => {
      setLoading(false);
      onSuccess({
        name: mode === 'signup' ? fullName : (fullName || 'Aryan Chippa'),
        email,
      });
    }, 600);
  };

  const handleDemoLogin = () => {
    setFullName('Aryan Chippa');
    setEmail('aryan@payshield.security');
    setPassword('DemoSecurity2026!');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess({ name: 'Aryan Chippa', email: 'aryan@payshield.security' });
    }, 450);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#070B14]">
      {/* Background */}
      <StarBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#111827]/90 backdrop-blur-xl p-8 shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-cyan-400 mb-4 hover:scale-105 transition-transform"
            >
              <Shield className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
              {mode === 'login' ? 'Welcome back.' : 'Create your PAYSHIELD account.'}
            </h2>
            <p className="mt-1.5 text-xs text-slate-400">
              {mode === 'login'
                ? 'Enter your credentials to access protected transactions'
                : 'Pre-transaction scam defense for your digital payments'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            {mode === 'signup' && (
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full bg-blue-600 hover:bg-blue-500 mt-2"
            >
              {mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
            </Button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2 px-3 rounded-lg bg-[#172033] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-400 flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Instant Access as Demo User</span>
            </button>
          </div>

          {/* Switch Mode */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setError('');
                    setMode('signup');
                  }}
                  className="text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setError('');
                    setMode('login');
                  }}
                  className="text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Login
                </button>
              </p>
            )}
          </div>

          {/* Back to landing */}
          <div className="mt-4 text-center">
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              ← Back to homepage
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
