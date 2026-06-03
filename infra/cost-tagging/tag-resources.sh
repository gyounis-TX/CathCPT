#!/usr/bin/env bash
#
# Apply the `app=cathcpt` cost-allocation tag to this app's AWS resources. CathCPT
# runs as a Lambda function (lambda/extract-codes) that invokes Claude Sonnet 4.6 on
# Bedrock. Account 628475584741, us-east-1. Lambda compute itself is negligible/free-
# tier on this account; the meaningful CathCPT cost is its Bedrock model usage, which
# is attributed via setup-bedrock-inference-profiles.sh (see README.md).
#
# IDEMPOTENT and ADD-ONLY. Run ONCE with a tagging-capable profile.
# Then: Billing Console -> Cost Allocation Tags -> User-defined -> "app" -> Activate.

set -euo pipefail

APP="cathcpt"
REGION="us-east-1"
# Set to the deployed Lambda function name (find via: aws lambda list-functions
# --query "Functions[?contains(FunctionName,'extract')].FunctionName").
LAMBDA_FUNCTIONS=( "extract-codes" )

TAG_KEY="app"
log() { printf '  %s\n' "$*"; }
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

for FN in "${LAMBDA_FUNCTIONS[@]}"; do
  echo "==> Tagging Lambda $FN with $TAG_KEY=$APP"
  ARN="arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FN}"
  if aws lambda get-function --function-name "$FN" --region "$REGION" >/dev/null 2>&1; then
    aws lambda tag-resource --resource "$ARN" --tags "$TAG_KEY=$APP" --region "$REGION"
    log "tagged $FN"
  else
    log "function '$FN' not found — edit LAMBDA_FUNCTIONS in this script"
  fi
done

echo "==> Done. Activate the 'app' cost-allocation tag in the Billing console,"
echo "    then run ./setup-bedrock-inference-profiles.sh for CathCPT's model spend."
