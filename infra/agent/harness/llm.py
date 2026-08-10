#!/usr/bin/env python3
"""
OpenRouter client (stdlib only).

Base URL comes from CLAWMART_LLM_BASE so the local rig can point the SAME code
path at a fake upstream over real HTTP — retries, chain advance, and cost
accounting are exercised for real rather than stubbed. Precedent:
resolveUpstream()/OMNIROUTE_BASE_URL in convex/lib/router.ts.

Failure policy mirrors convex/lib/router.ts isChainWorthy(): 401/402/403 mean
OUR credential is wrong, so every model behind that key fails identically —
stop the run instead of burning the chain. Anything else is 2 retries with
backoff, then the next model. Every one of those attempts is charged, so the
dollar cap is re-checked before each of them and not only between iterations.

The key is read from a file and the file is UNLINKED immediately. It is never
placed in os.environ, so it is not in this process's /proc/<pid>/environ and
cannot be inherited by anything the gate executes.
"""
import json
import os
import time
import urllib.error
import urllib.request

from . import budget as budget_mod
from . import events

DEFAULT_BASE = "https://openrouter.ai/api/v1"
MAX_TOKENS = 4096
RETRIES = 2


class AuthError(RuntimeError):
    """401/402/403 — the run cannot proceed with this key."""


class CallFailed(RuntimeError):
    """Every model in the chain failed."""


class OutOfMoney(RuntimeError):
    """The dollar cap was reached part-way through one call's retry/chain fan-out."""


def read_key(path: str) -> str:
    """Read the BYOK key from disk and delete it. Returns '' if absent."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            key = fh.read().strip()
    except OSError:
        return ""
    try:
        os.unlink(path)
    except OSError:
        pass
    return key


class Client:
    def __init__(self, key: str, models: list, budget, timeout: int = 180):
        self.key = key
        self.models = [m for m in models if m] or ["anthropic/claude-sonnet-4.6"]
        self.budget = budget
        self.timeout = timeout
        self.base = (os.environ.get("CLAWMART_LLM_BASE") or DEFAULT_BASE).rstrip("/")
        self.model = self.models[0]

    def _post(self, model: str, messages: list, timeout: int):
        body = json.dumps({
            "model": model,
            "messages": messages,
            "max_tokens": MAX_TOKENS,
            "temperature": 0.2,
            "usage": {"include": True},
        }).encode()
        req = urllib.request.Request(
            self.base + "/chat/completions", data=body,
            headers={
                "Authorization": f"Bearer {self.key}",
                "content-type": "application/json",
                "HTTP-Referer": "https://clawmart.co",
                "X-Title": "Clawmart Dev Box",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)

    def call(self, messages: list) -> str:
        prompt_chars = sum(len(m.get("content", "")) for m in messages)
        last = "no model was attempted"
        for index, model in enumerate(self.models):
            for attempt in range(RETRIES + 1):
                # One call is up to (RETRIES + 1) x len(models) PAID upstream
                # calls. The dollar cap has to hold inside that fan-out, not
                # only between iterations.
                if self.budget.out_of_money():
                    raise OutOfMoney(self.budget.spend_report() + f"; last: {last}")
                timeout = int(max(15, min(self.timeout, self.budget.remaining_seconds())))
                try:
                    data = self._post(model, messages, timeout)
                except urllib.error.HTTPError as e:
                    detail = ""
                    try:
                        detail = e.read(400).decode("utf-8", "replace")
                    except Exception:
                        pass
                    if e.code in (401, 402, 403):
                        raise AuthError(f"{model} -> {e.code}: {detail[:200]}")
                    last = f"{model} -> {e.code}: {detail[:200]}"
                except Exception as e:
                    last = f"{model}: {e}"
                else:
                    text = ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
                    cost = budget_mod.estimate_cost(
                        data.get("usage") or {}, MAX_TOKENS, prompt_chars
                    )
                    self.budget.record(cost)
                    if text:
                        self.model = model
                        return text
                    # Free endpoints love 200-with-empty-choice. Quality failure:
                    # retry, but it still cost money, so it is already recorded.
                    last = f"{model}: empty completion"
                if attempt < RETRIES:
                    time.sleep(1.5 * (attempt + 1))
            if index + 1 < len(self.models):
                events.event("status", f"model {model} failing ({last}) — trying the next one")
        raise CallFailed(last)
