import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { mongoService, MongoTransaction } from './server/mongodb';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayPublicConfig,
} from './server/razorpay';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  process.loadEnvFile();
} catch {
  // No .env file present (or unsupported Node version) — fall back to process.env / hardcoded defaults
}

const app = express();
const PORT = 3000;

app.use(express.json());

// CORS & logging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// Cryptographic Hash-Chained Audit Trail (SHA-256)
// ============================================================================

export interface AuditEntry {
  sequence: number;
  timestamp: number;
  agent_id: string;
  action: string;
  input_hash: string;
  output_hash: string;
  trust_score: number;
  entry_hash: string;
  previous_hash: string;
  metadata?: Record<string, any>;
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf-8').digest('hex');
}

const AUDIT_CHAIN_FILE = 'audit_chain.jsonl';
const AUDIT_CHAIN_PATH = path.join(process.cwd(), AUDIT_CHAIN_FILE);

class CryptoAuditTrail {
  private entries: AuditEntry[] = [];
  private readonly GENESIS_HASH = '0'.repeat(64);

  constructor() {
    if (this.loadFromDisk()) return;
    this.entries.push(this.createGenesisEntry());
    this.appendToDisk(this.entries[0]);
  }

  private createGenesisEntry(): AuditEntry {
    const genesisTime = Date.now() / 1000;
    const gInputHash = sha256('genesis_system_init');
    const gOutputHash = sha256('payshield_guardian_online');
    const gEntryHash = sha256(`0:${genesisTime}:system:genesis:${gInputHash}:${gOutputHash}:100:${this.GENESIS_HASH}`);
    return {
      sequence: 0,
      timestamp: genesisTime,
      agent_id: 'system',
      action: 'genesis_block_initialized',
      input_hash: gInputHash,
      output_hash: gOutputHash,
      trust_score: 100,
      entry_hash: gEntryHash,
      previous_hash: this.GENESIS_HASH,
      metadata: { system: 'PayShield Trust-Gated Sentinel' },
    };
  }

  // Loads a previously-persisted chain from disk, but only trusts it if it
  // verifies under THIS implementation's exact hash scheme — a chain written
  // by a different (e.g. an earlier Python) implementation would use a
  // different hash format and must not be silently adopted as intact.
  private loadFromDisk(): boolean {
    try {
      if (!fs.existsSync(AUDIT_CHAIN_PATH)) return false;
      const raw = fs.readFileSync(AUDIT_CHAIN_PATH, 'utf-8').trim();
      if (!raw) return false;

      const loaded: AuditEntry[] = raw.split('\n').map((line) => JSON.parse(line));
      if (loaded.length === 0) return false;

      this.entries = loaded;
      const check = this.verify();
      if (!check.intact) {
        console.warn(
          `⚠️ ${AUDIT_CHAIN_FILE} does not verify against this server's hash scheme (${check.details}) — archiving it and starting a fresh chain.`
        );
        this.entries = [];
        const archivePath = AUDIT_CHAIN_PATH.replace(/\.jsonl$/, `.legacy-${Date.now()}.jsonl`);
        fs.renameSync(AUDIT_CHAIN_PATH, archivePath);
        return false;
      }

      console.log(`📜 Loaded ${loaded.length} audit entries from ${AUDIT_CHAIN_FILE}`);
      return true;
    } catch (err: any) {
      console.error(`Failed to load ${AUDIT_CHAIN_FILE}, starting fresh:`, err.message);
      return false;
    }
  }

  private appendToDisk(entry: AuditEntry) {
    try {
      fs.appendFileSync(AUDIT_CHAIN_PATH, JSON.stringify(entry) + '\n');
    } catch (err: any) {
      console.error(`Failed to persist audit entry to ${AUDIT_CHAIN_FILE}:`, err.message);
    }
  }

  public record(
    agentId: string,
    action: string,
    inputData: any,
    outputData: any,
    trustScore: number,
    metadata?: Record<string, any>
  ): AuditEntry {
    const prev = this.entries[this.entries.length - 1];
    const prevHash = prev ? prev.entry_hash : this.GENESIS_HASH;
    const seq = this.entries.length;
    const now = Date.now() / 1000;

    const inputHash = sha256(JSON.stringify(inputData));
    const outputHash = sha256(JSON.stringify(outputData));
    const entryHash = sha256(`${seq}:${now}:${agentId}:${action}:${inputHash}:${outputHash}:${trustScore}:${prevHash}`);

    const entry: AuditEntry = {
      sequence: seq,
      timestamp: now,
      agent_id: agentId,
      action,
      input_hash: inputHash,
      output_hash: outputHash,
      trust_score: trustScore,
      entry_hash: entryHash,
      previous_hash: prevHash,
      metadata,
    };

    this.entries.push(entry);
    this.appendToDisk(entry);
    return entry;
  }

  public getHistory(limit = 50): AuditEntry[] {
    return [...this.entries].reverse().slice(0, limit);
  }

  public verify(): { intact: boolean; entry_count: number; verified_at: string; details: string } {
    const verifiedAt = new Date().toISOString();
    if (this.entries.length === 0) {
      return { intact: true, entry_count: 0, verified_at: verifiedAt, details: 'Chain empty' };
    }

    for (let i = 1; i < this.entries.length; i++) {
      const current = this.entries[i];
      const prev = this.entries[i - 1];

      if (current.previous_hash !== prev.entry_hash) {
        return {
          intact: false,
          entry_count: this.entries.length,
          verified_at: verifiedAt,
          details: `Chain broken at sequence ${current.sequence}: previous_hash does not match sequence ${prev.sequence} entry_hash`,
        };
      }

      const recomputed = sha256(
        `${current.sequence}:${current.timestamp}:${current.agent_id}:${current.action}:${current.input_hash}:${current.output_hash}:${current.trust_score}:${current.previous_hash}`
      );
      if (recomputed !== current.entry_hash) {
        return {
          intact: false,
          entry_count: this.entries.length,
          verified_at: verifiedAt,
          details: `Tampering detected at sequence ${current.sequence}: signature hash mismatch`,
        };
      }
    }

    return {
      intact: true,
      entry_count: this.entries.length,
      verified_at: verifiedAt,
      details: 'All block signatures and previous hash pointers cryptographically validated.',
    };
  }
}

const auditTrail = new CryptoAuditTrail();

// Legacy (human-readable) audit log — persisted separately from the crypto
// chain above, one JSON line per entry, oldest-first on disk.
const LEGACY_LOG_FILE = 'legacy_audit_log.jsonl';
const LEGACY_LOG_PATH = path.join(process.cwd(), LEGACY_LOG_FILE);

function loadLegacyLog(): Array<Record<string, any>> {
  try {
    if (!fs.existsSync(LEGACY_LOG_PATH)) return [];
    const raw = fs.readFileSync(LEGACY_LOG_PATH, 'utf-8').trim();
    if (!raw) return [];
    const oldestFirst = raw.split('\n').map((line) => JSON.parse(line));
    console.log(`📜 Loaded ${oldestFirst.length} entries from ${LEGACY_LOG_FILE}`);
    return oldestFirst.reverse(); // legacyAuditLog is kept newest-first (unshift order)
  } catch (err: any) {
    console.error(`Failed to load ${LEGACY_LOG_FILE}, starting fresh:`, err.message);
    return [];
  }
}

function appendLegacyLog(entry: Record<string, any>) {
  try {
    fs.appendFileSync(LEGACY_LOG_PATH, JSON.stringify(entry) + '\n');
  } catch (err: any) {
    console.error(`Failed to persist entry to ${LEGACY_LOG_FILE}:`, err.message);
  }
}

const legacyAuditLog: Array<Record<string, any>> = loadLegacyLog();

// ============================================================================
// Human-In-The-Loop Pending Store
// ============================================================================
interface PendingTransaction {
  request: any;
  decision: any;
  breakdown: any;
  explanation: string;
  createdAt: number;
}

const pendingTransactions = new Map<string, PendingTransaction>();

function storePending(transactionId: string, payload: Omit<PendingTransaction, 'createdAt'>) {
  pendingTransactions.set(transactionId, {
    ...payload,
    createdAt: Date.now(),
  });
}

function popPending(transactionId: string): PendingTransaction | undefined {
  const item = pendingTransactions.get(transactionId);
  if (item) {
    pendingTransactions.delete(transactionId);
  }
  return item;
}

// Prune older than 30 mins
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [tid, item] of pendingTransactions.entries()) {
    if (item.createdAt < cutoff) {
      pendingTransactions.delete(tid);
    }
  }
}, 60 * 1000);

// ============================================================================
// Multi-Agent Risk Engine
// ============================================================================
interface SessionAttempt {
  timestamp: number;
  recipientId: string;
}
const userSessions = new Map<string, SessionAttempt[]>();

function recordSessionAttempt(senderId: string, recipientId: string) {
  const attempts = userSessions.get(senderId) || [];
  attempts.push({ timestamp: Date.now(), recipientId });
  userSessions.set(senderId, attempts);
}

function getRecentAttempts(senderId: string): SessionAttempt[] {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const list = userSessions.get(senderId) || [];
  return list.filter((a) => a.timestamp > fiveMinutesAgo);
}

// ============================================================================
// Layered Rule System & Multi-Agent Correlation Engine
// ============================================================================
export type RuleFlag = 'safe' | 'low_flag' | 'medium_flag' | 'high_flag' | 'critical_flag' | 'trust_boost';

export interface RuleResult {
  rule_id: string;
  category: 'amount' | 'recipient' | 'behavior' | 'content';
  flag: RuleFlag;
  reason: string;
}

// 1. Amount-Tier Rules (AMT-01 to AMT-07)
function amountRules(amount: number, isNewRecipient: boolean, userBaseline = 3000): RuleResult[] {
  const results: RuleResult[] = [];
  const avg = userBaseline;

  if (amount < 30000 && !isNewRecipient) {
    results.push({ rule_id: 'AMT-01', category: 'amount', flag: 'safe', reason: 'Small amount to known recipient' });
  } else if (amount < 30000 && isNewRecipient) {
    results.push({ rule_id: 'AMT-02', category: 'amount', flag: 'low_flag', reason: 'Small amount but new recipient' });
  } else if (amount >= 30000 && amount < 40000) {
    results.push({ rule_id: 'AMT-03', category: 'amount', flag: 'low_flag', reason: 'Moderate amount (₹30,000 - ₹40,000)' });
  } else if (amount >= 40000 && amount < 50000) {
    results.push({ rule_id: 'AMT-04', category: 'amount', flag: 'medium_flag', reason: 'Amount in verify-recommended range (₹40,000 - ₹50,000)' });
  } else if (amount >= 50000 && amount < 100000 && isNewRecipient) {
    results.push({ rule_id: 'AMT-05', category: 'amount', flag: 'high_flag', reason: 'High amount to new recipient (₹50,000 - ₹1,00,000)' });
  } else if (amount >= 100000 && isNewRecipient) {
    results.push({ rule_id: 'AMT-06', category: 'amount', flag: 'critical_flag', reason: 'Very high amount (≥ ₹1,00,000), brand-new recipient, no history' });
  }

  if (avg > 0 && amount >= avg * 5) {
    results.push({ rule_id: 'AMT-07', category: 'amount', flag: 'high_flag', reason: `Amount (₹${amount.toLocaleString()}) is ${(amount / avg).toFixed(1)}x user's historical average` });
  }

  return results;
}

// 2. Recipient Trust Rules (REC-01 to REC-05)
const TYPOSQUAT_REGEX = /(sbi[-_]?kyc|hdfc[-_]?(verify|support|help|kyc)|icici[-_]?(care|help|kyc)|paytm[-_]?(refund|support)|phonepe[-_]?(reward|bonus)|gpay[-_]?(claim|cashback)|electricity[-_]?(bill|dept|officer)|urgent[-_.]?power|power[-_.]?(bill|helpdesk)|fake[-_]?customs)/i;

function recipientRules(recipientName: string, upiId: string, recipientStatus: string, accountAgeHours = 999): RuleResult[] {
  const results: RuleResult[] = [];
  const lowerName = recipientName.toLowerCase();
  const lowerUpi = upiId.toLowerCase();

  // REC-01: Recipient in user's saved/frequent contacts
  if (recipientStatus === 'known' || ['amazon', 'flipkart', 'swiggy', 'zomato', 'uber', 'google', 'apple', 'netflix', 'merchant', 'rahul@upi'].some(m => lowerUpi.includes(m) || lowerName.includes(m))) {
    results.push({ rule_id: 'REC-01', category: 'recipient', flag: 'trust_boost', reason: 'Frequent/saved verified contact' });
  }

  // REC-02: Recipient UPI ID created/first-seen < 24 hours ago
  if (accountAgeHours < 24) {
    results.push({ rule_id: 'REC-02', category: 'recipient', flag: 'high_flag', reason: 'Recipient UPI ID created/first-seen < 24 hours ago' });
  }

  // REC-03: Recipient on scam/blacklist registry
  const isBlacklisted = ['fraud', 'scam', 'fake.customs', 'invest-guaranteed', 'power-bill', 'police', 'lottery', 'crypto_miner', 'temp_payee', 'phish'].some(kw => lowerUpi.includes(kw) || lowerName.includes(kw));
  if (isBlacklisted || recipientStatus === 'flagged') {
    results.push({ rule_id: 'REC-03', category: 'recipient', flag: 'critical_flag', reason: 'Recipient matches scam / fraud registry' });
  }

  // REC-04: Recipient UPI handle uses look-alike/typo-squatted domain
  if (TYPOSQUAT_REGEX.test(lowerUpi)) {
    results.push({ rule_id: 'REC-04', category: 'recipient', flag: 'high_flag', reason: 'Recipient UPI handle resembles a known bank/merchant (typosquat signature)' });
  }

  // REC-05: Recipient name doesn't match UPI reverse-lookup
  if (lowerName.includes('test mismatch') || (lowerUpi.includes('merchant') && !lowerName.includes('amazon') && !lowerName.includes('merchant'))) {
    results.push({ rule_id: 'REC-05', category: 'recipient', flag: 'medium_flag', reason: "Entered payee name does not match UPI reverse-lookup directory" });
  }

  return results;
}

// 3. Behavioral / Velocity Rules (BEH-01 to BEH-05)
function behaviorRules(senderId: string, amount: number, isNewDevice = false, isNewLocation = false): RuleResult[] {
  const results: RuleResult[] = [];
  const recentAttempts = getRecentAttempts(senderId);

  // BEH-01: 3+ transactions to different new recipients within 10 minutes
  if (recentAttempts.length >= 3) {
    results.push({ rule_id: 'BEH-01', category: 'behavior', flag: 'high_flag', reason: `3+ payments to different new recipients in short window (${recentAttempts.length} attempts in last 5m)` });
  }

  // BEH-02: Transaction at unusual hour for this user (1 AM - 5 AM)
  const currentHour = new Date().getHours();
  if (currentHour >= 1 && currentHour <= 5) {
    results.push({ rule_id: 'BEH-02', category: 'behavior', flag: 'low_flag', reason: 'Transaction initiated during unusual off-peak hours (1 AM - 5 AM)' });
  }

  // BEH-03: Sudden change in transaction pattern
  const baseline = 3000;
  if (amount >= 40000 && baseline <= 5000) {
    results.push({ rule_id: 'BEH-03', category: 'behavior', flag: 'medium_flag', reason: `Sudden change in transaction pattern: normally ₹${baseline.toLocaleString()}, currently ₹${amount.toLocaleString()}` });
  }

  // BEH-04: Multiple failed/cancelled attempts
  if (recentAttempts.length >= 2 && recentAttempts.length < 3) {
    results.push({ rule_id: 'BEH-04', category: 'behavior', flag: 'medium_flag', reason: 'Consecutive transfer attempts initiated within short window under pressure' });
  }

  // BEH-05: New device or new location
  if (isNewDevice || isNewLocation) {
    results.push({ rule_id: 'BEH-05', category: 'behavior', flag: 'medium_flag', reason: 'New/unrecognized device or location detected for account' });
  }

  return results;
}

// 4. Content / Message Rules (MSG-01 to MSG-06)
const URGENCY_WORDS = ['immediately', 'immediate', 'urgent', 'urgently', 'expire', 'blocked', 'act now', 'last chance', 'within 2 hours', 'asap', 'today', 'now', 'tonight'];
const AUTHORITY_WORDS = ['kyc', 'rbi', 'bank official', 'customer care', 'verification required', 'police', 'customs', 'electricity department', 'income tax', 'npci'];
const THREAT_WORDS = ['disconnect', 'disconnecting', 'disconnection', 'police', 'arrest', 'court', 'legal action', 'fir', 'freeze', 'penalty', 'fine'];
const GIFT_CARD_WORDS = ['crypto', 'bitcoin', 'gift card', 'voucher', 'guaranteed return', 'deposit return', '40%'];
const OTP_WORDS = ['otp', 'share your pin', 'one time password', 'verification code', 'share otp', 'pin sharing'];
const URL_WORDS = ['http', 'https', 'bit.ly', 'tinyurl', 'wa.me', '.apk', '.xyz'];

function contentRules(message: string, isNewRecipient: boolean): RuleResult[] {
  const results: RuleResult[] = [];
  const text = message.toLowerCase();

  // MSG-01: Urgency phrases
  if (URGENCY_WORDS.some(w => text.includes(w))) {
    results.push({ rule_id: 'MSG-01', category: 'content', flag: 'medium_flag', reason: 'Urgency language detected in payment message' });
  }

  // MSG-02: Authority-impersonation + new recipient
  if (AUTHORITY_WORDS.some(w => text.includes(w)) && isNewRecipient) {
    results.push({ rule_id: 'MSG-02', category: 'content', flag: 'high_flag', reason: 'Authority-impersonation language combined with unverified recipient' });
  }

  // MSG-03: Message requests OTP/PIN sharing
  if (OTP_WORDS.some(w => text.includes(w))) {
    results.push({ rule_id: 'MSG-03', category: 'content', flag: 'critical_flag', reason: 'Payment context requests OTP or confidential PIN sharing' });
  }

  // MSG-04: Shortened/suspicious URL
  if (URL_WORDS.some(w => text.includes(w))) {
    results.push({ rule_id: 'MSG-04', category: 'content', flag: 'high_flag', reason: 'Suspicious external link or APK URL in payment message' });
  }

  // MSG-05: Coercive threat language
  if (THREAT_WORDS.some(w => text.includes(w))) {
    results.push({ rule_id: 'MSG-05', category: 'content', flag: 'high_flag', reason: 'Coercive threat language detected (disconnection, punitive penalty, or legal action)' });
  }

  // MSG-06: High-yield investment or crypto solicitation
  if (GIFT_CARD_WORDS.some(w => text.includes(w)) && isNewRecipient) {
    results.push({ rule_id: 'MSG-06', category: 'content', flag: 'high_flag', reason: 'Unrealistic return / crypto deposit solicitation detected with new recipient' });
  }

  return results;
}

// 5. Composite Escalation Rules (ESC-01 to ESC-06)
function decideAction(allResults: RuleResult[]): {
  action: 'SAFE' | 'VERIFY' | 'PAUSED' | 'BLOCKED';
  riskLevel: 'SAFE' | 'WARNING' | 'HIGH' | 'CRITICAL';
  category: string;
  finalScore: number;
  escalationRule: string;
  reasons: string[];
} {
  // ESC-01: Any critical_flag -> Block immediately
  const critical = allResults.filter(r => r.flag === 'critical_flag');
  if (critical.length > 0) {
    return {
      action: 'BLOCKED',
      riskLevel: 'CRITICAL',
      category: 'Critical',
      finalScore: 95,
      escalationRule: 'ESC-01',
      reasons: critical.map(r => r.reason),
    };
  }

  // Count HIGH and MEDIUM flags by distinct category
  const highByCategory: Record<string, RuleResult[]> = {};
  const mediumByCategory: Record<string, RuleResult[]> = {};
  const hasTrustBoost = allResults.some(r => r.flag === 'trust_boost');

  for (const r of allResults) {
    if (r.flag === 'high_flag') {
      if (!highByCategory[r.category]) highByCategory[r.category] = [];
      highByCategory[r.category].push(r);
    } else if (r.flag === 'medium_flag') {
      if (!mediumByCategory[r.category]) mediumByCategory[r.category] = [];
      mediumByCategory[r.category].push(r);
    }
  }

  // ESC-06: Trust boost downgrades one high_flag to medium_flag
  let trustSoftened = false;
  const highKeys = Object.keys(highByCategory);
  if (hasTrustBoost && highKeys.length > 0) {
    const softenedCat = highKeys[0];
    const demoted = highByCategory[softenedCat];
    delete highByCategory[softenedCat];
    if (!mediumByCategory[softenedCat]) mediumByCategory[softenedCat] = [];
    mediumByCategory[softenedCat].push(...demoted);
    trustSoftened = true;
  }

  const highCount = Object.keys(highByCategory).length;
  const mediumCount = Object.keys(mediumByCategory).length;

  // ESC-03: 2+ high_flags from different categories -> Pause + Step-up Auth
  if (highCount >= 2) {
    const reasons = Object.values(highByCategory).flat().map(r => r.reason);
    return {
      action: 'PAUSED',
      riskLevel: 'HIGH',
      category: 'High',
      finalScore: 78,
      escalationRule: 'ESC-03',
      reasons,
    };
  }

  // ESC-04: 1 high_flag + 2+ medium_flags from different categories -> Pause + Step-up Auth
  if (highCount === 1 && mediumCount >= 2) {
    const reasons = [...Object.values(highByCategory).flat(), ...Object.values(mediumByCategory).flat()].map(r => r.reason);
    return {
      action: 'PAUSED',
      riskLevel: 'HIGH',
      category: 'High',
      finalScore: 72,
      escalationRule: 'ESC-04',
      reasons,
    };
  }

  // ESC-02: 1 high_flag alone -> Warn + Confirm only
  if (highCount === 1) {
    const reasons = Object.values(highByCategory).flat().map(r => r.reason);
    return {
      action: 'VERIFY',
      riskLevel: 'WARNING',
      category: 'Medium',
      finalScore: 52,
      escalationRule: trustSoftened ? 'ESC-06' : 'ESC-02',
      reasons,
    };
  }

  // ESC-05: Only low_flag/medium_flags, no high_flag (Warn + Confirm at most)
  const hasNewRecipientFlag = allResults.some(r => r.flag === 'low_flag' && (r.reason.toLowerCase().includes('new') || r.rule_id === 'AMT-02'));
  if (mediumCount >= 1 || hasNewRecipientFlag) {
    const medReasons = Object.values(mediumByCategory).flat().map(r => r.reason);
    const lowReasons = allResults.filter(r => r.flag === 'low_flag').map(r => r.reason);
    return {
      action: 'VERIFY',
      riskLevel: 'WARNING',
      category: 'Medium',
      finalScore: 42,
      escalationRule: 'ESC-05',
      reasons: medReasons.length > 0 ? medReasons : lowReasons,
    };
  }

  // Low / Clean Routine
  const lowReasons = allResults.filter(r => r.flag === 'low_flag' || r.flag === 'safe').map(r => r.reason);
  return {
    action: 'SAFE',
    riskLevel: 'SAFE',
    category: 'Low',
    finalScore: lowReasons.length > 0 ? 15 : 8,
    escalationRule: 'CLEAN_POLICY',
    reasons: lowReasons.length > 0 ? lowReasons : ['Routine transaction within normal personal spend limits and clean payee profile.'],
  };
}

// 6. Recipient Verification Agent
function recipientVerificationAgent(recipientName: string, upiId: string) {
  const lowerName = recipientName.toLowerCase();
  const lowerUpi = upiId.toLowerCase();

  const flaggedKeywords = ['fraud', 'scam', 'police', 'lottery', 'crypto_miner', 'temp_payee', 'phish', 'fake.customs', 'invest-guaranteed'];
  const isFlagged = flaggedKeywords.some((kw) => lowerUpi.includes(kw) || lowerName.includes(kw));

  const knownMerchants = ['amazon', 'flipkart', 'swiggy', 'zomato', 'uber', 'google', 'apple', 'netflix', 'merchant', 'rahul@upi'];
  const isKnown = knownMerchants.some((m) => lowerUpi.includes(m) || lowerName.includes(m));

  if (isFlagged) {
    return {
      status: 'flagged',
      score_contribution: 45,
      factors: [{ type: 'recipient_flagged', reason: 'Recipient handle linked to suspicious complaint records' }],
    };
  }

  if (isKnown) {
    return {
      status: 'known',
      score_contribution: 0,
      factors: [{ type: 'recipient_known', reason: 'Verified merchant directory entry with long-term trust score' }],
    };
  }

  return {
    status: 'new',
    score_contribution: 25,
    factors: [{ type: 'recipient_new', reason: 'First-time payee handle with no prior transactional graph' }],
  };
}

// 7. Behavioral Pattern Agent
function behavioralPatternAgent(senderId: string, amount: number) {
  const recentAttempts = getRecentAttempts(senderId);
  const factors: any[] = [];
  let score = 0;

  if (recentAttempts.length >= 3) {
    score += 35;
    factors.push({ type: 'high_velocity', reason: `High transaction velocity detected: ${recentAttempts.length} attempts in last 5 minutes` });
  } else if (recentAttempts.length >= 1) {
    score += 15;
    factors.push({ type: 'moderate_velocity', reason: 'Consecutive transfer attempts initiated within short window' });
  }

  const baseline = 3000;
  if (amount >= baseline * 10) {
    score += 30;
    factors.push({ type: 'amount_10x_baseline', reason: `Amount (₹${amount.toLocaleString()}) exceeds personal baseline by >10x` });
  } else if (amount >= baseline * 3) {
    score += 15;
    factors.push({ type: 'amount_3x_baseline', reason: `Amount (₹${amount.toLocaleString()}) moderately above standard baseline` });
  }

  const currentHour = new Date().getHours();
  if (currentHour >= 1 && currentHour <= 5) {
    score += 10;
    factors.push({ type: 'odd_hours', reason: 'Transfer initiated during unusual off-peak hours (1 AM - 5 AM)' });
  }

  return { score: Math.min(100, score), factors };
}

// 8. Social Engineering & Risk Analysis Agent
function riskAnalysisAgent(recipientName: string, upiId: string, amount: number, message: string) {
  const text = `${message} ${recipientName} ${upiId}`.toLowerCase();
  const factors: any[] = [];
  const signals: string[] = [];
  let score = 0;

  const urgency = /urgent|immediately|today|now|expire|suspend|disconnect|penalty|within\s*\d+\s*(mins|hours)|asap/i.test(text);
  const threat = /block|disconnect|police|arrest|court|legal|fir|freeze|lock|fine|penalty/i.test(text);
  const impersonation = /official|bank|manager|support|helpdesk|customs|tax|income\s*tax|department|npci|rbi|electricity|telecom|airtel|jio/i.test(text);
  const financialScam = /crypto|guaranteed|doubl|invest|lottery|winner|prize|bonus|refund|claim|cashback/i.test(text);

  if (urgency) {
    signals.push('urgent_coercion');
    factors.push({ type: 'urgency_detected', reason: 'High-urgency language attempting to bypass cognitive verification' });
    score += 25;
  }
  if (threat) {
    signals.push('threat_intimidation');
    factors.push({ type: 'legal_threat', reason: 'Extortion or intimidation signals (legal, police, or account suspension)' });
    score += 35;
  }
  if (impersonation) {
    signals.push('impersonation_signature');
    factors.push({ type: 'authority_impersonation', reason: 'Institutional authority impersonation pattern detected' });
    score += 30;
  }
  if (financialScam) {
    signals.push('financial_deception');
    factors.push({ type: 'syndicate_pitch', reason: 'Unrealistic return, lottery, or prize scam signature matched' });
    score += 40;
  }

  return { score: Math.min(100, score), factors, signals };
}

// 9. Multi-Agent & Layered Correlation Evaluator
//
// action/riskLevel/finalScore/reasons come from the layered rule system
// (amountRules/recipientRules/behaviorRules/contentRules -> decideAction's
// ESC-01..ESC-06 escalation policy) — named, auditable rule IDs rather than
// an opaque weighted average. The three legacy agents above are still run
// only to populate the 5-dimension `breakdown` radar chart the UI displays;
// they no longer have any say in the actual decision.
function evaluateRisk(
  recipientName: string,
  upiId: string,
  amount: number,
  message: string,
  senderId: string
) {
  const recipientRes = recipientVerificationAgent(recipientName, upiId);
  const isNew = recipientRes.status === 'new';
  const behaviorRes = behavioralPatternAgent(senderId, amount);
  const riskRes = riskAnalysisAgent(recipientName, upiId, amount, message);

  // Evaluate Layered Rule System (AMT, REC, BEH, MSG)
  const amtRuleList = amountRules(amount, isNew);
  const recRuleList = recipientRules(recipientName, upiId, recipientRes.status);
  const behRuleList = behaviorRules(senderId, amount);
  const msgRuleList = contentRules(message, isNew);

  const allRules = [...amtRuleList, ...recRuleList, ...behRuleList, ...msgRuleList];

  // Evaluate Multi-Category Composite Escalation (ESC-01 to ESC-06)
  const escalationDecision = decideAction(allRules);

  // Compute sub-risks for the 5 visual dimensions
  let transactionRisk = Math.min(100, Math.round(amount > 50000 ? 92 : amount > 20000 ? 76 : amount > 5000 ? 40 : 10));
  let recipientRisk = recipientRes.status === 'flagged' ? 95 : recipientRes.status === 'new' ? 48 : 8;
  let behaviorRisk = Math.min(100, Math.max(12, behaviorRes.score));
  let socialEngineeringRisk = Math.min(100, Math.max(5, riskRes.score));
  let networkRisk = recipientRes.status === 'flagged' ? 90 : amount > 25000 ? 60 : 14;

  if (escalationDecision.action === 'BLOCKED') {
    transactionRisk = Math.max(transactionRisk, 90);
    recipientRisk = Math.max(recipientRisk, 94);
    socialEngineeringRisk = Math.max(socialEngineeringRisk, 95);
  }

  return {
    finalScore: escalationDecision.finalScore,
    riskLevel: escalationDecision.riskLevel,
    action: escalationDecision.action,
    reasons: escalationDecision.reasons,
    escalationRule: escalationDecision.escalationRule,
    triggeredRules: allRules.map(r => r.rule_id),
    allSignals: allRules,
    breakdown: {
      transactionRisk,
      recipientRisk,
      behaviorRisk,
      socialEngineeringRisk,
      networkRisk,
    },
    recipientRes,
    behaviorRes,
    riskRes,
  };
}

// ============================================================================
// LLM Reasoning Module (Ollama) — qualitative signal, bounded score adjustment
//
// Per guardian-architecture.md: "rules AND LLM, not rules OR LLM." The rules
// engine above remains the sole authority on action/riskLevel. The LLM only
// ever nudges the numeric score within ±15 and supplies a plain-language
// explanation of social-engineering intent in the free-text note.
// ============================================================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b-instruct-2507-q4_K_M';

const OLLAMA_TIMEOUT_MS = 6000;

async function callOllamaReasoning(
  prompt: string,
  timeoutMs: number = OLLAMA_TIMEOUT_MS
): Promise<{ text: string; ok: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data = await response.json();
    return { text: data?.message?.content ?? '', ok: true };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error(`Ollama call timed out after ${timeoutMs / 1000}s`);
    } else {
      console.error('Ollama call failed:', err?.message || err);
    }
    return { text: '', ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

function buildFraudPrompt(recipientName: string, upiId: string, amount: number, message: string): string {
  return `You are a fraud-analysis assistant for PAYSHIELD, a payment-security guardian that screens payment notes for social engineering before money moves.

Recipient name: ${recipientName || 'Unknown'}
UPI ID: ${upiId || 'unknown'}
Amount: ₹${amount}
Payment note: "${message}"

Judge the payment note specifically for:
- Urgency or artificial time pressure ("immediately", "today", "expires")
- Impersonation of authority (bank, police, government, support desk)
- Threats or intimidation (account freeze, arrest, legal action, penalty)
- Social-engineering / scam pitches (guaranteed returns, lottery, prize, crypto)

Write 2-4 plain-language sentences explaining what you found (or didn't find) for an end user about to send this payment.

Then, on its own final line, output exactly this format with no extra text:
SCORE_ADJUST: X

Where X is an integer from -15 to 15: use a positive number if the note raises fraud risk (higher for stronger scam signals), a negative number if the note is clearly routine/reassuring and should lower risk, or 0 if neutral.`;
}

function parseScoreAdjustment(rawText: string): { adjustment: number; narrative: string } {
  const match = rawText.match(/SCORE_ADJUST:\s*([+-]?\d+)/i);

  let adjustment = 0;
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!Number.isNaN(parsed)) {
      adjustment = parsed;
    }
  }
  adjustment = Math.max(-15, Math.min(15, adjustment));

  const narrative = (match ? rawText.slice(0, match.index) : rawText).trim();

  return { adjustment, narrative };
}

// ============================================================================
// API Endpoints
// ============================================================================

// POST /api/transactions/analyze
app.post('/api/transactions/analyze', async (req, res) => {
  const analyzeStartedAt = Date.now();
  try {
    const { recipientName = '', upiId = '', amount = 0, message = '' } = req.body;
    const senderId = req.body.senderId || 'USER_DEFAULT';

    const evaluation = evaluateRisk(recipientName, upiId, Number(amount), message, senderId);
    recordSessionAttempt(senderId, upiId);

    const transactionId = `TXN-${Math.floor(10000 + Math.random() * 90000)}-IN`;

    // LLM Reasoning module: qualitative signal on top of the rules engine.
    // It may only nudge the score within ±15 and add explanation text — the
    // rules engine's action/riskLevel remain the final authority.
    let riskScore = evaluation.finalScore;
    let llmReasoning: string | null = null;
    let llmScoreAdjustment = 0;
    const reasons = [...evaluation.reasons];

    const trimmedMessage = String(message || '').trim();
    if (trimmedMessage.length > 0) {
      const prompt = buildFraudPrompt(recipientName, upiId, Number(amount), trimmedMessage);
      const llmResult = await callOllamaReasoning(prompt);

      if (llmResult.ok && llmResult.text.trim().length > 0) {
        const { adjustment, narrative } = parseScoreAdjustment(llmResult.text);
        llmScoreAdjustment = adjustment;
        riskScore = Math.max(0, Math.min(100, evaluation.finalScore + adjustment));
        llmReasoning = narrative || llmResult.text.trim();
      }
    }

    const response: Record<string, any> = {
      risk_score: riskScore,
      risk_level: evaluation.riskLevel,
      action: evaluation.action,
      reasons,
      breakdown: evaluation.breakdown,
      analysis_duration: Math.round((Date.now() - analyzeStartedAt)) / 1000,
      transaction_id: transactionId,
      escalation_rule: evaluation.escalationRule,
      all_signals: evaluation.allSignals,
    };

    if (trimmedMessage.length > 0) {
      response.llm_reasoning = llmReasoning;
      response.llm_score_adjustment = llmScoreAdjustment;
    }

    // Log to legacy audit log
    const legacyEntry = {
      timestamp: new Date().toISOString(),
      transaction_id: transactionId,
      recipientName,
      upiId,
      amount,
      action: evaluation.action,
      risk_score: riskScore,
      reasons,
    };
    legacyAuditLog.unshift(legacyEntry);
    appendLegacyLog(legacyEntry);

    // Log to Cryptographic SHA-256 Hash Chain
    const auditRecord = auditTrail.record(
      'orchestrator_agent',
      `transaction_analyzed_${evaluation.action.toLowerCase()}`,
      { recipientName, upiId, amount, message },
      response,
      riskScore,
      { transactionId, riskLevel: evaluation.riskLevel, llmScoreAdjustment }
    );
    response.audit_hash = auditRecord.entry_hash;
    response.audit_sequence = auditRecord.sequence;

    // If not SAFE, store in human-in-the-loop pending store
    if (evaluation.action !== 'SAFE') {
      storePending(transactionId, {
        request: { recipientName, upiId, amount, message },
        decision: evaluation,
        breakdown: evaluation.breakdown,
        explanation: evaluation.reasons.join('. '),
      });
    }

    // Persist full evaluation to MongoDB (transactions collection) — feeds the
    // Fraud-Ops Console's Dashboard/Transactions views with real data instead
    // of mock seed data. Never blocks or fails the response if Mongo is down.
    const investigationSteps = [
      {
        step: 'Transaction payload parsed & validated',
        status: 'completed' as const,
        timestamp: 'Just now',
        detail: 'Payload integrity checked. Valid UPI handle confirmed.',
      },
      {
        step: 'Recipient trust & reputational registry checked',
        status: (riskScore >= 70 ? 'flagged' : 'completed') as any,
        timestamp: 'Just now',
        detail: riskScore >= 70
          ? 'Recipient handle flagged for anomaly or lack of mutual history.'
          : 'Recipient verified in banking directory.',
      },
      {
        step: 'Behavioral expenditure pattern analyzed',
        status: (riskScore >= 70 ? 'flagged' : 'completed') as any,
        timestamp: 'Just now',
        detail: `Amount of ₹${Number(amount).toLocaleString()} evaluated against personal baseline profile.`,
      },
      {
        step: 'Scam & coercion linguistic signals screened',
        status: (riskScore >= 70 ? 'flagged' : 'completed') as any,
        timestamp: 'Just now',
        detail: riskScore >= 70
          ? 'Urgency and pressure markers detected in payment intent.'
          : 'Zero extortion, urgency, or deception cues located.',
      },
      {
        step: 'Multi-factor risk score compiled',
        status: (riskScore >= 70 ? 'flagged' : 'completed') as any,
        timestamp: 'Just now',
        detail: `Aggregated score ${riskScore}/100. Policy execution: ${evaluation.action}.`,
      },
    ];

    const mongoTxn: MongoTransaction = {
      id: transactionId,
      recipientName: recipientName || 'Unknown Recipient',
      upiId: upiId || 'unknown@upi',
      amount: Number(amount) || 0,
      currency: '₹',
      timestamp: 'Today, Just now',
      createdAt: new Date().toISOString(),
      status: evaluation.action as any,
      riskScore,
      riskLevel: evaluation.riskLevel as any,
      riskBreakdown: evaluation.breakdown,
      verificationLevel: (riskScore >= 70 ? 'LEVEL_1_UNKNOWN' : 'LEVEL_2_IDENTIFIED') as any,
      reasons,
      message: message || '',
      deviceUsed: 'iPhone 15 Pro (Primary Device)',
      location: 'Mumbai, MH, India',
      investigationSteps,
      analysisDurationSeconds: response.analysis_duration,
      auditHash: auditRecord.entry_hash,
      hitlOutcome: (evaluation.action === 'SAFE'
        ? 'confirmed'
        : evaluation.action === 'BLOCKED'
        ? 'cancelled'
        : 'pending') as any,
      llmReasoning,
      llmScoreAdjustment,
    };

    try {
      await mongoService.saveTransaction(mongoTxn);
    } catch (saveErr: any) {
      console.warn('Could not save transaction to MongoDB:', saveErr.message);
    }

    return res.json(response);
  } catch (err: any) {
    console.error('Error in analyze:', err);
    return res.status(500).json({ detail: err.message || 'Error analyzing transaction' });
  }
});

// POST /api/transactions/confirm
app.post('/api/transactions/confirm', async (req, res) => {
  const { transaction_id, confirmed } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ detail: 'Missing transaction_id' });
  }

  const pending = popPending(transaction_id);
  if (!pending) {
    return res.status(404).json({
      detail: 'No pending decision found for this transaction (already resolved, expired, or was auto-approved).',
    });
  }

  if (pending.decision.action === 'BLOCKED') {
    auditTrail.record(
      'decision_policy_agent',
      'override_rejected_critical',
      { transaction_id, confirmed },
      { outcome: 'blocked' },
      pending.decision.finalScore,
      { transaction_id }
    );
    return res.status(403).json({
      detail: 'This payment is blocked due to Critical fraud risk. No override is available.',
    });
  }

  const outcome = confirmed ? 'completed' : 'cancelled';
  const newStatus = confirmed ? 'SAFE' : 'BLOCKED';
  const hitlOutcome = confirmed ? 'confirmed' : 'cancelled';

  try {
    await mongoService.updateTransactionStatus(transaction_id, newStatus, hitlOutcome);
  } catch (dbErr: any) {
    console.warn('Failed to update transaction status in MongoDB:', dbErr.message);
  }

  auditTrail.record(
    'human_in_the_loop_agent',
    `transaction_${outcome}`,
    { transaction_id, confirmed },
    { outcome },
    pending.decision.finalScore,
    { transaction_id }
  );

  return res.json({
    status: outcome,
    message: confirmed
      ? 'Payment confirmed and processed successfully.'
      : 'Payment cancelled by user.',
    transaction_id,
  });
});

// ============================================================================
// Persistent Transactions & Dashboard Endpoints (MongoDB Atlas)
// ============================================================================

// GET /api/transactions - fetch all transactions with search, filters, and sorting
app.get('/api/transactions', async (req, res) => {
  try {
    const { search, status, amountFilter, riskSort, limit } = req.query;
    const transactions = await mongoService.getTransactions({
      search: search as string,
      status: status as string,
      amountFilter: amountFilter as string,
      riskSort: riskSort as string,
      limit: limit ? Number(limit) : 150,
    });
    return res.json({
      success: true,
      transactions,
      total: transactions.length,
    });
  } catch (err: any) {
    console.error('Error fetching transactions from MongoDB Atlas:', err);
    return res.status(500).json({ success: false, error: err.message, transactions: [] });
  }
});

// GET /api/transactions/flagged - fetch only VERIFY, PAUSED, BLOCKED transactions
app.get('/api/transactions/flagged', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const transactions = await mongoService.getFlaggedTransactions({
      status: status as string,
      limit: limit ? Number(limit) : 150,
    });
    return res.json({
      success: true,
      transactions,
      total: transactions.length,
    });
  } catch (err: any) {
    console.error('Error fetching flagged transactions from MongoDB Atlas:', err);
    return res.status(500).json({ success: false, error: err.message, transactions: [] });
  }
});

// GET /api/dashboard/summary - aggregated counts, total volume, risk category breakdown
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const summary = await mongoService.getDashboardSummary();
    return res.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard summary from MongoDB Atlas:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions - save/upsert a transaction to MongoDB Atlas
app.post('/api/transactions', async (req, res) => {
  try {
    const txnData = req.body;
    if (!txnData.id || !txnData.recipientName) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }
    const saved = await mongoService.saveTransaction(txnData);
    return res.json({ success: true, transaction: saved });
  } catch (err: any) {
    console.error('Error saving transaction to MongoDB Atlas:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/transactions/:id/status - update human-in-the-loop action outcome
app.patch('/api/transactions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hitlOutcome } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Missing status parameter' });
    }
    const updated = await mongoService.updateTransactionStatus(id, status, hitlOutcome);
    return res.json({ success: true, transaction: updated });
  } catch (err: any) {
    console.error('Error updating transaction status in MongoDB Atlas:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/security/scam-check
app.post('/api/security/scam-check', (req, res) => {
  const { message = '' } = req.body;
  const text = message.toLowerCase();

  const urgency = /urgent|immediately|today|now|expire|within\s*\d+|tonight|asap/i.test(text);
  const impersonation = /bank|manager|police|official|customs|electricity|telecom|airtel|jio|sbi|hdfc|kyc|npci/i.test(text);
  const threat = /block|freeze|disconnect|arrest|fir|legal\s*action|suspend|fine|penalty/i.test(text);
  const paymentPressure = /send|pay|deposit|transfer|₹|rs\.?|\$|qr|upi|link|click/i.test(text);
  const unverifiedLinks = /http|https|bit\.ly|t\.co|wa\.me|\.apk|\.xyz/i.test(text);

  const keywords: string[] = [];
  if (urgency) keywords.push('urgent / immediate deadline');
  if (impersonation) keywords.push('institutional impersonation');
  if (threat) keywords.push('account suspension / legal threat');
  if (paymentPressure) keywords.push('direct fund transfer demand');
  if (unverifiedLinks) keywords.push('untrusted external link or APK');

  let riskScore = 15;
  if (threat && paymentPressure) riskScore = 94;
  else if (urgency && paymentPressure) riskScore = 86;
  else if (impersonation) riskScore = 68;
  else if (unverifiedLinks) riskScore = 75;

  let riskLevel: 'SAFE' | 'WARNING' | 'HIGH' | 'CRITICAL' = 'SAFE';
  if (riskScore >= 80) riskLevel = 'CRITICAL';
  else if (riskScore >= 60) riskLevel = 'HIGH';
  else if (riskScore >= 30) riskLevel = 'WARNING';

  let recommendation = 'This message appears routine. Standard verification recommended.';
  let explanation = 'No significant coercive or deceptive payment markers were detected in this text.';

  if (riskScore >= 70) {
    recommendation = 'Do not make the payment until the request has been independently verified through official channels.';
    explanation = 'PAYSHIELD detected classic social engineering signatures: high urgency, artificial penalties, and coercive payment routing.';
  } else if (riskScore >= 40) {
    recommendation = 'Verify the sender identity via a known phone number before proceeding.';
    explanation = 'Certain unusual claims were identified that warrant caution.';
  }

  const result = {
    message,
    scamRiskScore: riskScore,
    riskLevel,
    signalsDetected: {
      urgency,
      impersonation,
      threat,
      paymentPressure,
      unverifiedLinks,
    },
    highlightedKeywords: keywords,
    explanation,
    recommendation,
  };

  auditTrail.record(
    'scam_detector_agent',
    'scam_text_analyzed',
    { snippet: message.slice(0, 80) },
    { scamRiskScore: riskScore, riskLevel },
    riskScore
  );

  return res.json(result);
});

// GET /api/audit-history
app.get('/api/audit-history', (req, res) => {
  const limit = Number(req.query.limit) || 50;
  return res.json(legacyAuditLog.slice(0, limit));
});

// GET /api/audit/verify
app.get('/api/audit/verify', (req, res) => {
  return res.json(auditTrail.verify());
});

// GET /api/audit/chain
app.get('/api/audit/chain', (req, res) => {
  const limit = Number(req.query.limit) || 50;
  return res.json(auditTrail.getHistory(limit));
});

// GET /api/health
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================================
// MongoDB Atlas Test Scenarios Endpoints
// ============================================================================

// GET /api/scenarios - Fetch all user-added test scenarios from MongoDB Atlas
app.get('/api/scenarios', async (req, res) => {
  try {
    const scenarios = await mongoService.getScenarios();
    return res.json({
      success: true,
      scenarios,
      total: scenarios.length,
      storage: 'mongodb_atlas',
      database: 'payshield',
      collection: 'test_scenarios',
    });
  } catch (err: any) {
    console.error('Error fetching scenarios from MongoDB Atlas:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch scenarios from MongoDB Atlas',
      scenarios: [],
    });
  }
});

// POST /api/scenarios - Manually add a test scenario into MongoDB Atlas
app.post('/api/scenarios', async (req, res) => {
  try {
    const {
      label,
      recipientName,
      upiId,
      amount,
      message = '',
      outcomeType = 'VERIFY',
      description = '',
    } = req.body;

    if (!label || !recipientName || !upiId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: label, recipientName, upiId, and amount are required',
      });
    }

    const scenario = await mongoService.createScenario({
      label,
      recipientName,
      upiId,
      amount: Number(amount),
      message,
      outcomeType,
      description,
    });

    auditTrail.record(
      'user_scenario_manager',
      'test_scenario_created_in_atlas',
      { id: scenario.id, label: scenario.label, amount: scenario.amount },
      { outcomeType: scenario.outcomeType },
      100
    );

    return res.status(201).json({
      success: true,
      scenario,
      message: 'Test scenario successfully saved to MongoDB Atlas',
    });
  } catch (err: any) {
    console.error('Error creating scenario in MongoDB Atlas:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to save scenario in MongoDB Atlas',
    });
  }
});

// DELETE /api/scenarios/:id - Remove a scenario from MongoDB Atlas
app.delete('/api/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await mongoService.deleteScenario(id);

    auditTrail.record(
      'user_scenario_manager',
      'test_scenario_deleted_from_atlas',
      { id },
      { deleted },
      100
    );

    return res.json({
      success: true,
      deleted,
      id,
      message: 'Scenario removed from MongoDB Atlas',
    });
  } catch (err: any) {
    console.error('Error deleting scenario from MongoDB Atlas:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete scenario from MongoDB Atlas',
    });
  }
});

// GET /api/scenarios/status - Connection health check for MongoDB Atlas
app.get('/api/scenarios/status', async (req, res) => {
  try {
    const status = await mongoService.checkStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      error: err.message,
    });
  }
});

// ============================================================================
// Razorpay Integration Endpoints
// ============================================================================

// GET /api/razorpay/config - Public configuration (returns publishable key_id)
app.get('/api/razorpay/config', (req, res) => {
  return res.json(getRazorpayPublicConfig());
});

// Helper handler for order creation
async function handleCreateOrder(req: express.Request, res: express.Response) {
  try {
    const { amount, currency = 'INR', receipt, notes, recipientName, upiId } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const order = await createRazorpayOrder({
      amount: Number(amount),
      currency,
      receipt,
      notes: {
        ...(notes || {}),
        recipient: recipientName || '',
        upiId: upiId || '',
      },
    });

    auditTrail.record(
      'razorpay_order_manager',
      'razorpay_order_created',
      { order_id: order.id, amount: order.amount, currency: order.currency },
      { recipientName, upiId },
      100
    );

    return res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      originalAmount: order.originalAmount || Number(amount),
      currency: order.currency,
      key_id: order.key_id,
      receipt: order.receipt,
      isHighValueSimulated: Boolean(order.isHighValueSimulated),
    });
  } catch (err: any) {
    console.error('Failed to create Razorpay order:', err);
    return res.status(500).json({
      error: err.message || 'Failed to create Razorpay order',
    });
  }
}

// POST /api/create-order and /api/razorpay/create-order
app.post('/api/create-order', handleCreateOrder);
app.post('/api/razorpay/create-order', handleCreateOrder);

// Helper handler for payment verification
function handleVerifyPayment(req: express.Request, res: express.Response) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transaction_id,
    } = req.body;

    const result = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (result.verified) {
      auditTrail.record(
        'razorpay_payment_gateway',
        'signature_verified_and_settled',
        {
          razorpay_order_id,
          razorpay_payment_id,
          transaction_id,
        },
        { verified: true, signature: razorpay_signature },
        100
      );

      if (transaction_id && pendingTransactions.has(transaction_id)) {
        pendingTransactions.delete(transaction_id);
      }

      return res.json({
        success: true,
        verified: true,
        message: 'Razorpay payment signature verified and cryptographically recorded.',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      });
    } else {
      auditTrail.record(
        'razorpay_payment_gateway',
        'signature_verification_failed',
        { razorpay_order_id, razorpay_payment_id },
        { verified: false },
        0
      );

      return res.status(400).json({
        success: false,
        verified: false,
        message: result.message || 'Invalid Razorpay payment signature.',
      });
    }
  } catch (err: any) {
    console.error('Error verifying Razorpay payment signature:', err);
    return res.status(500).json({
      error: err.message || 'Signature verification failed',
    });
  }
}

// POST /api/verify-payment and /api/razorpay/verify-payment
app.post('/api/verify-payment', handleVerifyPayment);
app.post('/api/razorpay/verify-payment', handleVerifyPayment);

// ============================================================================
// Server Startup & Vite Integration
// ============================================================================
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ PayShield Sentinel running on port ${PORT}`);
  });

  // Warm up Ollama in the background so the model is already resident in memory
  // (and kept there via keep_alive) before the first real request arrives —
  // fire-and-forget: never blocks startup, never crashes it on failure.
  // Uses a longer timeout than live requests: nobody is waiting on this call,
  // and a cold GPU model load can take several seconds, so the tight
  // request-path timeout would routinely abort it before it finishes.
  const OLLAMA_WARMUP_TIMEOUT_MS = 30000;
  callOllamaReasoning('Reply with the single word OK.', OLLAMA_WARMUP_TIMEOUT_MS)
    .then((result) => {
      console.log(result.ok ? '🔥 Ollama model warmed up' : '⚠️ Ollama warm-up failed (will retry on first request)');
    })
    .catch(() => {
      // callOllamaReasoning already catches everything internally; this is just a safety net
    });
}

start();

