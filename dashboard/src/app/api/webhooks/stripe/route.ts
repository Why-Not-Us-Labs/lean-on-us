import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { createServerClient } from "@supabase/ssr"
import type { OrgTier } from "@/lib/supabase/types"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Create Supabase client for database operations
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for server-only client
        },
      },
    }
  )

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const orgId = session.metadata?.org_id
        const tier = session.metadata?.tier as OrgTier
        
        if (!orgId || !tier) {
          console.error("Missing metadata in checkout session")
          break
        }

        // Get the subscription ID from the session
        const subscriptionId = session.subscription as string
        
        // Update organization with subscription info
        await supabase
          .from("organizations")
          .update({
            tier,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("id", orgId)
        
        console.log(`Updated org ${orgId} to ${tier} plan`)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        
        // Find org by subscription ID
        const { data: org } = await supabase
          .from("organizations")
          .select("id, tier")
          .eq("stripe_subscription_id", subscription.id)
          .single()
        
        if (!org) {
          console.error(`No org found for subscription ${subscription.id}`)
          break
        }

        await supabase
          .from("organizations")
          .update({
            subscription_status: subscription.status,
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          })
          .eq("id", org.id)
        
        console.log(`Updated subscription status for org ${org.id}: ${subscription.status}`)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object
        
        // Find org by subscription ID
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single()
        
        if (!org) {
          console.error(`No org found for subscription ${subscription.id}`)
          break
        }

        // Downgrade to free tier
        await supabase
          .from("organizations")
          .update({
            tier: "free" as const,
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
          })
          .eq("id", org.id)
        
        console.log(`Downgraded org ${org.id} to free tier`)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any
        
        if (invoice.subscription) {
          // Find org by subscription ID
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_subscription_id", invoice.subscription)
            .single()
          
          if (org) {
            await supabase
              .from("organizations")
              .update({
                subscription_status: "past_due",
              })
              .eq("id", org.id)
            
            console.log(`Marked org ${org.id} as past due`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}