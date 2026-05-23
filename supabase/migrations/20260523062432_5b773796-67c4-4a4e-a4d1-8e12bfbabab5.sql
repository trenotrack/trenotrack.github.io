
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Push subscriptions (one per device)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- No public policies: only service role (edge functions) accesses this table

-- Tracked trains (one device can track many trains)
CREATE TABLE public.tracked_trains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  train_number INTEGER NOT NULL,
  origin_code TEXT NOT NULL,
  data_partenza BIGINT NOT NULL,
  line_label TEXT,
  destination TEXT,
  last_notification_hash TEXT,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_id, train_number, data_partenza)
);

CREATE INDEX idx_tracked_trains_device ON public.tracked_trains(device_id);

ALTER TABLE public.tracked_trains ENABLE ROW LEVEL SECURITY;
-- No public policies: only service role accesses this table
