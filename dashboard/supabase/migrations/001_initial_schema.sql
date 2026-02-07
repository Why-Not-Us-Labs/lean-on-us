-- LeanOn.Us Multi-Tenant Dashboard Schema
-- Run against wnu-platform Supabase project

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE org_tier AS ENUM ('starter', 'pro', 'enterprise');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');

-- ============================================
-- ORGANIZATIONS (tenants)
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tier org_tier NOT NULL DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- ORG MEMBERS (links auth.users → organizations)
-- ============================================

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);

-- ============================================
-- ASSISTANTS (Vapi voice agents per org)
-- ============================================

CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vapi_assistant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assistants_org ON assistants(org_id);
CREATE INDEX idx_assistants_vapi_id ON assistants(vapi_assistant_id);

-- ============================================
-- CALLS (call log)
-- ============================================

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
  vapi_call_id TEXT,
  caller_number TEXT,
  caller_name TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  end_reason TEXT,
  transcript TEXT,
  summary TEXT,
  success_score REAL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_org ON calls(org_id);
CREATE INDEX idx_calls_org_started ON calls(org_id, started_at DESC);
CREATE INDEX idx_calls_vapi_id ON calls(vapi_call_id);
CREATE INDEX idx_calls_caller ON calls(org_id, caller_number);

-- ============================================
-- LEADS (extracted from calls)
-- ============================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT,
  name TEXT,
  email TEXT,
  score REAL,
  source TEXT DEFAULT 'call',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_leads_org_phone ON leads(org_id, phone);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Helper function: get org IDs for current user
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid()
$$;

-- Helper function: check if user is super admin (owner of any enterprise org)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members om
    JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = auth.uid()
    AND om.role = 'owner'
    AND o.tier = 'enterprise'
  )
$$;

-- Organizations: users can see their own orgs
CREATE POLICY "Users can view own orgs" ON organizations
  FOR SELECT USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "Owners can update own orgs" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Org Members: users can see members of their orgs
CREATE POLICY "Users can view org members" ON org_members
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Owners can manage members" ON org_members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Assistants: users can see assistants in their org
CREATE POLICY "Users can view org assistants" ON assistants
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Admins can manage assistants" ON assistants
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Calls: users can see calls in their org
CREATE POLICY "Users can view org calls" ON calls
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

-- Super admins can see all calls
CREATE POLICY "Super admins can view all calls" ON calls
  FOR SELECT USING (is_super_admin());

-- Leads: users can see leads in their org
CREATE POLICY "Users can view org leads" ON leads
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can manage org leads" ON leads
  FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Super admins can see all leads
CREATE POLICY "Super admins can view all leads" ON leads
  FOR SELECT USING (is_super_admin());
