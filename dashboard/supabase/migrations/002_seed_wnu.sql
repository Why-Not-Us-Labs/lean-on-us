-- Seed: Why Not Us Labs as tenant zero
-- Run AFTER 001_initial_schema.sql
-- NOTE: Replace <USER_UUID> with Gavin's actual Supabase auth user ID after first login

-- Create our org
INSERT INTO organizations (id, name, slug, tier, settings) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Why Not Us Labs',
  'wnu',
  'enterprise',
  '{"is_super_tenant": true}'
);

-- Register Riley as our assistant
INSERT INTO assistants (id, org_id, vapi_assistant_id, name, phone_number, config) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '9e62f13e-5604-4b62-8b38-0ca39c0c46be',
  'Riley',
  '+15164713583',
  '{"voice": "Savannah", "model": "gpt-4o", "forward_to": "+16674941283"}'
);

-- Seed the 6 real calls
INSERT INTO calls (org_id, assistant_id, vapi_call_id, caller_number, caller_name, started_at, ended_at, duration_seconds, cost_cents, end_reason, summary) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'seed-call-001',
  '+15168161879',
  'Gavin McNamara',
  '2025-02-05 15:55:00-05',
  '2025-02-05 16:00:00-05',
  300,
  50,
  'silence-timeout',
  'Test call from Gavin. Approximately 5 minute conversation before silence timeout.'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'seed-call-002',
  '+16502132955',
  NULL,
  '2025-02-05 16:19:00-05',
  '2025-02-05 16:22:30-05',
  210,
  44,
  'hangup',
  'Unknown caller from 650 area code. 3.5 minute conversation, caller hung up.'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'seed-call-003',
  '+15168161879',
  'Gavin McNamara',
  '2025-02-05 17:53:00-05',
  '2025-02-05 17:53:05-05',
  5,
  1,
  'hangup',
  'Brief test call from Gavin, hung up after 5 seconds.'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'seed-call-004',
  '+15162385609',
  'Graham Miller',
  '2026-02-06 21:29:00-05',
  '2026-02-06 21:29:18-05',
  18,
  4,
  'forwarded',
  'Call from Graham, forwarded to Gavin after 18 seconds.'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'seed-call-005',
  '+15166758018',
  NULL,
  '2026-02-06 11:21:00-05',
  '2026-02-06 11:21:17-05',
  17,
  4,
  'forwarded',
  'Unknown caller from 516 area, forwarded to Gavin.'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'seed-call-006',
  '+15166758018',
  NULL,
  '2026-02-06 11:21:30-05',
  '2026-02-06 11:23:30-05',
  120,
  21,
  'hangup',
  'Second call from same 516-675-8018 number. 2 minute conversation, caller hung up.'
);

-- Seed leads from unique callers
INSERT INTO leads (org_id, phone, name, source, notes) VALUES
('00000000-0000-0000-0000-000000000001', '+16502132955', NULL, 'call', 'Unknown caller from Bay Area (650). Called Feb 5, spoke for 3.5 min.'),
('00000000-0000-0000-0000-000000000001', '+15166758018', NULL, 'call', 'Called twice on Feb 6. First forwarded, second spoke 2 min then hung up.');
