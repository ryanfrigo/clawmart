#!/bin/bash
#
# Clawmart worker box — EC2 user-data bootstrap (Amazon Linux 2023, arm64).
#
# The provisioner substitutes the __PLACEHOLDERS__ below before launch.
# Everything secret (LLM key, GitHub PAT, callback secret) is pulled at runtime
# from SSM Parameter Store using the box's OWN instance role — nothing sensitive
# is ever baked into user-data (which is readable via the instance metadata API).
#
# The instance is launched with --instance-initiated-shutdown-behavior terminate,
# so every `shutdown -h` in here TERMINATES the box (no lingering cost).
set -uo pipefail

BOX_ID="__BOX_ID__"
REGION="__REGION__"
MAX_RUNTIME_MIN="__MAX_RUNTIME_MIN__"
SSM_PREFIX="/clawmart/box/${BOX_ID}"
LOG_GROUP="/clawmart/box/${BOX_ID}"

# ── Cost guarantee: schedule a hard self-terminate FIRST, before anything else ──
# Even if the agent hangs or bootstrap fails, the box dies at the budget deadline.
shutdown -h "+${MAX_RUNTIME_MIN}" "clawmart: max runtime reached" || true

exec > >(logger -t clawmart-boot) 2>&1
echo "boot: box ${BOX_ID} in ${REGION}, hard cap ${MAX_RUNTIME_MIN}m"

dnf install -y docker >/dev/null 2>&1
systemctl enable --now docker

fetch() { aws ssm get-parameter --region "$REGION" --name "${SSM_PREFIX}/$1" \
            --with-decryption --query Parameter.Value --output text 2>/dev/null; }

CONFIG_JSON="$(fetch config)"
AGENT_IMAGE="$(echo "$CONFIG_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("agentImage",""))')"
[ -z "$AGENT_IMAGE" ] && { echo "no agentImage in config; terminating"; shutdown -h now; }

# Pull secrets just-in-time; pass to the container via env (never written to disk).
LLM_API_KEY="$(fetch llm-api-key)"
GITHUB_TOKEN="$(fetch github-token)"
CALLBACK_SECRET="$(fetch callback-secret)"

docker pull "$AGENT_IMAGE" >/dev/null 2>&1

# The agent runs unprivileged, no host mounts, its own network namespace.
# It clones the repo, works ONLY on a clawmart/* branch, and opens a PR.
#
# The /work tmpfs options are load-bearing and were verified locally:
#   exec           docker's tmpfs default is noexec, and the verification gate
#                  runs the target repo's own toolchain out of node_modules/.bin.
#                  Without it every run degrades to "no gate available", which is
#                  the one thing the harness exists to prevent. /tmp stays noexec.
#   uid/gid/mode   docker inherits the image directory's mode for a tmpfs mount,
#                  so /work came up root-owned 0755 and the unprivileged agent
#                  could not create /work/repo at all. 0700 owned by the agent
#                  uid is both correct and tighter than the 1777 default.
docker run --rm \
  --name clawmart-agent \
  --user 10001:10001 \
  --read-only \
  --tmpfs /work:rw,exec,size=2g,uid=10001,gid=10001,mode=0700 \
  --tmpfs /tmp:rw,size=512m \
  --memory 1500m --cpus 1.8 \
  --security-opt no-new-privileges --cap-drop ALL --pids-limit 512 \
  -e BOX_ID="$BOX_ID" \
  -e CLAWMART_CONFIG="$CONFIG_JSON" \
  -e LLM_API_KEY="$LLM_API_KEY" \
  -e GITHUB_TOKEN="$GITHUB_TOKEN" \
  -e CALLBACK_SECRET="$CALLBACK_SECRET" \
  "$AGENT_IMAGE" 2>&1 | logger -t clawmart-agent

echo "agent finished; terminating box"
shutdown -h now "clawmart: work complete"
