#!/usr/bin/env python3
"""
Three caps and one reserve. Exhaustion is a VERDICT, not an error: the loop
stops, the dirty tree is committed, result.json is written, exit 0.

  dollars     — real `usage.cost` from OpenRouter. Checked BEFORE each call
                against the largest call seen so far, so the run can never
                overshoot by a whole turn. A missing cost is charged
                pessimistically at $15/Mtok (the v1 runner used $3 and failed
                OPEN on money; failing closed is the only safe direction).
  iterations  — every model ATTEMPT, malformed replies included.
  wall clock  — boot + maxRuntimeMin*60 - 120s reserve - preflight duration.
                Closes a latent v1 bug: entrypoint.sh pushes AFTER the runner
                returns, so a hung runner meant commits and no PR.
"""
import time

PESSIMISTIC_USD_PER_MTOK = 15.0
MIN_CALL_RESERVE_USD = 0.01
SHUTDOWN_RESERVE_S = 120.0


def estimate_cost(usage: dict, max_tokens: int, prompt_chars: int) -> float:
    """Real cost when the upstream reports it; a pessimistic upper bound if not."""
    if isinstance(usage, dict):
        cost = usage.get("cost")
        if isinstance(cost, (int, float)) and cost >= 0:
            return float(cost)
        tin = usage.get("prompt_tokens")
        tout = usage.get("completion_tokens")
        if isinstance(tin, int) and isinstance(tout, int):
            return (tin + tout) / 1e6 * PESSIMISTIC_USD_PER_MTOK
    tokens = prompt_chars / 4.0 + max_tokens
    return tokens / 1e6 * PESSIMISTIC_USD_PER_MTOK


class Budget:
    def __init__(self, usd: float, max_iterations: int, seconds: float, now: float | None = None):
        self.usd = max(0.0, float(usd))
        self.max_iterations = max(1, int(max_iterations))
        self.deadline = (now if now is not None else time.monotonic()) + max(0.0, seconds)
        self.spent = 0.0
        self.iterations = 0
        self.max_call = MIN_CALL_RESERVE_USD

    def reserve(self, seconds: float) -> None:
        """Charge preflight (or any pre-loop work) against the wall clock."""
        self.deadline -= max(0.0, seconds)

    def remaining_seconds(self, now: float | None = None) -> float:
        return self.deadline - (now if now is not None else time.monotonic())

    def record(self, cost: float) -> None:
        cost = max(0.0, float(cost))
        self.spent += cost
        self.max_call = max(self.max_call, cost)

    def start_iteration(self) -> None:
        self.iterations += 1

    def out_of_money(self) -> bool:
        """True when another upstream call could overshoot the cap.

        Checked between iterations AND before every attempt inside one call:
        `llm.call` may make (retries + 1) x len(models) upstream calls, each of
        which costs money, so a between-iterations check alone let one turn
        overshoot by that whole factor.
        """
        return self.spent + self.max_call > self.usd

    def spend_report(self) -> str:
        return f"dollar budget (${self.spent:.4f} of ${self.usd:.2f})"

    def blocker(self, now: float | None = None) -> str:
        """'' while the loop may continue; otherwise the verdict-bearing reason."""
        if self.iterations >= self.max_iterations:
            return f"iteration cap ({self.max_iterations})"
        if self.out_of_money():
            return self.spend_report()
        if self.remaining_seconds(now) <= 0:
            return "wall-clock deadline"
        return ""

    def verdict_for(self, blocker: str) -> str:
        return "CAPPED" if blocker.startswith("iteration") else "BUDGET"
