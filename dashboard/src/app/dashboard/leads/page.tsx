"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/dashboard/header"
import { DataTable } from "@/components/dashboard/data-table"
import { Badge } from "@/components/ui/badge"
import { formatPhoneNumber } from "@/lib/utils"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import type { Lead, Organization } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpDown, Star, Lock, Zap } from "lucide-react"
import Link from "next/link"

function getScoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground"
  if (score >= 8) return "text-emerald-500"
  if (score >= 5) return "text-amber-500"
  return "text-red-500"
}

function getScoreLabel(score: number | null): string {
  if (!score) return "Unscored"
  if (score >= 8) return "Hot"
  if (score >= 5) return "Warm"
  return "Cold"
}

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name") || "Unknown"}</div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string | null
      return phone ? formatPhoneNumber(phone) : "—"
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.getValue("email") || "—",
  },
  {
    accessorKey: "score",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.getValue("score") as number | null
      return (
        <div className="flex items-center gap-2">
          <Star className={`h-4 w-4 ${getScoreColor(score)}`} />
          <span className={`text-sm font-medium ${getScoreColor(score)}`}>
            {score !== null ? `${score}/10` : "—"}
          </span>
          <Badge
            variant={
              score && score >= 8 ? "success" : score && score >= 5 ? "warning" : "secondary"
            }
            className="text-[10px]"
          >
            {getScoreLabel(score)}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {(row.getValue("source") as string) || "call"}
      </Badge>
    ),
  },
  {
    accessorKey: "created_at",
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
    cell: ({ row }) =>
      format(new Date(row.getValue("created_at")), "MMM d, yyyy"),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | null
      return notes ? (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
          {notes}
        </span>
      ) : (
        "—"
      )
    },
  },
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeads() {
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
        setOrg(membership.organizations as unknown as Organization)
      }

      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })

      setLeads((data || []) as Lead[])
      setLoading(false)
    }
    fetchLeads()
  }, [])

  return (
    <div className="flex flex-col">
      <Header title="Leads" description="Prospects captured from your AI receptionist calls" />

      <div className="p-6 lg:p-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : org?.tier === "free" ? (
          <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/20 p-4 mb-6">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lead Capture Available on Paid Plans</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Upgrade to start capturing leads automatically from your AI phone calls. 
                Track prospects, scores, and follow-up opportunities.
              </p>
              <Link href="/dashboard/billing">
                <Button size="lg">
                  <Zap className="mr-2 h-5 w-5" />
                  Upgrade to Starter
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={columns}
            data={leads}
            searchKey="name"
            searchPlaceholder="Search leads..."
          />
        )}
      </div>
    </div>
  )
}
