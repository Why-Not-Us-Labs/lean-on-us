import type { OrgTier } from "./supabase/types"

export interface TierLimits {
  name: string
  monthlyPrice: number
  setupPrice: number
  minutesIncluded: number
  overagePerMinute: number // cents
  phoneLines: number
  maxLocations: number
  maxSeats: number // 0 = unlimited
  features: string[]
}

export const TIER_CONFIG: Record<OrgTier, TierLimits> = {
  starter: {
    name: "Starter",
    monthlyPrice: 750_00, // cents
    setupPrice: 1500_00,
    minutesIncluded: 500,
    overagePerMinute: 25, // $0.25
    phoneLines: 1,
    maxLocations: 1,
    maxSeats: 1,
    features: [
      "1 phone line",
      "500 minutes included",
      "24/7 call handling",
      "Appointment booking (Google/Calendly)",
      "Lead capture — name, number, need",
      "Call summaries emailed after every call",
      "Dashboard access — 1 user seat",
      "$0.25/min overage",
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 1000_00,
    setupPrice: 2500_00,
    minutesIncluded: 1500,
    overagePerMinute: 20, // $0.20
    phoneLines: 1,
    maxLocations: 3,
    maxSeats: 5,
    features: [
      "1 phone line + up to 3 locations",
      "1,500 minutes included",
      "Everything in Starter, plus:",
      "Live call transfer to you or your team",
      "Bilingual support (English + Spanish)",
      "CRM integration (HubSpot, Jobber, etc.)",
      "SMS follow-ups after missed calls",
      "Dashboard access — up to 5 user seats",
      "$0.20/min overage",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 1500_00,
    setupPrice: 5000_00,
    minutesIncluded: 5000,
    overagePerMinute: 15, // $0.15
    phoneLines: 5,
    maxLocations: 99,
    maxSeats: 0, // unlimited
    features: [
      "Up to 5 phone lines",
      "5,000 minutes included",
      "Everything in Pro, plus:",
      "Advanced call routing by department/time",
      "Custom AI voice & brand personality",
      "White-label — your brand, not ours",
      "Dedicated Slack channel for support",
      "Dashboard access — unlimited seats",
      "$0.15/min overage",
    ],
  },
}

export function getTierLimits(tier: OrgTier): TierLimits {
  return TIER_CONFIG[tier]
}

export function isFeatureAvailable(
  tier: OrgTier,
  feature: "liveTransfer" | "bilingual" | "crmIntegration" | "smsFollowup" | "advancedRouting" | "whiteLabel" | "customVoice"
): boolean {
  const tierLevel = { starter: 0, pro: 1, enterprise: 2 }
  const featureMinTier: Record<string, number> = {
    liveTransfer: 1,     // pro+
    bilingual: 1,         // pro+
    crmIntegration: 1,    // pro+
    smsFollowup: 1,       // pro+
    advancedRouting: 2,   // enterprise only
    whiteLabel: 2,        // enterprise only
    customVoice: 2,       // enterprise only
  }
  return tierLevel[tier] >= (featureMinTier[feature] ?? 0)
}
