# AWS cost attribution & tagging — CathCPT

Makes the AWS bill answerable **per app**. The account (`628475584741`, `us-east-1`)
has **no cost-allocation tags** today.

CathCPT is a **Lambda** (`lambda/extract-codes/index.mjs`) that calls Claude
**Sonnet 4.6** on Bedrock. Lambda compute is negligible here; CathCPT's real cost is
Bedrock model usage (Sonnet 4.6 was $197.91 across all apps in May 2026).

## Run once (admin/tagging-capable AWS profile)

1. `./tag-resources.sh` — tags the Lambda function with `app=cathcpt` (set the real
   function name in `LAMBDA_FUNCTIONS` first).
2. `./setup-bedrock-inference-profiles.sh` — creates a tagged **application inference
   profile** for Sonnet 4.6; prints a JSON map.
3. **Activate** the tag: Billing → Cost Allocation Tags → User-defined → `app` → Activate.

## Wiring Bedrock attribution into the Lambda (apply + typecheck locally)

> Not auto-applied here (no `node_modules` in the review environment to typecheck).
> Opt-in and identity when the env var is unset.

In `lambda/extract-codes/index.mjs`, add near the top:

```js
// Optional per-app Bedrock cost allocation. BEDROCK_APP_PROFILE_MAP is a JSON map of
// system-profile-id -> application-profile-ARN (tagged app=cathcpt). Unset -> identity.
let _appProfiles = {};
try { _appProfiles = JSON.parse(process.env.BEDROCK_APP_PROFILE_MAP || "{}"); } catch { _appProfiles = {}; }
const resolveModelId = (id) => _appProfiles[id] ?? id;
```

Then change both model id sites (≈ lines 397 and 485):

```js
const modelId = resolveModelId("us.anthropic.claude-sonnet-4-6-20250620-v1:0");
```

Set `BEDROCK_APP_PROFILE_MAP` (from the script output) as a Lambda environment
variable and redeploy.

## Cross-app context

See the explify repo's `infra/cost-tagging/README.md` for the full May 2026 bill
breakdown ($232.69 AWS + $258.31 Anthropic/Bedrock = $491.00) and the near-idle ALB
usage analysis.
