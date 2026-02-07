"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { Building2, Users, Bot, Save, Loader2, Crown, Shield, User } from "lucide-react"
import type { Organization, OrgMember, Assistant, OrgRole } from "@/lib/supabase/types"

interface MemberWithEmail extends OrgMember {
  email?: string
}

export default function SettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<MemberWithEmail[]>([])
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgName, setOrgName] = useState("")

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's org
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .single() as { data: { org_id: string; role: string } | null }

      if (!membership) {
        setLoading(false)
        return
      }

      const orgRes = await supabase.from("organizations").select("*").eq("id", membership.org_id).single()
      const membersRes = await supabase.from("org_members").select("*").eq("org_id", membership.org_id)
      const assistantsRes = await supabase.from("assistants").select("*").eq("org_id", membership.org_id)

      if (orgRes.data) {
        setOrg(orgRes.data as Organization)
        setOrgName((orgRes.data as Organization).name)
      }
      setMembers((membersRes.data || []) as MemberWithEmail[])
      setAssistants((assistantsRes.data || []) as Assistant[])
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSaveOrg = async () => {
    if (!org) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from("organizations")
      .update({ name: orgName })
      .eq("id", org.id)
    setSaving(false)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3" />
      case "admin":
        return <Shield className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Settings" />
        <div className="p-6 lg:p-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" description="Manage your organization and team" />

      <div className="p-6 lg:p-8">
        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList>
            <TabsTrigger value="organization">
              <Building2 className="mr-2 h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="mr-2 h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="assistants">
              <Bot className="mr-2 h-4 w-4" />
              Assistants
            </TabsTrigger>
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Update your organization details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Your Organization"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={org?.slug || ""} disabled className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs. Contact support to change.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        org?.tier === "enterprise"
                          ? "default"
                          : org?.tier === "pro"
                          ? "secondary"
                          : "outline"
                      }
                      className="capitalize"
                    >
                      {org?.tier || "starter"}
                    </Badge>
                    {org?.tier !== "enterprise" && (
                      <Button variant="link" size="sm" className="text-primary">
                        Upgrade
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={handleSaveOrg}
                  disabled={saving || orgName === org?.name}
                  className="bg-gradient-to-r from-teal-600 to-teal-500"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage who has access to your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.email || member.user_id.slice(0, 4))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.email || member.user_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(member.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1 capitalize">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                    </div>
                  ))}

                  {members.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No team members found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assistants Tab */}
          <TabsContent value="assistants">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistants</CardTitle>
                <CardDescription>
                  Your connected Vapi voice assistants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assistants.map((assistant) => (
                    <div
                      key={assistant.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-400">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{assistant.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {assistant.phone_number || "No phone number"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}

                  {assistants.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No assistants configured yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
