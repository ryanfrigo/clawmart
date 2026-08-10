# Clawmart reference agent image.
# Build & publish once, then set `agentImage` in the box config to point here:
#   docker build -t ghcr.io/<you>/clawmart-agent:latest infra/agent
#   docker push  ghcr.io/<you>/clawmart-agent:latest
#
# Swap this whole image to run a different agent (Hermes, Claude Code, …).
# The contract is only: read $CLAWMART_CONFIG + secret envs, work on a
# clawmart/* branch, open a PR. Everything runs unprivileged.
#
# Node is the base (not python:slim) because the verification gate runs the
# TARGET repository's own toolchain — `npm ci --ignore-scripts` and the binaries
# in node_modules/.bin. Without it every run would degrade to UNVERIFIED, which
# is the one thing this harness exists to prevent. Python 3 is the harness
# language and stays stdlib-only.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates python3 \
 && rm -rf /var/lib/apt/lists/*

# Unprivileged runtime user. HOME is deliberately NOT the parent of the worktree
# (/work/repo): with HOME=/work a repo-supplied symlink could land a write on
# .gitconfig, and core.fsmonitor there is arbitrary argv on the next git call.
RUN useradd -u 10001 -m -d /work/home clawmart
ENV HOME=/work/home PYTHONDONTWRITEBYTECODE=1

WORKDIR /opt/clawmart
COPY harness/ /opt/clawmart/harness/
COPY tests/ /opt/clawmart/tests/
COPY pushgate.py openpr.py entrypoint.sh /opt/clawmart/
RUN chmod +x /opt/clawmart/entrypoint.sh

# Build gate: the image does not exist unless the harness unit tests pass.
RUN python3 -m unittest discover -s tests -t . -q

USER 10001:10001
ENTRYPOINT ["/opt/clawmart/entrypoint.sh"]
