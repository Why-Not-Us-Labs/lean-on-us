"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, ExternalLink, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { TIER_CONFIG, getTierLimits } from "@/lib/tier-config"
import { formatCurrency } from "@/lib/utils"
import type { OrgTier, Organization } from "@/lib/supabase/types"
import { getStripe } from "@/lib/stripe-client"

export default function BillingPage() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<OrgTier | null>(null)
  const searchParams = useSearchParams()
  const success = searchParams.get("success")
  const canceled = searchParams.get("canceled")

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id, organizations(*)")
        .eq("user_id", user.id)
        .single()

      if (membership) {
        setOrg(membership.organizations as Organization)
      }
    } catch (error) {
      console.error("Error loading organization:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: OrgTier) => {
    if (!org || tier === org.tier) return

    setUpgrading(tier)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })

      const { url } = await response.json()
      if (url) {
        const stripe = await getStripe()
        await stripe?.redirectToCheckout({ sessionId: url.split("/").pop() })
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
    } finally {
      setUpgrading(null)
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })

      const { url } = await response.json()
      if (url) {
        window.open(url, "_blank")
      }
    } catch (error) {
      console.error("Error creating portal session:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    )
  }

  const currentTier = getTierLimits(org.tier)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view usage details
        </p>
      </div>

      {/* Success/Cancel Messages */}
      {success && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-green-800 dark:text-green-200">
                Successfully upgraded your plan! Changes may take a few minutes to reflect.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {canceled && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Upgrade canceled. You can upgrade anytime.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge variant={org.tier === "free" ? "secondary" : "default"} className="capitalize">
                  {currentTier.name}
                </Badge>
              </CardTitle>
              <CardDescription>
                {org.tier === "free" 
                  ? "You're on the free plan. Upgrade to unlock more features."
                  : `You're on the ${currentTier.name} plan.`
                }
              </CardDescription>
            </div>
            {org.stripe_customer_id && org.tier !== "free" && (
              <Button variant="outline" onClick={handleManageBilling}>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Billing
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{currentTier.minutesIncluded}</p>
                <p className="text-sm text-muted-foreground">Minutes/month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{currentTier.phoneLines}</p>
                <p className="text-sm text-muted-foreground">Phone Lines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {currentTier.maxSeats === 0 ? "∞" : currentTier.maxSeats}
                </p>
                <p className="text-sm text-muted-foreground">Team Seats</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(currentTier.monthlyPrice)}
                </p>
                <p className="text-sm text-muted-foreground">Per month</p>
              </div>
            </div>
            
            {/* Usage placeholder */}
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">Current Usage</h4>
              <div className="text-sm text-muted-foreground">
                Usage tracking will be available soon. Monitor your call minutes and usage here.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free Tier Upgrade Banner */}
      {org.tier === "free" && (
        <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/20 p-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Ready to get started?</h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to start handling calls and capturing leads with our AI voice assistant.
                </p>
              </div>
              <Button onClick={() => handleUpgrade("starter")} disabled={upgrading === "starter"}>
                {upgrading === "starter" ? "Processing..." : "Upgrade Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {Object.entries(TIER_CONFIG)
            .filter(([tier]) => tier !== "free")
            .map(([tier, config]) => {
              const isCurrentPlan = tier === org.tier
              const isDowngrade = tier === "starter" && (org.tier === "pro" || org.tier === "enterprise")
              const isUpgrade = !isCurrentPlan && !isDowngrade

              return (
                <Card 
                  key={tier} 
                  className={`relative ${tier === "pro" ? "border-primary shadow-lg" : ""}`}
                >
                  {tier === "pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {config.name}
                      {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <span className="text-3xl font-bold">{formatCurrency(config.monthlyPrice)}</span>
                      <span className="text-sm">/month</span>
                      {config.setupPrice > 0 && (
                        <p className="text-xs">+ {formatCurrency(config.setupPrice)} setup</p>
                      )}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      {config.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      variant={tier === "pro" ? "default" : "outline"}
                      className="w-full"
                      disabled={isCurrentPlan || upgrading === tier}
                      onClick={() => isUpgrade && handleUpgrade(tier as OrgTier)}
                    >
                      {isCurrentPlan
                        ? "Current Plan"
                        : upgrading === tier
                        ? "Processing..."
                        : isUpgrade
                        ? "Upgrade"
                        : "Downgrade"
                      }
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
}