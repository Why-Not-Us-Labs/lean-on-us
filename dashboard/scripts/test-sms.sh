#!/bin/bash
# SMS Integration Test Script
# Tests the full pipeline: Twilio SMS → Stripe Checkout → Vapi Tools

BASE_URL="${1:-https://app.leanon.us}"
TEST_PHONE="+15168161879"  # Gavin's number

echo "🔨 SMS Integration Test Suite"
echo "=============================="
echo "Target: $BASE_URL"
echo "Test phone: $TEST_PHONE"
echo ""

# Test 1: SMS API - Follow-up text
echo "📱 Test 1: Send follow-up SMS via /api/sms/send"
echo "------------------------------------------------"
RESULT=$(curl -s -X POST "$BASE_URL/api/sms/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TEST_PHONE\",
    \"type\": \"follow_up\",
    \"callerName\": \"Gavin\"
  }")
echo "Response: $RESULT"
echo ""

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ Test 1 PASSED — Follow-up SMS sent"
else
  echo "❌ Test 1 FAILED"
fi
echo ""

# Test 2: SMS API - Payment link (creates Stripe session + sends SMS)
echo "💳 Test 2: Send payment link SMS via /api/sms/send"
echo "---------------------------------------------------"
RESULT2=$(curl -s -X POST "$BASE_URL/api/sms/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TEST_PHONE\",
    \"type\": \"payment_link\",
    \"tier\": \"pro\",
    \"callerName\": \"Gavin McNamara\"
  }")
echo "Response: $RESULT2"
echo ""

if echo "$RESULT2" | grep -q '"success":true'; then
  echo "✅ Test 2 PASSED — Payment link SMS sent (check phone for Stripe link)"
else
  echo "❌ Test 2 FAILED"
fi
echo ""

# Test 3: Vapi Tools endpoint (simulates Riley mid-call)
echo "🤖 Test 3: Vapi server tool - send_payment_link"
echo "-------------------------------------------------"
RESULT3=$(curl -s -X POST "$BASE_URL/api/webhooks/vapi/tools" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": {
      \"toolCalls\": [{
        \"id\": \"test-call-123\",
        \"function\": {
          \"name\": \"send_payment_link\",
          \"arguments\": {
            \"phone_number\": \"$TEST_PHONE\",
            \"caller_name\": \"Gavin\",
            \"tier\": \"starter\"
          }
        }
      }]
    }
  }")
echo "Response: $RESULT3"
echo ""

if echo "$RESULT3" | grep -q '"results"'; then
  echo "✅ Test 3 PASSED — Vapi tool executed, SMS sent"
else
  echo "❌ Test 3 FAILED"
fi
echo ""

echo "=============================="
echo "📊 Check your phone for 3 texts:"
echo "  1. Follow-up text from Riley"
echo "  2. Pro plan Stripe checkout link"
echo "  3. Starter plan Stripe checkout link (via Vapi tool)"
echo ""
echo "Twilio sender: +18884512653"
echo "=============================="
