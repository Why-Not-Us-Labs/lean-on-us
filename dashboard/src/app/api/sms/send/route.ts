import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { sendSms, buildPaymentSms, buildFollowUpSms } from "@/lib/twilio"
import { stripe } from "@/lib/stripe"
import { TIER_CONFIG } from "@/lib/tier-config"
import type { OrgTier } from "@/lib/supabase/types"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Normalize phone to E.164
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  if (phone.startsWith("+")) return phone
  return `+${digits}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, type, tier, callerName, orgId, customMessage } = body as {
      to: string
      type: "payment_link" | "follow_up" | "custom"
      tier?: OrgTier
      callerName?: string
      orgId?: string
      customMessage?: string
    }

    if (!to) {
      return NextResponse.json({ error: "Missing 'to' phone number" }, { status: 400 })
    }

    const phone = normalizePhone(to)
    let smsBody: string

    if (type === "payment_link") {
      const selectedTier = tier || "pro"
      const tierConfig = TIER_CONFIG[selectedTier]
      if (!tierConfig) {
        return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
      }

      // Create a Stripe Checkout Session for this prospect (no auth required)
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
          source: "sms",
          caller_phone: phone,
          caller_name: callerName || "",
          tier: selectedTier,
          org_id: orgId || "",
        },
      })

      smsBody = buildPaymentSms(callerName || null, session.url!)
    } else if (type === "follow_up") {
      smsBody = buildFollowUpSms(callerName || null)
    } else if (type === "custom" && customMessage) {
      smsBody = customMessage
    } else {
      return NextResponse.json({ error: "Invalid type or missing message" }, { status: 400 })
    }

    const result = await sendSms({ to: phone, body: smsBody })

    // Log the SMS send (best-effort)
    try {
      await supabase.from("sms_log").insert({
        org_id: orgId || null,
        to_phone: phone,
        from_phone: process.env.TWILIO_PHONE_NUMBER,
        message_type: type,
        message_body: smsBody,
        twilio_sid: result.sid,
        status: result.status,
      })
    } catch {
      // Table may not exist yet — that's fine
    }

    return NextResponse.json({
      success: true,
      sid: result.sid,
      status: result.status,
    })
  } catch (error: any) {
    console.error("SMS send error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send SMS" },
      { status: 500 }
    )
  }
}
