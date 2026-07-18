"use node";
/**
 * Clawmart dev boxes — AWS control plane (Convex NODE runtime).
 *
 * The only module in the app that talks to AWS. It runs in Convex's Node
 * runtime (hence "use node") because the AWS SDK needs node crypto/http. It is
 * reached only from convex/boxes.ts via the scheduler; nothing here is public.
 *
 * Safety-by-construction:
 *   - Uses the SCOPED control-plane IAM user (infra/setup.sh), never root.
 *   - Secrets (BYOK LLM key, bot PAT, callback secret) are written to SSM
 *     SecureString and read by the box's OWN instance role — never baked into
 *     user-data, never returned to the client, never stored raw in the DB.
 *   - Instances launch with InstanceInitiatedShutdownBehavior=terminate and a
 *     hard shutdown timer, so a box cannot outlive its budget.
 *   - No-op + clean failure if AWS creds are unset (feature stays dormant).
 *
 * Keep the WORKER_USER_DATA template in sync with infra/cloud-init.sh (the
 * readable twin).
 */
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { randomBytes, createHash } from "crypto";
import {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import {
  SSMClient,
  PutParameterCommand,
  GetParameterCommand,
  DeleteParametersCommand,
} from "@aws-sdk/client-ssm";

const WORKER_ROLE = "clawmart-worker-role"; // instance profile shares the name
const SG_NAME = "clawmart-worker-sg";
const AL2023_ARM64_SSM =
  "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64";

function creds() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION ?? "us-east-2";
  if (!accessKeyId || !secretAccessKey) return null;
  return { region, credentials: { accessKeyId, secretAccessKey } };
}

const WORKER_USER_DATA = (p: {
  boxId: string;
  region: string;
  maxRuntimeMin: number;
}) => `#!/bin/bash
set -uo pipefail
BOX_ID="${p.boxId}"; REGION="${p.region}"; MAX="${p.maxRuntimeMin}"
SSM="/clawmart/box/\${BOX_ID}"
# Cost guarantee first: hard self-terminate at the deadline no matter what.
shutdown -h "+\${MAX}" "clawmart: max runtime" || true
exec > >(logger -t clawmart-boot) 2>&1
dnf install -y docker >/dev/null 2>&1; systemctl enable --now docker
fetch(){ aws ssm get-parameter --region "\$REGION" --name "\${SSM}/\$1" --with-decryption --query Parameter.Value --output text 2>/dev/null; }
CFG="\$(fetch config)"
IMG="\$(echo "\$CFG" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("agentImage",""))')"
[ -z "\$IMG" ] && shutdown -h now
docker pull "\$IMG" >/dev/null 2>&1
docker run --rm --name clawmart-agent --user 10001:10001 \
  --read-only --tmpfs /work:rw,size=2g --tmpfs /tmp:rw,size=512m \
  --memory 1500m --cpus 1.8 --security-opt no-new-privileges \
  -e BOX_ID="\$BOX_ID" -e CLAWMART_CONFIG="\$CFG" \
  -e LLM_API_KEY="\$(fetch llm-api-key)" \
  -e GITHUB_TOKEN="\$(fetch github-token)" \
  -e CALLBACK_SECRET="\$(fetch callback-secret)" \
  "\$IMG" 2>&1 | logger -t clawmart-agent
shutdown -h now "clawmart: work complete"
`;

export const provisionBox = internalAction({
  args: {
    boxId: v.string(),
    companyId: v.id("companies"),
    repoUrl: v.string(),
    baseBranch: v.string(),
    task: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const fail = (msg: string) =>
      ctx.runMutation(internal.boxes.markFailed, { boxId: args.boxId, error: msg });

    const cfg = creds();
    if (!cfg) { await fail("AWS control-plane creds not set (run infra/setup.sh)"); return null; }

    const agentImage = process.env.CLAWMART_BOX_AGENT_IMAGE;
    const llmKey = process.env.CLAWMART_BOX_LLM_KEY ?? process.env.OPENROUTER_API_KEY;
    const githubToken = process.env.CLAWMART_BOX_GITHUB_TOKEN;
    if (!agentImage) { await fail("CLAWMART_BOX_AGENT_IMAGE not set"); return null; }
    if (!llmKey) { await fail("no BYOK LLM key configured"); return null; }
    if (!githubToken) { await fail("CLAWMART_BOX_GITHUB_TOKEN not set"); return null; }

    const region = cfg.region;
    const prefix = `/clawmart/box/${args.boxId}`;
    const callbackSecret = randomBytes(24).toString("hex");
    const callbackSecretHash = createHash("sha256").update(callbackSecret).digest("hex");
    const maxRuntimeMin = Number(process.env.CLAWMART_BOX_MAX_RUNTIME_MIN ?? 60);

    const boxConfig = {
      boxId: args.boxId,
      companyId: args.companyId,
      repoUrl: args.repoUrl,
      baseBranch: args.baseBranch,
      task: args.task,
      model: process.env.CLAWMART_BOX_MODEL ?? "anthropic/claude-sonnet-4.6",
      budgetUsd: Number(process.env.CLAWMART_BOX_BUDGET_USD ?? 2),
      maxIterations: Number(process.env.CLAWMART_BOX_MAX_ITERS ?? 6),
      agentImage,
      convexSiteUrl: process.env.CONVEX_SITE_URL ?? "",
    };

    const ssm = new SSMClient(cfg);
    const ec2 = new EC2Client(cfg);
    try {
      const put = (name: string, value: string, secure: boolean) =>
        ssm.send(new PutParameterCommand({
          Name: `${prefix}/${name}`,
          Value: value,
          Type: secure ? "SecureString" : "String",
          Overwrite: true,
        }));
      await put("config", JSON.stringify(boxConfig), false);
      await put("llm-api-key", llmKey, true);
      await put("github-token", githubToken, true);
      await put("callback-secret", callbackSecret, true);

      const ami =
        process.env.CLAWMART_WORKER_AMI ??
        (await ssm.send(new GetParameterCommand({ Name: AL2023_ARM64_SSM })))
          .Parameter?.Value;
      if (!ami) { await fail("could not resolve worker AMI"); return null; }

      const userData = Buffer.from(
        WORKER_USER_DATA({ boxId: args.boxId, region, maxRuntimeMin })
      ).toString("base64");

      const tags = [
        { Key: "Project", Value: "clawmart" },
        { Key: "ClawmartBoxId", Value: args.boxId },
        { Key: "ClawmartCompanyId", Value: String(args.companyId) },
        { Key: "Name", Value: `clawmart-box-${args.boxId}` },
      ];

      const run = await ec2.send(new RunInstancesCommand({
        ImageId: ami,
        InstanceType: (process.env.CLAWMART_BOX_INSTANCE_TYPE ?? "t4g.small") as never,
        MinCount: 1,
        MaxCount: 1,
        IamInstanceProfile: { Name: WORKER_ROLE },
        ...(process.env.CLAWMART_WORKER_SG
          ? { SecurityGroupIds: [process.env.CLAWMART_WORKER_SG] }
          : { SecurityGroups: [SG_NAME] }),
        ...(process.env.CLAWMART_WORKER_SUBNET
          ? { SubnetId: process.env.CLAWMART_WORKER_SUBNET }
          : {}),
        UserData: userData,
        InstanceInitiatedShutdownBehavior: "terminate",
        MetadataOptions: { HttpTokens: "required", HttpEndpoint: "enabled" },
        TagSpecifications: [
          { ResourceType: "instance", Tags: tags },
          { ResourceType: "volume", Tags: tags },
        ],
      }));

      const instanceId = run.Instances?.[0]?.InstanceId;
      if (!instanceId) { await fail("RunInstances returned no instance id"); return null; }

      await ctx.runMutation(internal.boxes.recordLaunch, {
        boxId: args.boxId,
        instanceId,
        callbackSecretHash,
      });
    } catch (e) {
      await fail(`provision error: ${e instanceof Error ? e.message : String(e)}`);
    }
    return null;
  },
});

export const terminateBox = internalAction({
  args: { boxId: v.string(), instanceId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const cfg = creds();
    if (cfg) {
      try {
        if (args.instanceId) {
          await new EC2Client(cfg).send(
            new TerminateInstancesCommand({ InstanceIds: [args.instanceId] })
          );
        }
        const prefix = `/clawmart/box/${args.boxId}`;
        await new SSMClient(cfg).send(
          new DeleteParametersCommand({
            Names: ["config", "llm-api-key", "github-token", "callback-secret"].map(
              (n) => `${prefix}/${n}`
            ),
          })
        );
      } catch {
        // best-effort teardown; mark terminated regardless so the UI settles
      }
    }
    await ctx.runMutation(internal.boxes.markTerminated, { boxId: args.boxId });
    return null;
  },
});
