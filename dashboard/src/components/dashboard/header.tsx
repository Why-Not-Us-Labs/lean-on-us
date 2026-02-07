"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function Header({ title, description }: { title: string; description?: string }) {
  const [email, setEmail] = useState("")

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)
    }
    getUser()
  }, [])

  return (
    <header className="flex items-center justify-between border-b px-6 py-4 lg:px-8">
      <div className="ml-12 lg:ml-0">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{email}</p>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {email ? getInitials(email.split("@")[0]) : "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
