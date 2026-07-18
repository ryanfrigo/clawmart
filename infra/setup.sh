#!/usr/bin/env bash
#
# Clawmart dev-box infrastructure setup — run ONCE per AWS account.
#
# Creates the *scoped* identities the provisioner uses, so Clawmart never
# touches root credentials:
#   - IAM user  clawmart-control-plane  (least-priv: launch/kill tagged boxes,
#                                         manage /clawmart/box/* SSM params)
#   - IAM role  clawmart-worker-role     (what a box can do: read ITS OWN secret,
#                                         write ITS OWN logs, SSM Session Manager)
#   - Security group  clawmart-worker-sg (NO inbound; access is SSM-only)
#   - Log group /clawmart/box            (box audit trails, 14-day retention)
#
# Idempotent: safe to re-run. Prints the control-plane access key exactly once,
# on first creation — set it into Convex env, then DELETE YOUR ROOT KEYS.
#
# Usage:  bash infra/setup.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAM_DIR="$HERE/iam"

CP_USER="clawmart-control-plane"
CP_POLICY="clawmart-control-plane"
WORKER_ROLE="clawmart-worker-role"
WORKER_PROFILE="clawmart-worker-role"   # instance profile shares the name
WORKER_POLICY="clawmart-worker-inline"
SG_NAME="clawmart-worker-sg"
LOG_GROUP="/clawmart/box"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }

say "Account $ACCOUNT · region $REGION"

# ── Control-plane policy ────────────────────────────────────────────────────
CP_POLICY_ARN="arn:aws:iam::${ACCOUNT}:policy/${CP_POLICY}"
if aws iam get-policy --policy-arn "$CP_POLICY_ARN" >/dev/null 2>&1; then
  ok "control-plane policy exists"
else
  aws iam create-policy --policy-name "$CP_POLICY" \
    --policy-document "file://${IAM_DIR}/control-plane-policy.json" \
    --description "Clawmart: launch/kill tagged dev boxes + manage their SSM params" >/dev/null
  ok "created control-plane policy"
fi

# ── Control-plane user + access key ─────────────────────────────────────────
if aws iam get-user --user-name "$CP_USER" >/dev/null 2>&1; then
  ok "control-plane user exists"
else
  aws iam create-user --user-name "$CP_USER" \
    --tags Key=Project,Value=clawmart >/dev/null
  ok "created control-plane user"
fi
aws iam attach-user-policy --user-name "$CP_USER" --policy-arn "$CP_POLICY_ARN" >/dev/null
ok "attached policy to user"

EXISTING_KEYS="$(aws iam list-access-keys --user-name "$CP_USER" \
  --query 'length(AccessKeyMetadata)' --output text)"
if [ "$EXISTING_KEYS" = "0" ]; then
  say "Creating control-plane access key (shown ONCE) …"
  aws iam create-access-key --user-name "$CP_USER" \
    --query 'AccessKey.{id:AccessKeyId,secret:SecretAccessKey}' --output json
  cat <<EOF

  ^ Set these into Convex env (NOT the repo):
      npx convex env set AWS_ACCESS_KEY_ID     <id>
      npx convex env set AWS_SECRET_ACCESS_KEY <secret>
      npx convex env set AWS_REGION            $REGION
      npx convex env set CLAWMART_BOXES_ENABLED 1

  Then delete your ROOT access keys:
      https://console.aws.amazon.com/iam/home#/security_credentials
EOF
else
  ok "control-plane user already has an access key (not regenerating)"
fi

# ── Worker role + instance profile ──────────────────────────────────────────
if aws iam get-role --role-name "$WORKER_ROLE" >/dev/null 2>&1; then
  ok "worker role exists"
else
  aws iam create-role --role-name "$WORKER_ROLE" \
    --assume-role-policy-document "file://${IAM_DIR}/worker-trust-policy.json" \
    --tags Key=Project,Value=clawmart >/dev/null
  ok "created worker role"
fi
aws iam put-role-policy --role-name "$WORKER_ROLE" --policy-name "$WORKER_POLICY" \
  --policy-document "file://${IAM_DIR}/worker-role-policy.json" >/dev/null
ok "wrote worker inline policy (SSM param read + own logs)"
aws iam attach-role-policy --role-name "$WORKER_ROLE" \
  --policy-arn "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" >/dev/null
ok "attached AmazonSSMManagedInstanceCore (keyless SSM access)"

if aws iam get-instance-profile --instance-profile-name "$WORKER_PROFILE" >/dev/null 2>&1; then
  ok "instance profile exists"
else
  aws iam create-instance-profile --instance-profile-name "$WORKER_PROFILE" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$WORKER_PROFILE" \
    --role-name "$WORKER_ROLE" >/dev/null
  ok "created instance profile + attached role"
fi

# ── Security group: NO inbound, egress only (access is SSM Session Manager) ──
VPC_ID="$(aws ec2 describe-vpcs --region "$REGION" \
  --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
SG_ID="$(aws ec2 describe-security-groups --region "$REGION" \
  --filters Name=vpc-id,Values="$VPC_ID" Name=group-name,Values="$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)"
if [ -z "$SG_ID" ] || [ "$SG_ID" = "None" ]; then
  SG_ID="$(aws ec2 create-security-group --region "$REGION" \
    --group-name "$SG_NAME" --vpc-id "$VPC_ID" \
    --description "Clawmart worker: no inbound, egress only (SSM-managed access)" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Project,Value=clawmart}]" \
    --query GroupId --output text)"
  # A default SG allows all egress and no inbound already; we leave inbound empty
  # on purpose — the box is reachable only via SSM Session Manager, never SSH.
  ok "created security group $SG_ID (no inbound)"
else
  ok "security group exists ($SG_ID)"
fi

# ── Log group ───────────────────────────────────────────────────────────────
if aws logs describe-log-groups --region "$REGION" \
     --log-group-name-prefix "$LOG_GROUP" \
     --query 'logGroups[?logGroupName==`'"$LOG_GROUP"'`]' --output text | grep -q .; then
  ok "log group exists"
else
  aws logs create-log-group --region "$REGION" --log-group-name "$LOG_GROUP" >/dev/null
  aws logs put-retention-policy --region "$REGION" \
    --log-group-name "$LOG_GROUP" --retention-in-days 14 >/dev/null
  ok "created log group (14-day retention)"
fi

say "Setup complete."
echo "  Security group : $SG_ID"
echo "  Worker profile : $WORKER_PROFILE"
echo "  Set CLAWMART_WORKER_SG=$SG_ID in Convex env (or let the provisioner auto-detect)."
