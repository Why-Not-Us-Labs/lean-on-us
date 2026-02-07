import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user has an org membership, if not create new org
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .single()

        if (!membership) {
          // Create new org for new users (self-serve signup)
          const emailDomain = user.email?.split('@')[0] || 'user'
          const timestamp = Date.now().toString().slice(-4)
          const orgName = `${emailDomain.charAt(0).toUpperCase()}${emailDomain.slice(1)}`
          const orgSlug = `${emailDomain}-${timestamp}`.toLowerCase()
          
          const { data: newOrg } = await supabase
            .from("organizations")
            .insert({
              name: orgName,
              slug: orgSlug,
              tier: "free" as const,
              settings: {}
            })
            .select("id")
            .single()

          if (newOrg) {
            await supabase.from("org_members").insert({
              user_id: user.id,
              org_id: newOrg.id,
              role: "owner",
            })
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
