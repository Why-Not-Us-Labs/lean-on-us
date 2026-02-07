export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrgTier = "free" | "starter" | "pro" | "enterprise"
export type OrgRole = "owner" | "admin" | "member"

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          tier: OrgTier
          created_at: string
          settings: Json
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          current_period_end: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          tier?: OrgTier
          created_at?: string
          settings?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          current_period_end?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          tier?: OrgTier
          created_at?: string
          settings?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          current_period_end?: string | null
        }
      }
      org_members: {
        Row: {
          id: string
          user_id: string
          org_id: string
          role: OrgRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          role?: OrgRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
          role?: OrgRole
          created_at?: string
        }
      }
      assistants: {
        Row: {
          id: string
          org_id: string
          vapi_assistant_id: string
          name: string
          phone_number: string | null
          config: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          vapi_assistant_id: string
          name: string
          phone_number?: string | null
          config?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          vapi_assistant_id?: string
          name?: string
          phone_number?: string | null
          config?: Json
          created_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          org_id: string
          assistant_id: string | null
          vapi_call_id: string | null
          caller_number: string | null
          caller_name: string | null
          started_at: string
          ended_at: string | null
          duration_seconds: number
          cost_cents: number
          end_reason: string | null
          transcript: string | null
          summary: string | null
          success_score: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          assistant_id?: string | null
          vapi_call_id?: string | null
          caller_number?: string | null
          caller_name?: string | null
          started_at: string
          ended_at?: string | null
          duration_seconds?: number
          cost_cents?: number
          end_reason?: string | null
          transcript?: string | null
          summary?: string | null
          success_score?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          assistant_id?: string | null
          vapi_call_id?: string | null
          caller_number?: string | null
          caller_name?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number
          cost_cents?: number
          end_reason?: string | null
          transcript?: string | null
          summary?: string | null
          success_score?: number | null
          metadata?: Json
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          org_id: string
          phone: string | null
          name: string | null
          email: string | null
          score: number | null
          source: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          phone?: string | null
          name?: string | null
          email?: string | null
          score?: number | null
          source?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          phone?: string | null
          name?: string | null
          email?: string | null
          score?: number | null
          source?: string | null
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      org_tier: OrgTier
      org_role: OrgRole
    }
  }
}

// Convenience types
export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type OrgMember = Database["public"]["Tables"]["org_members"]["Row"]
export type Assistant = Database["public"]["Tables"]["assistants"]["Row"]
export type Call = Database["public"]["Tables"]["calls"]["Row"]
export type Lead = Database["public"]["Tables"]["leads"]["Row"]
