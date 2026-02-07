"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns"
import type { Call } from "@/lib/supabase/types"

const TEAL_COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"]

export default function AnalyticsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCalls() {
      const supabase = createClient()
      const { data } = await supabase
        .from("calls")
        .select("*")
        .order("started_at", { ascending: true })

      setCalls((data || []) as Call[])
      setLoading(false)
    }
    fetchCalls()
  }, [])

  // === Compute chart data ===

  // Calls per day (last 30 days)
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  })

  const callsByDay = last30Days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayCalls = calls.filter(
      (c) => format(new Date(c.started_at), "yyyy-MM-dd") === dayStr
    )
    return {
      date: format(day, "MMM d"),
      calls: dayCalls.length,
      minutes: Math.round(
        dayCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60
      ),
      cost: dayCalls.reduce((sum, c) => sum + (c.cost_cents || 0), 0) / 100,
    }
  })

  // Peak hours
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    label: i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`,
    calls: 0,
  }))

  calls.forEach((call) => {
    const hour = new Date(call.started_at).getHours()
    hourCounts[hour].calls++
  })

  // End reason breakdown
  const reasonCounts: Record<string, number> = {}
  calls.forEach((call) => {
    const reason = call.end_reason || "completed"
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
  })
  const outcomeData = Object.entries(reasonCounts).map(([name, value]) => ({
    name,
    value,
  }))

  // Average duration trend
  const avgDurationByDay = last30Days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayCalls = calls.filter(
      (c) => format(new Date(c.started_at), "yyyy-MM-dd") === dayStr
    )
    const avg = dayCalls.length
      ? Math.round(
          dayCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) /
            dayCalls.length /
            60
        )
      : 0
    return {
      date: format(day, "MMM d"),
      avgMinutes: avg,
    }
  })

  // Summary stats
  const totalCalls = calls.length
  const avgDuration = totalCalls
    ? Math.round(
        calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) /
          totalCalls /
          60
      )
    : 0
  const forwardRate = totalCalls
    ? Math.round(
        (calls.filter((c) => c.end_reason === "forwarded").length / totalCalls) *
          100
      )
    : 0

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Analytics" />
        <div className="p-6 lg:p-8 grid gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Analytics"
        description="Deep dive into your call performance metrics"
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* Summary bar */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{totalCalls}</p>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{avgDuration}m</p>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{forwardRate}%</p>
              <p className="text-sm text-muted-foreground">Forward Rate</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calls Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calls Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={callsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="calls" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Peak Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourCounts.filter((_, i) => i >= 7 && i <= 21)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="calls" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Average Duration Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avg Duration Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={avgDurationByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    unit="m"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgMinutes"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Outcome Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              {outcomeData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No call data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {outcomeData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={TEAL_COLORS[index % TEAL_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
