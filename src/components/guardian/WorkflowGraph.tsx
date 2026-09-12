import React from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  UserCheck,
  Cpu,
  Activity,
  Sparkles,
  GitMerge,
  FileText,
  Hash,
  Clock,
} from 'lucide-react';
import { StageCard } from './StageCard';
import {
  BranchingConnector,
  ConvergingConnector,
  VerticalStemConnector,
} from './PipelineConnectors';
import { OutcomeCard } from './OutcomeCard';
import { PipelineStepDetail, AnalyzePaymentResponse } from '../../types';

interface WorkflowGraphProps {
  steps: Record<string, PipelineStepDetail>;
  isAnalyzing: boolean;
  overallProgress: number; // 0 to 100
  elapsedMs: number;
  analysisResult: AnalyzePaymentResponse | null;
  recipientName: string;
  upiId: string;
  amount: number;
  onConfirm: (confirmed: boolean) => Promise<void>;
  onReset: () => void;
  onOpenExplainability: () => void;
  onOpenAuditTrail: () => void;
}

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  steps,
  isAnalyzing,
  overallProgress,
  elapsedMs,
  analysisResult,
  recipientName,
  upiId,
  amount,
  onConfirm,
  onReset,
  onOpenExplainability,
  onOpenAuditTrail,
}) => {
  const isParallelActive =
    steps.recipient?.status === 'running' ||
    steps.rules?.status === 'running' ||
    steps.behavior?.status === 'running' ||
    steps.llm?.status === 'running';

  const isParallelDone =
    steps.recipient?.status === 'completed' ||
    steps.recipient?.status === 'flagged' ||
    steps.recipient?.status === 'blocked';

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Top Pipeline Status & Elapsed Counter Ribbon */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#0B101D] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-100 block">
              PayShield Multi-Agent Pipeline
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Status: {isAnalyzing ? 'Active Inference' : analysisResult ? 'Evaluation Complete' : 'Standing By'}</span>
              <span>·</span>
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3 text-slate-500" />
                {elapsedMs} ms
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 w-full sm:w-64">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ ease: 'easeOut', duration: 0.25 }}
            />
          </div>
          <span className="font-mono text-xs font-medium text-slate-300 w-10 text-right tabular-nums">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      {/* STAGE 1: INGEST TRANSACTION */}
      <div id="stage-ingest-container" className="mx-auto max-w-xl">
        <StageCard
          id="stage-ingest"
          stepNumber="STAGE 1"
          name="Ingest Transaction"
          icon={<Layers className="h-4 w-4" />}
          status={steps.ingest?.status || 'idle'}
          summary={steps.ingest?.summary}
          metric={steps.ingest?.metric}
          subtitle="Validates the UPI handle format and payload before analysis begins."
          accentColor="cyan"
        />
      </div>

      {/* Branching SVG Connector */}
      <BranchingConnector active={isParallelActive} completed={isParallelDone} />

      {/* Mobile Vertical Bridge */}
      <div className="block md:hidden">
        <VerticalStemConnector active={isParallelActive} completed={isParallelDone} color="#3B82F6" />
      </div>

      {/* STAGE 2: PARALLEL FAN-OUT (4 Parallel Specialized Agents) */}
      <div id="stage-parallel-agents" className="my-2 scroll-mt-24">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
            <span className={`h-1.5 w-1.5 rounded-full ${isParallelActive ? 'bg-blue-400' : 'bg-slate-600'}`} />
            Parallel Fan-Out Execution · 4 Independent Checks
          </div>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Non-blocking asynchronous reasoning
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* 2A: Recipient Verification */}
          <StageCard
            id="stage-recipient"
            stepNumber="AGENT 2A"
            name="Recipient Verification"
            icon={<UserCheck className="h-4 w-4" />}
            status={steps.recipient?.status || 'idle'}
            summary={steps.recipient?.summary}
            metric={steps.recipient?.metric}
            subtitle="Cross-references banking directory and flagged syndicate blacklists."
          />

          {/* 2B: Risk Analysis (Rules) */}
          <StageCard
            id="stage-rules"
            stepNumber="AGENT 2B"
            name="Risk Analysis (Rules)"
            icon={<Cpu className="h-4 w-4" />}
            status={steps.rules?.status || 'idle'}
            summary={steps.rules?.summary}
            metric={steps.rules?.metric}
            subtitle="Evaluates amount against ₹3,000 personal spending baseline."
          />

          {/* 2C: Behavioral Pattern Check */}
          <StageCard
            id="stage-behavior"
            stepNumber="AGENT 2C"
            name="Behavioral Pattern Check"
            icon={<Activity className="h-4 w-4" />}
            status={steps.behavior?.status || 'idle'}
            summary={steps.behavior?.summary}
            metric={steps.behavior?.metric}
            subtitle="Scans 5-minute transaction velocity and off-hour patterns."
          />

          {/* 2D: LLM Reasoning */}
          <StageCard
            id="stage-llm"
            stepNumber="AGENT 2D"
            name="LLM Intent Reasoning"
            icon={<Sparkles className="h-4 w-4" />}
            status={steps.llm?.status || 'idle'}
            summary={steps.llm?.summary}
            metric={steps.llm?.metric}
            subtitle="Decodes free-text note for social engineering & coercion pressure."
          />
        </div>
      </div>

      {/* Converging SVG Connector */}
      <ConvergingConnector
        active={steps.aggregation?.status === 'running'}
        completed={
          steps.aggregation?.status === 'completed' ||
          steps.aggregation?.status === 'flagged' ||
          steps.aggregation?.status === 'blocked'
        }
      />

      {/* Mobile Vertical Bridge */}
      <div className="block md:hidden">
        <VerticalStemConnector
          active={steps.aggregation?.status === 'running'}
          completed={steps.aggregation?.status === 'completed'}
          color="#3B82F6"
        />
      </div>

      {/* STAGE 3: DECISION & POLICY AGGREGATION */}
      <div id="stage-aggregation-container" className="mx-auto max-w-xl scroll-mt-24">
        <StageCard
          id="stage-aggregation"
          stepNumber="STAGE 3"
          name="Decision & Policy Aggregator"
          icon={<GitMerge className="h-4 w-4" />}
          status={steps.aggregation?.status || 'idle'}
          summary={steps.aggregation?.summary}
          metric={steps.aggregation?.metric}
          subtitle="Synthesizes parallel agent vectors into a composite 0–100 risk score and policy mapping."
        />
      </div>

      {/* Vertical Stem */}
      <VerticalStemConnector
        active={steps.explainability?.status === 'running'}
        completed={steps.explainability?.status === 'completed'}
        color="#3B82F6"
      />

      {/* STAGE 4: EXPLAINABILITY */}
      <div id="stage-explainability-container" className="mx-auto max-w-xl scroll-mt-24">
        <StageCard
          id="stage-explainability"
          stepNumber="STAGE 4"
          name="Plain-English Explainability Engine"
          icon={<FileText className="h-4 w-4" />}
          status={steps.explainability?.status || 'idle'}
          summary={steps.explainability?.summary}
          metric={steps.explainability?.metric}
          subtitle="Formulates clear, plain-language bullet rationales explaining the AI decision."
        />
      </div>

      {/* Vertical Stem */}
      <VerticalStemConnector
        active={steps.audit?.status === 'running'}
        completed={steps.audit?.status === 'completed'}
        color="#3B82F6"
      />

      {/* STAGE 5: CRYPTOGRAPHIC AUDIT LOG */}
      <div id="stage-audit-container" className="mx-auto max-w-xl scroll-mt-24">
        <StageCard
          id="stage-audit"
          stepNumber="STAGE 5"
          name="Cryptographic SHA-256 Audit Trail"
          icon={<Hash className="h-4 w-4" />}
          status={steps.audit?.status || 'idle'}
          summary={steps.audit?.summary}
          metric={steps.audit?.metric}
          subtitle="Chains decision hash into tamper-evident ledger for mathematical non-repudiation."
        />
      </div>

      {/* Vertical Stem into final outcome */}
      {steps.outcome?.status !== 'idle' && (
        <VerticalStemConnector
          active={steps.outcome?.status === 'running'}
          completed={steps.outcome?.status === 'completed'}
          color={
            analysisResult?.action === 'SAFE'
              ? '#10B981'
              : analysisResult?.action === 'BLOCKED'
              ? '#EF4444'
              : '#F59E0B'
          }
        />
      )}

      {/* STAGE 6: FINAL OUTCOME HERO CARD */}
      {analysisResult && steps.outcome?.status === 'completed' && (
        <div id="stage-outcome-wrapper" className="mt-5 scroll-mt-24">
          <OutcomeCard
            id="stage-outcome"
            status={analysisResult.action}
            riskScore={analysisResult.risk_score}
            riskLevel={analysisResult.risk_level}
            recipientName={recipientName}
            upiId={upiId}
            amount={amount}
            transactionId={analysisResult.transaction_id}
            reasons={analysisResult.reasons}
            onConfirm={onConfirm}
            onReset={onReset}
            onOpenExplainability={onOpenExplainability}
            onOpenAuditTrail={onOpenAuditTrail}
          />
        </div>
      )}
    </div>
  );
};
