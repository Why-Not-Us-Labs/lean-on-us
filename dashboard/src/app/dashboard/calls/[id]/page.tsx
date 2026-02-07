"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatDuration, formatCurrency, formatPhoneNumber } from "@/lib/utils"
import { format } from "date-fns"
import { ArrowLeft, Phone, Clock, DollarSign, User, FileText, MessageSquare } from "lucide-react"
import type { Call } from "@/lib/supabase/types"

export default function CallDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCall() {
      const supabase = createClient()
      const { data } = await supabase
        .from("calls")
        .select("*")
        .eq("id", params.id as string)
        .single()

      setCall(data as Call | null)
      setLoading(false)
    }
    fetchCall()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Call Detail" />
        <div className="p-6 lg:p-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="flex flex-col">
        <Header title="Call Not Found" />
        <div className="flex flex-col items-center justify-center p-12">
          <p className="text-muted-foreground">This call could not be found.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/calls")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to calls
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header
        title={call.caller_name || formatPhoneNumber(call.caller_number || "Unknown Caller")}
        description={format(new Date(call.started_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/calls")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to calls
        </Button>

        {/* Call overview cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">{formatDuration(call.duration_seconds)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost</p>
                <p className="text-lg font-bold">{formatCurrency(call.cost_cents)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outcome</p>
                <Badge
                  variant={
                    call.end_reason === "completed" || call.end_reason === "hangup"
                      ? "success"
                      : call.end_reason === "error"
                      ? "destructive"
                      : "secondary"
                  }
                  className="mt-1"
                >
                  {call.end_reason || "completed"}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Caller</p>
                <p className="text-sm font-medium">
                  {call.caller_number ? formatPhoneNumber(call.caller_number) : "Unknown"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {call.summary ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{call.summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">No summary available</p>
              )}

              {call.success_score !== null && call.success_score !== undefined && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Success Score</p>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-full bg-muted">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            call.success_score >= 0.7
                              ? "bg-emerald-500"
                              : call.success_score >= 0.4
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.round(call.success_score * 100)}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold">
                        {Math.round(call.success_score * 100)}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow label="Call ID" value={call.vapi_call_id || call.id} />
              <DetailRow
                label="Started"
                value={format(new Date(call.started_at), "MMM d, yyyy h:mm:ss a")}
              />
              {call.ended_at && (
                <DetailRow
                  label="Ended"
                  value={format(new Date(call.ended_at), "MMM d, yyyy h:mm:ss a")}
                />
              )}
              <DetailRow label="Duration" value={formatDuration(call.duration_seconds)} />
              <DetailRow label="Cost" value={formatCurrency(call.cost_cents)} />
              {call.end_reason && <DetailRow label="End Reason" value={call.end_reason} />}
            </CardContent>
          </Card>
        </div>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            {call.transcript ? (
              <div className="max-h-[600px] overflow-y-auto rounded-lg bg-muted/50 p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                  {call.transcript}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic py-8 text-center">
                No transcript available for this call
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">{value}</span>
    </div>
  )
}
