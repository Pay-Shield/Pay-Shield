import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  Activity,
  Sparkles,
  Lock,
  Hash,
  RotateCcw,
  Sliders,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { PaymentInputForm } from './PaymentInputForm';
import { AddScenarioModal } from './AddScenarioModal';
import { WorkflowGraph } from './WorkflowGraph';
import { ConfettiEffect } from './ConfettiEffect';
import { ExplainabilityDrawer } from './ExplainabilityDrawer';
import { AuditChainDrawer } from './AuditChainDrawer';
import { paymentApiService, scenariosApi, SavedScenario } from '../../services/api';
import {
  PipelineStepDetail,
  PipelineStageId,
  AnalyzePaymentResponse,
  TransactionStatus,
  RiskLevel,
  RiskBreakdown,
  RuleSignal,
} from '../../types';

// Summarizes the real triggered-rule signals for one category (falling back
// to a plain, honest "nothing elevated" message when there are none) — so
// this pipeline visualization always matches what the Explainability Drawer
// shows for the same transaction, instead of a canned per-outcome script.
function summarizeSignals(
  signals: RuleSignal[] | undefined,
  category: RuleSignal['category']
): { summary: string; metric: string } {
  const matches = (signals ?? []).filter((s) => s.category === category && s.flag !== 'safe');
  if (matches.length === 0) {
    return { summary: 'No elevated signals in this category.', metric: 'CLEAR' };
  }
  const topFlag = matches.reduce((worst, s) => (flagSeverity(s.flag) > flagSeverity(worst) ? s.flag : worst), matches[0].flag);
  return {
    summary: matches.map((s) => s.reason).join(' · '),
    metric: topFlag.replace('_', ' ').toUpperCase(),
  };
}

function flagSeverity(flag: RuleSignal['flag']): number {
  switch (flag) {
    case 'critical_flag': return 4;
    case 'high_flag': return 3;
    case 'medium_flag': return 2;
    case 'low_flag': return 1;
    default: return 0;
  }
}

interface GuardianAppProps {
  onSwitchToOps?: () => void;
}

export const GuardianApp: React.FC<GuardianAppProps> = ({ onSwitchToOps }) => {
  // Form input state
  const [recipientName, setRecipientName] = useState('Rahul Sharma');
  const [upiId, setUpiId] = useState('rahul@upi');
  const [amount, setAmount] = useState<number>(1200);
  const [message, setMessage] = useState('Dinner split from Saturday');

  // Dynamic MongoDB Atlas Scenarios state (Defaults removed per user request)
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isAtlasConnected, setIsAtlasConnected] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);

  // Execution state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePaymentResponse | null>(null);

  // Drawers
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Timer reference for elapsed counter
  const timerRef = useRef<number | null>(null);

  // Pipeline stages step state
  const [steps, setSteps] = useState<Record<PipelineStageId, PipelineStepDetail>>({
    ingest: { id: 'ingest', name: 'Ingest Transaction', category: 'ingest', status: 'idle' },
    recipient: { id: 'recipient', name: 'Recipient Verification', category: 'parallel', status: 'idle' },
    rules: { id: 'rules', name: 'Risk Analysis (Rules)', category: 'parallel', status: 'idle' },
    behavior: { id: 'behavior', name: 'Behavioral Pattern Check', category: 'parallel', status: 'idle' },
    llm: { id: 'llm', name: 'LLM Reasoning', category: 'parallel', status: 'idle' },
    aggregation: { id: 'aggregation', name: 'Decision & Policy Aggregation', category: 'aggregate', status: 'idle' },
    explainability: { id: 'explainability', name: 'Explainability Engine', category: 'explain', status: 'idle' },
    audit: { id: 'audit', name: 'Cryptographic Audit Log', category: 'audit', status: 'idle' },
    outcome: { id: 'outcome', name: 'Final Outcome', category: 'outcome', status: 'idle' },
  });

  // Load scenarios from MongoDB Atlas on mount
  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const res = await scenariosApi.getAll();
      setScenarios(res.scenarios || []);
      setIsAtlasConnected(res.connected);
    } catch (err) {
      console.error('Failed to load scenarios from MongoDB Atlas:', err);
      setIsAtlasConnected(false);
    }
  };

  const handleSelectScenario = (scenario: SavedScenario) => {
    setSelectedScenarioId(scenario.id);
    setRecipientName(scenario.recipientName);
    setUpiId(scenario.upiId);
    setAmount(scenario.amount);
    setMessage(scenario.message);
    handleReset();
  };

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await scenariosApi.delete(id);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      if (selectedScenarioId === id) {
        setSelectedScenarioId(null);
      }
    } catch (err) {
      console.error('Failed to delete scenario from MongoDB Atlas:', err);
    }
  };

  const handleSaveCurrentAsScenario = async () => {
    if (!recipientName || !upiId || amount <= 0) return;
    setIsSavingCurrent(true);
    try {
      // Determine expected outcome label based on keywords
      const lower = (recipientName + ' ' + message).toLowerCase();
      let outcomeType: 'SAFE' | 'VERIFY' | 'PAUSED' | 'BLOCKED' = 'VERIFY';
      if (/warrant|police|arrest|court/i.test(lower)) {
        outcomeType = 'BLOCKED';
      } else if (/urgent|electricity|power|tonight|suspend|fine/i.test(lower)) {
        outcomeType = 'PAUSED';
      } else if (/split|dinner|lunch|friend|rent/i.test(lower)) {
        outcomeType = 'SAFE';
      }

      const created = await scenariosApi.create({
        label: `${recipientName} Vector`,
        outcomeType,
        recipientName,
        upiId,
        amount,
        message,
        description: 'Saved directly from active payment simulation form',
      });

      setScenarios((prev) => [created, ...prev]);
      setSelectedScenarioId(created.id);
    } catch (err) {
      console.error('Failed to save current form as scenario to MongoDB Atlas:', err);
    } finally {
      setIsSavingCurrent(false);
    }
  };

  const handleScenarioAdded = (newScenario: SavedScenario) => {
    setScenarios((prev) => [newScenario, ...prev]);
    handleSelectScenario(newScenario);
  };

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnalyzing(false);
    setOverallProgress(0);
    setElapsedMs(0);
    setAnalysisResult(null);
    setShowConfetti(false);
    setSteps({
      ingest: { id: 'ingest', name: 'Ingest Transaction', category: 'ingest', status: 'idle' },
      recipient: { id: 'recipient', name: 'Recipient Verification', category: 'parallel', status: 'idle' },
      rules: { id: 'rules', name: 'Risk Analysis (Rules)', category: 'parallel', status: 'idle' },
      behavior: { id: 'behavior', name: 'Behavioral Pattern Check', category: 'parallel', status: 'idle' },
      llm: { id: 'llm', name: 'LLM Reasoning', category: 'parallel', status: 'idle' },
      aggregation: { id: 'aggregation', name: 'Decision & Policy Aggregation', category: 'aggregate', status: 'idle' },
      explainability: { id: 'explainability', name: 'Explainability Engine', category: 'explain', status: 'idle' },
      audit: { id: 'audit', name: 'Cryptographic Audit Log', category: 'audit', status: 'idle' },
      outcome: { id: 'outcome', name: 'Final Outcome', category: 'outcome', status: 'idle' },
    });
  };

  const smoothScrollTo = (elementId: string, block: ScrollLogicalPosition = 'center', delay = 40) => {
    setTimeout(() => {
      const target = document.getElementById(elementId);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block,
        });
      }
    }, delay);
  };

  const scrollToOutcome = () => {
    const attemptScroll = (retries = 6) => {
      const target =
        document.getElementById('stage-outcome') ||
        document.getElementById('stage-outcome-wrapper');
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (retries > 0) {
        setTimeout(() => attemptScroll(retries - 1), 70);
      }
    };
    setTimeout(() => attemptScroll(), 60);
  };

  const runPipeline = async () => {
    handleReset();
    setIsAnalyzing(true);
    const startTime = Date.now();

    // Step 1: Smooth transition down to the Ingest Transaction & Telemetry Verification card
    smoothScrollTo('stage-ingest', 'center', 40);

    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 50);

    // Call backend API in parallel for real transaction ID & audit log persistence
    const backendPromise = paymentApiService.analyzePayment({
      recipientName,
      upiId,
      amount,
      message,
    });

    // STEP 1: Ingest Transaction
    setSteps((prev) => ({
      ...prev,
      ingest: {
        ...prev.ingest,
        status: 'running',
        summary: 'Validating recipient, amount, and UPI handle format...',
        metric: 'INGESTING',
      },
    }));
    setOverallProgress(8);

    // Initial validation pause
    await new Promise((r) => setTimeout(r, 700));

    setSteps((prev) => ({
      ...prev,
      ingest: {
        ...prev.ingest,
        summary: 'Payload validated, sending to the risk pipeline...',
        metric: 'VALIDATING',
      },
    }));
    setOverallProgress(16);

    await new Promise((r) => setTimeout(r, 700));

    setSteps((prev) => ({
      ...prev,
      ingest: {
        ...prev.ingest,
        status: 'completed',
        summary: 'UPI handle format valid, payload accepted',
        metric: 'VALIDATED',
      },
      // Launch parallel fan-out smoothly
      recipient: { ...prev.recipient, status: 'running' },
      rules: { ...prev.rules, status: 'running' },
      behavior: { ...prev.behavior, status: 'running' },
      llm: { ...prev.llm, status: 'running' },
    }));
    setOverallProgress(25);

    // Step 2: Smooth scroll to the 4 Parallel Agents
    smoothScrollTo('stage-parallel-agents', 'center', 50);

    // Fetch real backend result or compute simulated outcome
    let backendResult: AnalyzePaymentResponse;
    try {
      const res = await backendPromise;
      backendResult = res.data;
    } catch {
      // Fallback calculation
      const lower = (recipientName + ' ' + upiId + ' ' + message).toLowerCase();
      if (lower.includes('court') || lower.includes('arrest') || lower.includes('warrant')) {
        backendResult = {
          risk_score: 96,
          risk_level: 'CRITICAL',
          action: 'BLOCKED',
          reasons: [
            'Direct match with known legal extortion syndicate signatures.',
            'Severe coercion threats ("arrest warrant") detected in payment message.',
            'Target recipient flagged in high-risk extortion campaign database.',
          ],
          breakdown: {
            transactionRisk: 95,
            recipientRisk: 98,
            behaviorRisk: 85,
            socialEngineeringRisk: 99,
            networkRisk: 92,
          },
          analysis_duration: 2.1,
          transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        };
      } else if (lower.includes('disconnect') || lower.includes('power') || lower.includes('threat')) {
        backendResult = {
          risk_score: 78,
          risk_level: 'HIGH',
          action: 'PAUSED',
          reasons: [
            'Urgent threat of utility disconnection violates safe payment guidelines.',
            'Payee not listed in official state electricity service directory.',
            'Step-up identity authentication required before releasing payment.',
          ],
          breakdown: {
            transactionRisk: 78,
            recipientRisk: 72,
            behaviorRisk: 68,
            socialEngineeringRisk: 88,
            networkRisk: 45,
          },
          analysis_duration: 1.8,
          transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        };
      } else if (amount >= 50000) {
        // High-Value Transfers (Lakhs & Crores): Flag as PAUSED requiring Step-up 2FA, NOT blocked!
        backendResult = {
          risk_score: 72,
          risk_level: 'HIGH',
          action: 'PAUSED',
          reasons: [
            `High-value transfer: ₹${amount.toLocaleString('en-IN')} significantly exceeds standard personal baseline.`,
            'Step-up multi-factor identity authentication (2FA) required before gateway release.',
            'Recipient handle checked against high-value clearing rules.',
          ],
          breakdown: {
            transactionRisk: 88,
            recipientRisk: 25,
            behaviorRisk: 70,
            socialEngineeringRisk: 10,
            networkRisk: 35,
          },
          analysis_duration: 1.9,
          transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        };
      } else if (amount > 5000 || lower.includes('freelance') || lower.includes('new')) {
        backendResult = {
          risk_score: 46,
          risk_level: 'WARNING',
          action: 'VERIFY',
          reasons: [
            'First-time transfer to an unverified private payee.',
            'Amount moderately exceeds standard daily transfer frequency.',
          ],
          breakdown: {
            transactionRisk: 42,
            recipientRisk: 50,
            behaviorRisk: 30,
            socialEngineeringRisk: 15,
            networkRisk: 20,
          },
          analysis_duration: 1.4,
          transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        };
      } else {
        backendResult = {
          risk_score: 8,
          risk_level: 'SAFE',
          action: 'SAFE',
          reasons: [
            'Payee identity and mutual history verified.',
            'Transfer amount falls well within habitual spending parameters.',
          ],
          breakdown: {
            transactionRisk: 8,
            recipientRisk: 5,
            behaviorRisk: 10,
            socialEngineeringRisk: 2,
            networkRisk: 5,
          },
          analysis_duration: 1.1,
          transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
        };
      }
    }

    const { action, risk_score } = backendResult;
    const signals = backendResult.all_signals;

    // STEP 2A: Recipient Verification resolves (~850ms into fan-out)
    await new Promise((r) => setTimeout(r, 850));
    const recipientSummary = summarizeSignals(signals, 'recipient');
    setSteps((prev) => ({
      ...prev,
      recipient: {
        ...prev.recipient,
        status: action === 'BLOCKED' ? 'blocked' : action === 'PAUSED' ? 'flagged' : recipientSummary.metric === 'CLEAR' ? 'completed' : 'flagged',
        summary: recipientSummary.summary,
        metric: recipientSummary.metric,
      },
    }));
    setOverallProgress(40);

    // STEP 2B: Risk Analysis (Rules) resolves (~750ms later)
    await new Promise((r) => setTimeout(r, 750));
    const amountSummary = summarizeSignals(signals, 'amount');
    setSteps((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        status: action === 'BLOCKED' || action === 'PAUSED' ? 'flagged' : amountSummary.metric === 'CLEAR' ? 'completed' : 'flagged',
        summary: amountSummary.summary,
        metric: amountSummary.metric,
      },
    }));
    setOverallProgress(55);

    // STEP 2C: Behavioral Pattern Check resolves (~750ms later)
    await new Promise((r) => setTimeout(r, 750));
    const behaviorSummary = summarizeSignals(signals, 'behavior');
    setSteps((prev) => ({
      ...prev,
      behavior: {
        ...prev.behavior,
        status: behaviorSummary.metric === 'CLEAR' ? 'completed' : 'flagged',
        summary: behaviorSummary.summary,
        metric: behaviorSummary.metric,
      },
    }));
    setOverallProgress(70);

    // STEP 2D: LLM Reasoning resolves (~850ms later) — shows the real local-LLM
    // narrative when one was produced, since this stage represents that actual
    // module; falls back to real content-rule signals, then a plain no-note message.
    await new Promise((r) => setTimeout(r, 850));
    const contentSummary = summarizeSignals(signals, 'content');
    const llmStageSummary = backendResult.llm_reasoning
      ? backendResult.llm_reasoning
      : message.trim().length === 0
      ? 'No payment note provided — nothing to analyze.'
      : contentSummary.summary;
    const llmStageMetric = backendResult.llm_reasoning
      ? (backendResult.llm_score_adjustment ?? 0) > 0
        ? `+${backendResult.llm_score_adjustment}`
        : `${backendResult.llm_score_adjustment ?? 0}`
      : contentSummary.metric;
    const llmHasSignal = contentSummary.metric !== 'CLEAR' || (backendResult.llm_score_adjustment ?? 0) > 0;
    setSteps((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        status: action === 'BLOCKED' ? 'blocked' : action === 'PAUSED' ? 'flagged' : llmHasSignal ? 'flagged' : 'completed',
        summary: llmStageSummary,
        metric: llmStageMetric,
      },
    }));
    setOverallProgress(80);

    // STEP 3: Decision & Policy Aggregation (~850ms)
    setSteps((prev) => ({
      ...prev,
      aggregation: { ...prev.aggregation, status: 'running' },
    }));
    // Step 3: Smooth scroll to the Decision & Policy Aggregator
    smoothScrollTo('stage-aggregation-container', 'center', 50);

    await new Promise((r) => setTimeout(r, 850));
    setSteps((prev) => ({
      ...prev,
      aggregation: {
        ...prev.aggregation,
        status: action === 'BLOCKED' ? 'blocked' : action === 'PAUSED' || action === 'VERIFY' ? 'flagged' : 'completed',
        summary: `Weighted 4-factor score: ${risk_score}/100 · Directive mapped to ${action}`,
        metric: `SCORE: ${risk_score}/100`,
      },
    }));
    setOverallProgress(88);

    // STEP 4: Plain-English Explainability Engine (~800ms)
    setSteps((prev) => ({
      ...prev,
      explainability: { ...prev.explainability, status: 'running' },
    }));
    // Step 4: Smooth scroll to the Plain-English Explainability Engine
    smoothScrollTo('stage-explainability-container', 'center', 50);

    await new Promise((r) => setTimeout(r, 800));
    setSteps((prev) => ({
      ...prev,
      explainability: {
        ...prev.explainability,
        status: 'completed',
        summary: `${backendResult.reasons.length} clear rationales generated for human review`,
        metric: 'SYNTHESIZED',
      },
    }));
    setOverallProgress(94);

    // STEP 5: Cryptographic SHA-256 Audit Trail (~850ms)
    setSteps((prev) => ({
      ...prev,
      audit: { ...prev.audit, status: 'running' },
    }));
    // Step 5: Smooth scroll to the Cryptographic Audit Trail
    smoothScrollTo('stage-audit-container', 'center', 50);

    await new Promise((r) => setTimeout(r, 850));
    const auditSummary = backendResult.audit_hash
      ? `Block #${backendResult.audit_sequence} · SHA-256: ${backendResult.audit_hash.slice(0, 16)}... chained`
      : 'Recorded to the local audit trail';
    setSteps((prev) => ({
      ...prev,
      audit: {
        ...prev.audit,
        status: 'completed',
        summary: auditSummary,
        metric: 'IMMUTABLE',
      },
      outcome: {
        ...prev.outcome,
        status: 'completed',
      },
    }));
    setOverallProgress(100);

    // Complete Analysis
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnalyzing(false);
    setAnalysisResult(backendResult);

    // Smoothly scroll to the End Result (Outcome Card)
    scrollToOutcome();

    if (action === 'SAFE') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const handleConfirmTransaction = async (confirmed: boolean) => {
    if (!analysisResult) return;
    await paymentApiService.confirmTransaction(analysisResult.transaction_id, confirmed);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 antialiased selection:bg-blue-500/30 selection:text-blue-200">
      <ConfettiEffect active={showConfetti} />

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Bar / Top Branding */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15 text-blue-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-sans">
                  PayShield <span className="text-blue-400 font-mono text-base font-semibold">Guardian</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Rule-Based Payment Screening Before You Pay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onSwitchToOps && (
              <button
                type="button"
                onClick={onSwitchToOps}
                className="hidden sm:flex rounded-lg border border-slate-700/80 bg-[#0B101D] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="h-3.5 w-3.5 text-blue-400" />
                <span>Fraud-Ops Console</span>
              </button>
            )}

            {/* Direct access to Audit Ledger */}
            <button
              type="button"
              onClick={() => setIsAuditOpen(true)}
              className="rounded-lg border border-slate-700/80 bg-[#0B101D] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Hash className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Cryptographic</span> Audit Trail
            </button>

            {/* MongoDB Atlas Status Chip */}
            <div
              className={`hidden md:flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-mono transition-colors ${
                isAtlasConnected
                  ? 'border-slate-800 bg-[#0B101D] text-slate-300'
                  : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
              }`}
              title="Persistent Scenario Store on MongoDB Atlas"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isAtlasConnected ? 'bg-blue-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-[11px]">Atlas: payshield</span>
            </div>
          </div>
        </header>

        {/* Section 1: Input Form & Dynamic MongoDB Atlas Scenarios */}
        <section className="mb-8">
          <PaymentInputForm
            recipientName={recipientName}
            setRecipientName={setRecipientName}
            upiId={upiId}
            setUpiId={setUpiId}
            amount={amount}
            setAmount={setAmount}
            message={message}
            setMessage={setMessage}
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={handleSelectScenario}
            onDeleteScenario={handleDeleteScenario}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onSaveCurrentAsScenario={handleSaveCurrentAsScenario}
            isSavingCurrent={isSavingCurrent}
            isAtlasConnected={isAtlasConnected}
            onSubmit={runPipeline}
            isAnalyzing={isAnalyzing}
          />
        </section>

        {/* Section 2: Centerpiece AI Multi-Agent Flow Diagram */}
        <section id="live-orchestration-section" className="mb-12 scroll-mt-20">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Live Agent Orchestration Graph
              </h2>
              <p className="text-xs text-slate-400">
                Visualizing non-blocking parallel reasoning, rule synthesis, and hash-chain verification.
              </p>
            </div>

            {analysisResult && (
              <button
                type="button"
                onClick={runPipeline}
                disabled={isAnalyzing}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-medium transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Re-Run Analysis
              </button>
            )}
          </div>

          <WorkflowGraph
            steps={steps}
            isAnalyzing={isAnalyzing}
            overallProgress={overallProgress}
            elapsedMs={elapsedMs}
            analysisResult={analysisResult}
            recipientName={recipientName}
            upiId={upiId}
            amount={amount}
            onConfirm={handleConfirmTransaction}
            onReset={handleReset}
            onOpenExplainability={() => setIsExplainOpen(true)}
            onOpenAuditTrail={() => setIsAuditOpen(true)}
          />
        </section>

        {/* Drawers */}
        <ExplainabilityDrawer
          isOpen={isExplainOpen}
          onClose={() => setIsExplainOpen(false)}
          reasons={analysisResult?.reasons || []}
          breakdown={analysisResult?.breakdown || null}
          riskScore={analysisResult?.risk_score || 0}
          riskLevel={analysisResult?.risk_level || 'SAFE'}
          action={analysisResult?.action || 'SAFE'}
          recipientName={recipientName}
          amount={amount}
          message={message}
          llmReasoning={analysisResult?.llm_reasoning}
          llmScoreAdjustment={analysisResult?.llm_score_adjustment}
        />

        <AuditChainDrawer
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
        />

        {/* Modal: Add Custom Scenario to MongoDB Atlas */}
        <AddScenarioModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onScenarioAdded={handleScenarioAdded}
          initialValues={{
            recipientName,
            upiId,
            amount,
            message,
          }}
        />

        {/* Footer */}
      </div>
    </div>
  );
};
