"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/dashboard/header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Clock, DollarSign, Users, PhoneIncoming, ArrowRight, Zap } from "lucide-react"
import { formatDuration, formatCurrency, timeAgo, formatPhoneNumber } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Call, Organization } from "@/lib/supabase/types"

interface DashboardStats {
  totalCalls: number
  totalMinutes: number
  totalCost: number
  totalLeads: number
  recentCalls: Call[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    totalMinutes: 0,
    totalCost: 0,
    totalLeads: 0,
    recentCalls: [],
  })
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id, organizations(*)")
        .eq("user_id", user.id)
        .single()

      if (membership) {
        setOrg(membership.organizations as Organization)
      }

      const [callsRes, leadsRes, recentCallsRes] = await Promise.all([
        supabase.from("calls").select("*"),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase
          .from("calls")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(5),
      ])

      const calls = (callsRes.data || []) as Call[]
      const totalMinutes = Math.round(
        calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60
      )
      const totalCost = calls.reduce((sum, c) => sum + (c.cost_cents || 0), 0)

      setStats({
        totalCalls: calls.length,
        totalMinutes,
        totalCost,
        totalLeads: leadsRes.count || 0,
        recentCalls: (recentCallsRes.data || []) as Call[],
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" description="Overview of your AI receptionist performance" />

      <div className="space-y-6 p-6 lg:p-8">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Calls"
            value={loading ? "—" : stats.totalCalls.toLocaleString()}
            icon={Phone}
            description="All time"
          />
          <StatCard
            title="Total Minutes"
            value={loading ? "—" : stats.totalMinutes.toLocaleString()}
            icon={Clock}
            description="Talk time"
          />
          <StatCard
            title="Total Cost"
            value={loading ? "—" : formatCurrency(stats.totalCost)}
            icon={DollarSign}
            description="API usage"
          />
          <StatCard
            title="Leads Captured"
            value={loading ? "—" : stats.totalLeads.toLocaleString()}
            icon={Users}
            description="From calls"
          />
        </div>

        {/* Free Tier Upgrade Banner */}
        {org?.tier === "free" && (
          <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">You're on the Free Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Starter to activate your AI phone assistant and start handling real calls.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/dashboard/billing">Upgrade Now</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Calls</CardTitle>
            <Link
              href="/dashboard/calls"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : stats.recentCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PhoneIncoming className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">
                  {org?.tier === "free" 
                    ? "Upgrade to start receiving calls with your AI receptionist!"
                    : "No calls yet. Your AI receptionist is ready and waiting!"
                  }
                </p>
                {org?.tier === "free" && (
                  <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/billing">View Plans</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentCalls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/dashboard/calls/${call.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {call.caller_name || formatPhoneNumber(call.caller_number || "Unknown")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(call.duration_seconds)} • {timeAgo(call.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          call.end_reason === "completed" || call.end_reason === "hangup"
                            ? "success"
                            : call.end_reason === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {call.end_reason || "completed"}
                      </Badge>
                      {call.cost_cents > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(call.cost_cents)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
