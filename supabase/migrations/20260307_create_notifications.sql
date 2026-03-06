-- Migration: Create notifications table
-- Description: Store in-app notifications for payment reminders and alerts
-- Part of: auto-create-rental-ledger change

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification Type
  type TEXT NOT NULL CHECK (type IN (
    'payment_due',
    'payment_overdue',
    'payment_received',
    'ledger_created',
    'ledger_pending_confirmation'
  )),

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Actions
  action_url TEXT,
  action_label TEXT,

  -- Metadata
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX idx_notifications_unread ON notifications(target_user_id, read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Index for finding unread notifications quickly
CREATE INDEX idx_notifications_unread_by_user ON notifications(target_user_id, read)
  WHERE read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());

-- Allow authenticated users to insert (typically via service role or triggers)
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service role full access (for cron jobs and edge functions)
CREATE POLICY "Service role has full access"
  ON notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE notifications IS 'In-app notifications for payment reminders and alerts';
COMMENT ON COLUMN notifications.type IS 'Notification type: payment_due, payment_overdue, payment_received, ledger_created, ledger_pending_confirmation';
COMMENT ON COLUMN notifications.payload IS 'JSON data: { rider_name, vehicle_number, amount, due_date, week_number, ledger_id, payment_id }';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate when notification is clicked';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notifications.expires_at IS 'When notification is no longer relevant (optional)';
