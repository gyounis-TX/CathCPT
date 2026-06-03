#!/usr/bin/env bash
#
# Create a Bedrock APPLICATION inference profile tagged app=cathcpt so CathCPT's
# Claude spend (the "Anthropic, PBC" Marketplace line) is attributable in Cost
# Explorer. Prints a JSON map of system-profile-id -> application-profile-ARN to
# wire into the Lambda via BEDROCK_APP_PROFILE_MAP (see README.md).
#
# Requires: bedrock:CreateInferenceProfile, bedrock:ListInferenceProfiles.

set -euo pipefail
APP="cathcpt"
REGION="us-east-1"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

# System inference-profile id CathCPT invokes today (lambda/extract-codes/index.mjs).
SYSTEM_PROFILE_IDS=( "us.anthropic.claude-sonnet-4-6-20250620-v1:0" )

echo "{"
first=1
for SID in "${SYSTEM_PROFILE_IDS[@]}"; do
  SRC_ARN="arn:aws:bedrock:${REGION}:${ACCOUNT}:inference-profile/${SID}"
  NAME="${APP}-$(echo "$SID" | tr '.:' '--')"
  OUT=$(aws bedrock create-inference-profile --inference-profile-name "$NAME" \
        --model-source "copyFrom=${SRC_ARN}" --tags "key=app,value=${APP}" \
        --region "$REGION" 2>/dev/null || true)
  ARN=$(printf '%s' "$OUT" | python3 -c "import json,sys;d=sys.stdin.read();print(json.loads(d).get('inferenceProfileArn','') if d.strip() else '')" 2>/dev/null || true)
  [ -z "$ARN" ] && ARN=$(aws bedrock list-inference-profiles --type-equals APPLICATION --region "$REGION" \
        --query "inferenceProfileSummaries[?inferenceProfileName=='${NAME}'].inferenceProfileArn | [0]" --output text 2>/dev/null || true)
  [ "$first" = 1 ] || echo ","
  printf '  "%s": "%s"' "$SID" "$ARN"
  first=0
done
echo ""
echo "}"
echo "# Paste the object above into the BEDROCK_APP_PROFILE_MAP env var on the Lambda." >&2
