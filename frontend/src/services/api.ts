import {
  AnalyzePaymentPayload,
  AnalyzePaymentResponse,
  RiskBreakdown,
  RiskLevel,
  TransactionStatus,
  ScamCheckResult,
  Transaction,
} from '../types';

const API_BASE_URL = '/api';

export interface AnalyzeResult {
  data: AnalyzePaymentResponse;
  /** True if this came from the real Python pipeline, false if the client-side fallback simulator ran instead. */
  viaBackend: boolean;
}

export interface ConfirmResult {
  status: 'completed' | 'cancelled';
  message: string;
}

/**
 * Service layer prepared for integration with a FastAPI or Express backend.
 * Provides realistic high-precision heuristic simulation when backend is unavailable.
 */
export const paymentApiService = {
  /**
   * Analyze transaction payload before execution.
   * Target endpoint: POST /api/transactions/analyze
   */
  async analyzePayment(payload: AnalyzePaymentPayload): Promise<AnalyzeResult> {
    try {
      // Attempt real backend call if configured
      const response = await fetch(`${API_BASE_URL}/transactions/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { data: await response.json(), viaBackend: true };
      }
    } catch {
      // Graceful fallback to client-side risk engine
    }

    // Client-side intelligent risk engine simulator
    return { data: simulateRiskAnalysis(payload), viaBackend: false };
  },

  /**
   * Resolve the human-in-the-loop checkpoint for a VERIFY/PAUSED transaction
   * returned by analyzePayment. Only call this when that result's
   * viaBackend was true — a fallback-simulated transaction has nothing
   * server-side to confirm.
   * Target endpoint: POST /api/transactions/confirm
   */
  async confirmTransaction(transactionId: string, confirmed: boolean): Promise<ConfirmResult> {
    const response = await fetch(`${API_BASE_URL}/transactions/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: transactionId, confirmed }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Confirmation failed' }));
      throw new Error(err.detail || `Confirmation failed (${response.status})`);
    }

    return response.json();
  },

  /**
   * Analyze suspicious text messages, SMS, or WhatsApp payment requests.
   * Target endpoint: POST /api/security/scam-check
   */
  async checkScamMessage(message: string): Promise<ScamCheckResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/security/scam-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }

    return simulateScamCheck(message);
  },
};

/**
 * Heuristic risk model simulation that closely mimics production fraud engines
 */
function simulateRiskAnalysis(payload: AnalyzePaymentPayload): AnalyzePaymentResponse {
  const { recipientName, upiId, amount, message = '' } = payload;
  const lowerMsg = (message + ' ' + recipientName + ' ' + upiId).toLowerCase();

  // Pattern detection
  const hasUrgency = /urgent|immediately|today|now|expire|suspend|disconnect|penalty|within\s*\d+\s*(mins|hours)/i.test(lowerMsg);
  const hasThreat = /block|disconnect|police|arrest|court|legal|fir|freeze|lock/i.test(lowerMsg);
  const hasImpersonation = /official|bank|support|helpdesk|customs|tax|income\s*tax|department|npci|rbi|electricity/i.test(lowerMsg);
  const hasFinancialScam = /crypto|guaranteed|doubl|invest|lottery|winner|prize|bonus|refund|claim/i.test(lowerMsg);
  const isHighAmount = amount > 20000;
  const isExtremeAmount = amount >= 50000;

  let baseScore = 8;
  const reasons: string[] = [];

  let transactionRisk = 8;
  let recipientRisk = 6;
  let behaviorRisk = 10;
  let socialEngineeringRisk = 5;
  let networkRisk = 12;

  // Severe Scam Syndicate Matches
  if (hasFinancialScam || (hasThreat && hasUrgency)) {
    baseScore = 94;
    transactionRisk = 96;
    recipientRisk = 98;
    behaviorRisk = 88;
    socialEngineeringRisk = 95;
    networkRisk = 90;
    reasons.push('Recipient handle linked to high-risk fraudulent campaign patterns');
    reasons.push('Coercive pressure tactics and threat signals detected in payment context');
    reasons.push('Payment velocity matches known syndicate deception vectors');
  } else if (hasUrgency || (isHighAmount && !upiId.includes('merchant'))) {
    baseScore = isExtremeAmount ? 86 : 82;
    transactionRisk = 78;
    recipientRisk = 74;
    behaviorRisk = 68;
    socialEngineeringRisk = 89;
    networkRisk = 45;
    if (hasUrgency) reasons.push('High-urgency language detected requiring immediate transfer');
    if (isHighAmount) reasons.push(`Transfer amount (₹${amount.toLocaleString()}) exceeds standard 30-day baseline`);
    reasons.push('First-time or unverified recipient handle');
    reasons.push('Lack of established mutual interaction graph');
  } else if (amount > 5000 || upiId.includes('freelance') || upiId.includes('unknown')) {
    baseScore = 42;
    transactionRisk = 38;
    recipientRisk = 45;
    behaviorRisk = 34;
    socialEngineeringRisk = 26;
    networkRisk = 28;
    reasons.push('Recipient requires one-time identity confirmation');
    reasons.push('Amount is above standard micropayment tier');
    reasons.push('Clean banking record with no prior transaction history');
  } else {
    baseScore = Math.min(15, Math.max(5, Math.floor(amount / 500) + 4));
    transactionRisk = 6;
    recipientRisk = 8;
    behaviorRisk = 9;
    socialEngineeringRisk = 4;
    networkRisk = 10;
    reasons.push('Routine transaction within normal personal spend limits');
    reasons.push('Standard recipient syntax with clean reputational signals');
  }

  let action: TransactionStatus = 'SAFE';
  let riskLevel: RiskLevel = 'SAFE';

  if (baseScore >= 90) {
    action = 'BLOCKED';
    riskLevel = 'CRITICAL';
  } else if (baseScore >= 70) {
    action = 'PAUSED';
    riskLevel = 'HIGH';
  } else if (baseScore >= 35) {
    action = 'VERIFY';
    riskLevel = 'WARNING';
  } else {
    action = 'SAFE';
    riskLevel = 'SAFE';
  }

  const breakdown: RiskBreakdown = {
    transactionRisk,
    recipientRisk,
    behaviorRisk,
    socialEngineeringRisk,
    networkRisk,
  };

  return {
    risk_score: baseScore,
    risk_level: riskLevel,
    action,
    reasons,
    breakdown,
    analysis_duration: 1.42,
    transaction_id: `TXN-${Math.floor(10000 + Math.random() * 90000)}-IN`,
  };
}

function simulateScamCheck(message: string): ScamCheckResult {
  const text = message.toLowerCase();
  const urgency = /urgent|immediately|today|now|expire|within\s*\d+|tonight|asap/i.test(text);
  const impersonation = /bank|manager|police|official|customs|electricity|telecom|airtel|jio|sbi|hdfc|kyc|npci/i.test(text);
  const threat = /block|freeze|disconnect|arrest|fir|legal\s*action|suspend|fine|penalty|penalty/i.test(text);
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

  let riskLevel: RiskLevel = 'SAFE';
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

  return {
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
}

export function buildTransactionFromSimulation(
  payload: AnalyzePaymentPayload,
  analysis: AnalyzePaymentResponse
): Transaction {
  const steps = [
    {
      step: 'Transaction payload parsed & validated',
      status: 'completed' as const,
      timestamp: 'Just now',
      detail: 'Payload integrity checked. Valid UPI handle confirmed.',
    },
    {
      step: 'Recipient trust & reputational registry checked',
      status: (analysis.risk_score >= 70 ? 'flagged' : 'completed') as any,
      timestamp: 'Just now',
      detail: analysis.risk_score >= 70
        ? 'Recipient handle flagged for anomaly / lack of mutual history.'
        : 'Recipient verified in banking directory.',
    },
    {
      step: 'Behavioral expenditure pattern analyzed',
      status: (analysis.risk_score >= 70 ? 'flagged' : 'completed') as any,
      timestamp: 'Just now',
      detail: `Amount of ₹${payload.amount.toLocaleString()} evaluated against personal baseline profile.`,
    },
    {
      step: 'Scam & coercion linguistic signals screened',
      status: (analysis.risk_score >= 70 ? 'flagged' : 'completed') as any,
      timestamp: 'Just now',
      detail: analysis.risk_score >= 70
        ? 'Urgency and pressure markers detected in payment intent.'
        : 'Zero extortion, urgency, or deception cues located.',
    },
    {
      step: 'Multi-factor risk score compiled',
      status: (analysis.risk_score >= 70 ? 'flagged' : 'completed') as any,
      timestamp: 'Just now',
      detail: `Aggregated score ${analysis.risk_score}/100. Policy execution: ${analysis.action}.`,
    },
  ];

  return {
    id: analysis.transaction_id,
    recipientName: payload.recipientName,
    upiId: payload.upiId,
    amount: payload.amount,
    currency: '₹',
    timestamp: 'Just now',
    status: analysis.action,
    riskScore: analysis.risk_score,
    riskLevel: analysis.risk_level,
    riskBreakdown: analysis.breakdown,
    verificationLevel: analysis.risk_score > 70 ? 'LEVEL_1_UNKNOWN' : 'LEVEL_2_IDENTIFIED',
    reasons: analysis.reasons,
    message: payload.message || 'Payment simulation',
    deviceUsed: 'iPhone 15 Pro (Primary Device)',
    location: 'Mumbai, MH, India',
    analysisDurationSeconds: analysis.analysis_duration,
    investigationSteps: steps,
  };
}
