"""
PayShield Multi-Agent System

Exports all 6 specialized agents and the cryptographic audit trail:
1. Orchestrator Agent (Workflow Controller)
2. Recipient Verification Agent (Rule-based + Lookup)
3. Risk Analysis Agent (Rule-based + LLM)
4. Behavioral Pattern Agent (Rule-based / Lightweight ML)
5. Decision & Policy Agent (Deterministic Aggregator)
6. Explainability Agent (LLM)
"""

from agents.orchestrator import OrchestratorAgent, orchestrator
from agents.recipient_verification import recipient_verification_agent, verify_recipient
from agents.risk_analysis import risk_analysis_agent
from agents.behavioral_pattern import behavioral_pattern_agent
from agents.decision_policy import decision_policy_agent
from agents.explainability import explainability_agent

__all__ = [
    "OrchestratorAgent",
    "orchestrator",
    "recipient_verification_agent",
    "verify_recipient",
    "risk_analysis_agent",
    "behavioral_pattern_agent",
    "decision_policy_agent",
    "explainability_agent",
]
