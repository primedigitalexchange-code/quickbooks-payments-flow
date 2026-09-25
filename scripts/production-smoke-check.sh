#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Production smoke-check runner for QuickBooks live payments.

Required environment variables:
  BASE_URL               Production base URL (e.g. https://your-domain.com)
  REFRESH_TOKEN          Production QuickBooks refresh token
  SMOKE_CUSTOMER_ID      Dedicated low-risk customer id

Optional environment variables:
  AMOUNT                 Smoke-check amount (default: 1.00)
  CURRENCY               Currency code (default: USD)
  REQUEST_ID_PREFIX      Request id prefix (default: smoke)
  DRY_RUN                Set to 1 to print calls without executing them
  REFUND_ON_SUCCESS      Set to 1 to run refund call after successful process/status (default: 1)
EOF
  exit 0
fi

required_vars=(BASE_URL REFRESH_TOKEN SMOKE_CUSTOMER_ID)
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
done

AMOUNT="${AMOUNT:-1.00}"
CURRENCY="${CURRENCY:-USD}"
REQUEST_ID_PREFIX="${REQUEST_ID_PREFIX:-smoke}"
DRY_RUN="${DRY_RUN:-0}"
REFUND_ON_SUCCESS="${REFUND_ON_SUCCESS:-1}"
RUN_TS="$(date +%s)"

request_id() {
  local label="$1"
  echo "${REQUEST_ID_PREFIX}-${label}-${RUN_TS}"
}

run_cmd() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[DRY_RUN] $*"
    return 0
  fi
  eval "$@"
}

json_field() {
  local json="$1"
  local expression="$2"
  node -e "
const input = process.argv[1];
const expr = process.argv[2];
const data = JSON.parse(input);
let value = data;
for (const part of expr.split('.')) {
  if (!part) continue;
  value = value?.[part];
}
if (value === undefined || value === null) process.exit(2);
if (typeof value === 'object') process.stdout.write(JSON.stringify(value));
else process.stdout.write(String(value));
" "$json" "$expression"
}

assert_success_response() {
  local body="$1"
  local step="$2"
  local success
  success="$(json_field "$body" "success" 2>/dev/null || true)"
  if [[ "$success" != "true" ]]; then
    echo "[$step] Response did not contain success=true" >&2
    echo "$body" >&2
    exit 1
  fi
}

call_api() {
  local step="$1"
  local method="$2"
  local endpoint="$3"
  local req_id="$4"
  local payload="${5:-}"

  local tmp_file
  tmp_file="$(mktemp)"

  if [[ -n "$payload" ]]; then
    run_cmd "curl -sS -o \"$tmp_file\" -w \"%{http_code}\" -X \"$method\" \"$BASE_URL$endpoint\" \
      -H \"Content-Type: application/json\" \
      -H \"x-request-id: $req_id\" \
      -d '$payload'" >"$tmp_file.status"
  else
    run_cmd "curl -sS -o \"$tmp_file\" -w \"%{http_code}\" -X \"$method\" \"$BASE_URL$endpoint\" \
      -H \"x-request-id: $req_id\"" >"$tmp_file.status"
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    rm -f "$tmp_file" "$tmp_file.status"
    return 0
  fi

  local status body
  status="$(cat "$tmp_file.status")"
  body="$(cat "$tmp_file")"
  rm -f "$tmp_file" "$tmp_file.status"

  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "[$step] HTTP $status" >&2
    echo "$body" >&2
    exit 1
  fi

  echo "$body"
}

echo "Starting production smoke-check against: $BASE_URL"

AUTH_REQ_ID="$(request_id auth)"
AUTH_BODY="$(call_api "auth_refresh" "POST" "/api/auth/refresh" "$AUTH_REQ_ID" "{\"refreshToken\":\"$REFRESH_TOKEN\"}")"
if [[ "$DRY_RUN" != "1" ]]; then
  assert_success_response "$AUTH_BODY" "auth_refresh"
fi
echo "✓ Auth refresh passed (requestId: $AUTH_REQ_ID)"

INIT_REQ_ID="$(request_id init)"
INIT_PAYLOAD="{\"amount\":$AMOUNT,\"currency\":\"$CURRENCY\",\"customerId\":\"$SMOKE_CUSTOMER_ID\",\"description\":\"production smoke check\"}"
INIT_BODY="$(call_api "payment_initiate" "POST" "/api/payments/initiate" "$INIT_REQ_ID" "$INIT_PAYLOAD")"
if [[ "$DRY_RUN" != "1" ]]; then
  assert_success_response "$INIT_BODY" "payment_initiate"
fi
echo "✓ Payment initiate passed (requestId: $INIT_REQ_ID)"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY_RUN complete."
  exit 0
fi

PAYMENT_ID="$(json_field "$INIT_BODY" "data.id")"
if [[ -z "$PAYMENT_ID" ]]; then
  echo "Failed to extract payment id from initiate response" >&2
  exit 1
fi

PROCESS_REQ_ID="$(request_id process)"
PROCESS_PAYLOAD="{\"amount\":$AMOUNT,\"currency\":\"$CURRENCY\",\"customerId\":\"$SMOKE_CUSTOMER_ID\"}"
PROCESS_BODY="$(call_api "payment_process" "POST" "/api/payments/$PAYMENT_ID/process" "$PROCESS_REQ_ID" "$PROCESS_PAYLOAD")"
assert_success_response "$PROCESS_BODY" "payment_process"
echo "✓ Payment process passed (requestId: $PROCESS_REQ_ID)"

STATUS_REQ_ID="$(request_id status)"
STATUS_BODY="$(call_api "payment_status" "GET" "/api/payments/$PAYMENT_ID/status" "$STATUS_REQ_ID")"
assert_success_response "$STATUS_BODY" "payment_status"
echo "✓ Payment status passed (requestId: $STATUS_REQ_ID)"

if [[ "$REFUND_ON_SUCCESS" == "1" ]]; then
  REFUND_REQ_ID="$(request_id refund)"
  REFUND_PAYLOAD="{\"amount\":$AMOUNT}"
  REFUND_BODY="$(call_api "payment_refund" "POST" "/api/payments/$PAYMENT_ID/refund" "$REFUND_REQ_ID" "$REFUND_PAYLOAD")"
  assert_success_response "$REFUND_BODY" "payment_refund"
  echo "✓ Payment refund passed (requestId: $REFUND_REQ_ID)"
fi

echo
echo "Smoke-check completed successfully."
echo "Payment ID: $PAYMENT_ID"
echo "Request IDs: $AUTH_REQ_ID, $INIT_REQ_ID, $PROCESS_REQ_ID, $STATUS_REQ_ID${REFUND_REQ_ID:+, $REFUND_REQ_ID}"
