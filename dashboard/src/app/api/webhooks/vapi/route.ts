import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// Use service role key for webhook ingestion (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    // Vapi sends different message types — we care about "end-of-call-report"
    if (message?.type !== "end-of-call-report") {
      return NextResponse.json({ received: true, processed: false })
    }

    const call = message

    // Look up the assistant to find the org
    const assistantId = call.assistant?.id || call.assistantId
    const { data: assistant } = await supabase
      .from("assistants")
      .select("id, org_id")
      .eq("vapi_assistant_id", assistantId)
      .single()

    if (!assistant) {
      console.error(`No assistant found for Vapi ID: ${assistantId}`)
      return NextResponse.json({ error: "Unknown assistant" }, { status: 404 })
    }

    // Extract transcript as readable text
    const transcript = call.transcript
      ? typeof call.transcript === "string"
        ? call.transcript
        : call.transcript
            .map((t: { role: string; message: string }) => `${t.role}: ${t.message}`)
            .join("\n")
      : null

    // Calculate cost in cents
    const costCents = call.cost ? Math.round(call.cost * 100) : 0

    // Calculate duration
    const startedAt = call.startedAt || call.createdAt || new Date().toISOString()
    const endedAt = call.endedAt || new Date().toISOString()
    const durationSeconds = call.duration
      ? Math.round(call.duration)
      : Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)

    // Insert call record
    const { data: callRecord, error: callError } = await supabase
      .from("calls")
      .insert({
        org_id: assistant.org_id,
        assistant_id: assistant.id,
        vapi_call_id: call.callId || call.id,
        caller_number: call.customer?.number || null,
        caller_name: null, // Will be enriched later
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        cost_cents: costCents,
        end_reason: call.endedReason || "completed",
        transcript,
        summary: call.summary || call.analysis?.summary || null,
        success_score: call.analysis?.successEvaluation
          ? parseFloat(call.analysis.successEvaluation) / 10
          : null,
        metadata: {
          costBreakdown: call.costBreakdown || null,
          model: call.assistant?.model?.model || null,
          voice: call.assistant?.voice?.voiceId || null,
          phoneNumberId: call.phoneNumberId || null,
        },
      })
      .select()
      .single()

    if (callError) {
      console.error("Failed to insert call:", callError)
      return NextResponse.json({ error: "Insert failed" }, { status: 500 })
    }

    // Auto-create or update lead from caller number
    const callerNumber = call.customer?.number
    if (callerNumber) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("org_id", assistant.org_id)
        .eq("phone", callerNumber)
        .single()

      if (!existingLead) {
        await supabase.from("leads").insert({
          org_id: assistant.org_id,
          phone: callerNumber,
          source: "call",
          notes: call.summary || call.analysis?.summary || `Called on ${new Date(startedAt).toLocaleDateString()}`,
        })
      }
    }

    return NextResponse.json({
      received: true,
      processed: true,
      callId: callRecord.id,
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// Vapi may send GET for webhook validation
export async function GET() {
  return NextResponse.json({ status: "ok", service: "leanon-vapi-webhook" })
}
