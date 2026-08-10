#!/usr/bin/env python3
"""
One stdlib server standing in for all three upstreams the box talks to, so
infra/agent/test-local.sh needs no AWS, no GitHub, and no model key:

  POST /v1/chat/completions            OpenRouter (replays a transcript)
  POST /convex/box/event               the Convex /box/event sink
  POST /gh/repos/<owner>/<repo>/pulls  the GitHub PR API
  GET  /_recorded                      everything it saw, for assertions

Transcript: one JSON object per line.
  {"call": {...}}       -> served as the assistant message (JSON-encoded)
  {"content": "..."}    -> served verbatim (used for malformed-turn tests)
  {"status": 500}       -> served as an HTTP error (retry/chain tests)
  {"cost": 0.75}        -> overrides usage.cost for that turn (budget tests)
When the transcript runs out an idle `list_files` call is served forever, which
the harness's stall detector ends after three identical turns.

The agent container reaches this over a user-defined bridge, so the SAME client
code path runs as in production — only CLAWMART_LLM_BASE / CLAWMART_GITHUB_API /
convexSiteUrl differ.
"""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

IDLE = {"thought": "idle", "tool": "list_files", "args": {}}

LOCK = threading.Lock()
STATE = {"llm_calls": 0, "events": [], "prs": [], "models": []}
TURNS = []
CURSOR = [0]


def load(path):
    if not path or not os.path.isfile(path):
        return []
    out = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("//"):
                out.append(json.loads(line))
    return out


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):
        pass

    def _send(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read(self):
        n = int(self.headers.get("content-length") or 0)
        raw = self.rfile.read(n).decode("utf-8", "replace") if n else ""
        try:
            return json.loads(raw), raw
        except Exception:
            return {}, raw

    def do_GET(self):
        if self.path == "/_recorded":
            with LOCK:
                self._send(200, STATE)
            return
        self._send(404, {"error": "not found"})

    def do_POST(self):
        body, raw = self._read()
        if self.path.endswith("/chat/completions"):
            return self._completion(body)
        if self.path.endswith("/box/event"):
            with LOCK:
                STATE["events"].append(
                    {"secret_header": self.headers.get("x-clawmart-box-secret", ""), "body": raw}
                )
            return self._send(200, {"ok": True})
        if "/pulls" in self.path:
            with LOCK:
                STATE["prs"].append({"path": self.path, "body": body})
                n = len(STATE["prs"])
            return self._send(201, {"html_url": f"http://fake/pr/{n}", "number": n})
        self._send(404, {"error": "not found"})

    def _completion(self, body):
        with LOCK:
            STATE["llm_calls"] += 1
            STATE["models"].append(body.get("model", ""))
            turn = TURNS[CURSOR[0]] if CURSOR[0] < len(TURNS) else {"call": IDLE}
            CURSOR[0] += 1
        if "status" in turn:
            return self._send(int(turn["status"]), {"error": {"message": "injected failure"}})
        content = turn.get("content")
        if content is None:
            content = json.dumps(turn.get("call", IDLE))
        self._send(200, {
            "choices": [{"message": {"role": "assistant", "content": content}}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 50,
                      "cost": float(turn.get("cost", 0.0005))},
        })


def main():
    TURNS.extend(load(os.environ.get("FAKE_TRANSCRIPT", "")))
    port = int(os.environ.get("FAKE_PORT", "8080"))
    print(f"fake upstream on :{port} with {len(TURNS)} scripted turn(s)", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    sys.exit(main())
