export type RiskLevel = 'SAFE' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type TransactionStatus = 'SAFE' | 'VERIFY' | 'PAUSED' | 'BLOCKED';
export type VerificationLevel = 'LEVEL_1_UNKNOWN' | 'LEVEL_2_IDENTIFIED' | 'LEVEL_3_VERIFIED' | 'LEVEL_4_TRUSTED';
export type ProtectionMode = 'STANDARD' | 'STRICT' | 'MAXIMUM';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface RiskBreakdown {
  transactionRisk: number; // 0-100
  recipientRisk: number;   // 0-100
  behaviorRisk: number;    // 0-100
  socialEngineeringRisk: number; // 0-100
  networkRisk: number;     // 0-100
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'POLICY_TRIGGERED' | 'THREAT_BLOCKED' | 'PAYMENT_PAUSED' | 'RECIPIENT_VERIFIED' | 'DEVICE_AUTHENTICATED';
  title: string;
  description: string;
  riskScore?: number;
  severity: AlertSeverity;
}

export interface TransactionHistoryStep {
  step: string;
  status: 'completed' | 'processing' | 'flagged' | 'pending';
  timestamp: string;
  detail: string;
}

export interface Transaction {
  id: string;
  recipientName: string;
  upiId: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: TransactionStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  riskBreakdown: RiskBreakdown;
  verificationLevel: VerificationLevel;
  reasons: string[];
  message?: string;
  deviceUsed?: string;
  location?: string;
  investigationSteps: TransactionHistoryStep[];
  analysisDurationSeconds: number;
}

export interface SecurityAlert {
  id: string;
  transactionId?: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  actionRequired: boolean;
  resolved: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  upiId: string;
  trustLevel: VerificationLevel;
  totalTransactions: number;
  totalVolume: number;
  lastPaymentDate: string;
  flaggedCount: number;
  verifiedAt?: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  lastActive: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
}

export interface ScamCheckResult {
  message: string;
  scamRiskScore: number;
  riskLevel: RiskLevel;
  signalsDetected: {
    urgency: boolean;
    impersonation: boolean;
    threat: boolean;
    paymentPressure: boolean;
    unverifiedLinks: boolean;
  };
  highlightedKeywords: string[];
  explanation: string;
  recommendation: string;
}

export interface AnalyzePaymentPayload {
  recipientName: string;
  upiId: string;
  amount: number;
  message?: string;
}

export interface AnalyzePaymentResponse {
  risk_score: number;
  risk_level: RiskLevel;
  action: TransactionStatus;
  reasons: string[];
  breakdown: RiskBreakdown;
  analysis_duration: number;
  transaction_id: string;
}
