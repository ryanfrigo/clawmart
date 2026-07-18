# Clawmart reference agent image.
# Build & publish once, then set `agentImage` in the box config to point here:
#   docker build -t ghcr.io/<you>/clawmart-agent:latest infra/agent
#   docker push  ghcr.io/<you>/clawmart-agent:latest
#
# Swap this whole image to run a different agent (Hermes, Claude Code, …).
# The contract is only: read $CLAWMART_CONFIG + secret envs, work on a
# clawmart/* branch, open a PR. Everything runs unprivileged.
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Unprivileged runtime user; HOME on the writable tmpfs the box mounts at /work.
RUN useradd -u 10001 -m -d /work clawmart
ENV HOME=/work
WORKDIR /work

COPY runner.py /opt/clawmart/runner.py
COPY entrypoint.sh /opt/clawmart/entrypoint.sh
RUN chmod +x /opt/clawmart/entrypoint.sh /opt/clawmart/runner.py

USER 10001:10001
ENTRYPOINT ["/opt/clawmart/entrypoint.sh"]
