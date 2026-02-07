import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { stripe } from "@/lib/stripe"
import { TIER_CONFIG } from "@/lib/tier-config"
import type { OrgTier } from "@/lib/supabase/types"

export async function POST(request: NextRequest) {
  try {
    const { tier }: { tier: OrgTier } = await request.json()

    if (!tier || !TIER_CONFIG[tier]) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id, organizations(*)")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const org = membership.organizations as any
    const tierConfig = TIER_CONFIG[tier]

    // Create or retrieve Stripe customer
    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          org_id: org.id,
        },
      })
      customerId = customer.id

      // Update org with customer ID
      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id)
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tierConfig.name} Plan`,
              description: `${tierConfig.name} subscription for Lean On Us Voice AI`,
            },
            unit_amount: tierConfig.monthlyPrice,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
        ...(tierConfig.setupPrice > 0 ? [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Setup Fee",
              description: `One-time setup fee for ${tierConfig.name} plan`,
            },
            unit_amount: tierConfig.setupPrice,
          },
          quantity: 1,
        }] : []),
      ],
      success_url: `${request.headers.get("origin")}/dashboard/billing?success=true&tier=${tier}`,
      cancel_url: `${request.headers.get("origin")}/dashboard/billing?canceled=true`,
      metadata: {
        org_id: org.id,
        tier,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}