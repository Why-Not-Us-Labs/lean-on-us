import { NextRequest, NextResponse } from "next/server"
import { sendSms, buildPaymentSms } from "@/lib/twilio"
import { stripe } from "@/lib/stripe"
import { TIER_CONFIG } from "@/lib/tier-config"
import type { OrgTier } from "@/lib/supabase/types"

/**
 * Vapi Server Tool Endpoint
 * 
 * Riley calls this mid-conversation to perform actions like sending SMS.
 * Vapi sends a POST with the tool call details.
 * 
 * Configure in Vapi assistant as a "server" tool:
 * - URL: https://app.leanon.us/api/webhooks/vapi/tools
 * - Method: POST
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Vapi server tool format
    const { message } = body
    if (!message) {
      return NextResponse.json({ error: "No message" }, { status: 400 })
    }

    const toolCall = message.toolCalls?.[0] || message.toolCall
    if (!toolCall) {
      return NextResponse.json({ error: "No tool call found" }, { status: 400 })
    }

    const functionName = toolCall.function?.name || toolCall.name
    const args = toolCall.function?.arguments
      ? (typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments)
      : toolCall.arguments || {}

    // Route to the right handler
    switch (functionName) {
      case "send_payment_link": {
        const { phone_number, caller_name, tier } = args
        if (!phone_number) {
          return buildToolResponse(toolCall.id, "I need the caller's phone number to send the link.")
        }

        const selectedTier: OrgTier = tier || "pro"
        const tierConfig = TIER_CONFIG[selectedTier]

        // Normalize phone
        const digits = phone_number.replace(/\D/g, "")
        const normalizedPhone = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : phone_number.startsWith("+") ? phone_number : `+${digits}`

        // Create Stripe checkout session
        const lineItems: any[] = [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${tierConfig.name} Plan — Lean On Us Voice AI`,
                description: `${tierConfig.name} monthly subscription`,
              },
              unit_amount: tierConfig.monthlyPrice,
              recurring: { interval: "month" as const },
            },
            quantity: 1,
          },
        ]

        if (tierConfig.setupPrice > 0) {
          lineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: "One-Time Setup Fee",
                description: `${tierConfig.name} plan setup and configuration`,
              },
              unit_amount: tierConfig.setupPrice,
            },
            quantity: 1,
          })
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "subscription",
          line_items: lineItems,
          success_url: "https://leanon.us/thank-you?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "https://leanon.us",
          metadata: {
            source: "riley_call",
            caller_phone: normalizedPhone,
            caller_name: caller_name || "",
            tier: selectedTier,
          },
        })

        // Send the SMS
        const smsBody = buildPaymentSms(caller_name || null, session.url!)
        await sendSms({ to: normalizedPhone, body: smsBody })

        return buildToolResponse(
          toolCall.id,
          `I've sent the ${tierConfig.name} plan checkout link to ${normalizedPhone}. The text should arrive in just a moment.`
        )
      }

      case "send_follow_up_text": {
        const { phone_number, message: customMsg } = args
        if (!phone_number) {
          return buildToolResponse(toolCall.id, "I need the caller's phone number to send a text.")
        }

        const digits = phone_number.replace(/\D/g, "")
        const normalizedPhone = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : phone_number.startsWith("+") ? phone_number : `+${digits}`

        const smsBody = customMsg || `Thanks for calling Lean On Us! We'll be in touch soon. Reply to this text anytime. — Riley`
        await sendSms({ to: normalizedPhone, body: smsBody })

        return buildToolResponse(
          toolCall.id,
          `I've sent a follow-up text to ${normalizedPhone}.`
        )
      }

      default:
        return buildToolResponse(toolCall.id, `Unknown function: ${functionName}`)
    }
  } catch (error: any) {
    console.error("Vapi tool error:", error)
    return NextResponse.json(
      { error: error.message || "Tool execution failed" },
      { status: 500 }
    )
  }
}

function buildToolResponse(toolCallId: string, content: string) {
  return NextResponse.json({
    results: [
      {
        toolCallId,
        result: content,
      },
    ],
  })
}
