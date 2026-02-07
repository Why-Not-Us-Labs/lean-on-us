"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { Organization, OrgRole } from "@/lib/supabase/types"

interface OrgContext {
  org: Organization | null
  role: OrgRole | null
  loading: boolean
  error: string | null
}

export function useOrg(): OrgContext {
  const [org, setOrg] = useState<Organization | null>(null)
  const [role, setRole] = useState<OrgRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrg() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: membershipRaw, error: memberError } = await supabase
          .from("org_members")
          .select("org_id, role")
          .eq("user_id", user.id)
          .single()

        const membership = membershipRaw as { org_id: string; role: string } | null

        if (memberError || !membership) {
          setError("No organization found for this user")
          setLoading(false)
          return
        }

        setRole(membership.role as OrgRole)

        const { data: orgRaw, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", membership.org_id)
          .single()

        if (orgError || !orgRaw) {
          setError("Organization not found")
          setLoading(false)
          return
        }

        setOrg(orgRaw as Organization)
      } catch (err) {
        setError("Failed to load organization")
      } finally {
        setLoading(false)
      }
    }

    fetchOrg()
  }, [])

  return { org, role, loading, error }
}
