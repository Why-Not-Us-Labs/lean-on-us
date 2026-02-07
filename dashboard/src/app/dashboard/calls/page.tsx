"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/dashboard/header"
import { DataTable } from "@/components/dashboard/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDuration, formatCurrency, formatPhoneNumber } from "@/lib/utils"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import type { Call } from "@/lib/supabase/types"
import Link from "next/link"
import { ArrowUpDown, ExternalLink } from "lucide-react"

const columns: ColumnDef<Call>[] = [
  {
    accessorKey: "started_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        <div>{format(new Date(row.getValue("started_at")), "MMM d, yyyy")}</div>
        <div className="text-muted-foreground">
          {format(new Date(row.getValue("started_at")), "h:mm a")}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "caller_name",
    header: "Caller",
    cell: ({ row }) => {
      const name = row.original.caller_name
      const phone = row.original.caller_number
      return (
        <div>
          <div className="font-medium">{name || "Unknown"}</div>
          {phone && (
            <div className="text-xs text-muted-foreground">
              {formatPhoneNumber(phone)}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "duration_seconds",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Duration
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDuration(row.getValue("duration_seconds")),
  },
  {
    accessorKey: "cost_cents",
    header: "Cost",
    cell: ({ row }) => formatCurrency(row.getValue("cost_cents")),
  },
  {
    accessorKey: "end_reason",
    header: "Outcome",
    cell: ({ row }) => {
      const reason = row.getValue("end_reason") as string
      return (
        <Badge
          variant={
            reason === "completed" || reason === "hangup"
              ? "success"
              : reason === "error"
              ? "destructive"
              : "secondary"
          }
        >
          {reason || "completed"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "success_score",
    header: "Score",
    cell: ({ row }) => {
      const score = row.getValue("success_score") as number | null
      if (score === null || score === undefined) return "—"
      const pct = Math.round(score * 100)
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-muted">
            <div
              className={`h-2 rounded-full ${
                pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/dashboard/calls/${row.original.id}`}>
        <Button variant="ghost" size="sm">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </Link>
    ),
  },
]

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCalls() {
      const supabase = createClient()
      const { data } = await supabase
        .from("calls")
        .select("*")
        .order("started_at", { ascending: false })

      setCalls((data || []) as Call[])
      setLoading(false)
    }
    fetchCalls()
  }, [])

  return (
    <div className="flex flex-col">
      <Header title="Calls" description="Complete call history from your AI receptionist" />

      <div className="p-6 lg:p-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={calls}
            searchKey="caller_name"
            searchPlaceholder="Search by caller name..."
          />
        )}
      </div>
    </div>
  )
}
