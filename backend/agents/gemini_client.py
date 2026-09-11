"""
Gemini Client Wrapper for PayShield AI Agents.

Supports the official `google-genai` SDK (and legacy `google-generativeai` if present).
Provides graceful fallback handling, timeouts, and structured response extraction.
"""

import os
import re
import json
from pathlib import Path
from typing import Optional, Dict, Any

# Load environment variables if not loaded
try:
    from dotenv import load_dotenv
    # Look for .env in project root
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()
except ImportError:
    pass

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def get_gemini_api_key() -> str:
    """Retrieve Gemini API key from environment or .env file."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key and api_key != "your-gemini-api-key-here":
        return api_key

    # Check local .env manually as fallback
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val and val != "your-gemini-api-key-here":
                            return val
        except Exception:
            pass
    return ""


def is_gemini_available() -> bool:
    """Check if a valid Gemini API key is configured."""
    return bool(get_gemini_api_key())


def call_gemini(
    prompt: str,
    system_instruction: str = "",
    model_name: Optional[str] = None,
    timeout: float = 6.0,
) -> Optional[str]:
    """
    Execute a Gemini model query with timeout and error handling.
    Returns response text or None if unavailable/failed.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    target_model = model_name or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)

    # 1. Try modern google.genai SDK
    try:
        from google import genai
        from google.genai import types

        timeout_ms = int(timeout * 1000)
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=timeout_ms)
        )
        config = types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=1000,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        )
        if system_instruction:
            config.system_instruction = system_instruction

        response = client.models.generate_content(
            model=target_model,
            contents=prompt,
            config=config,
        )
        if response and response.text:
            return response.text.strip()
    except ImportError:
        # Fall back to legacy google.generativeai if google.genai is not installed
        try:
            import google.generativeai as legacy_genai

            legacy_genai.configure(api_key=api_key)
            gen_model = legacy_genai.GenerativeModel(
                model_name=target_model,
                system_instruction=system_instruction if system_instruction else None,
            )
            resp = gen_model.generate_content(prompt)
            if resp and resp.text:
                return resp.text.strip()
        except Exception as e:
            print(f"⚠️ Legacy Gemini SDK failed: {e}")
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            print("⚠️ Gemini API 429 quota reached (free tier 5 RPM). Switching to deterministic heuristic fallback.")
        elif "Temporary failure in name resolution" in err_msg or "Connection" in err_msg:
            print("⚠️ Gemini API offline or sandboxed. Switching to deterministic heuristic fallback.")
        else:
            print(f"⚠️ Gemini API call failed: {e}")

    return None


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Extract and parse the first valid JSON block from LLM output."""
    if not text:
        return None

    cleaned = text.strip()
    # Strip markdown code fencing if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned, flags=re.I)
        cleaned = re.sub(r"\n?```$", "", cleaned)
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Regex search for { ... }
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return None
