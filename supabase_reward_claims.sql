-- ============================================
-- Supabase Migration: reward_claims table
-- Run this SQL in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS reward_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_id TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  order_count_at_claim INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reward_claims_customer_id ON reward_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON reward_claims(status);

-- Enable RLS
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- Policy: customers can read their own claims
CREATE POLICY "Customers can view own claims"
  ON reward_claims FOR SELECT
  USING (auth.uid() = customer_id);

-- Policy: customers can insert their own claims
CREATE POLICY "Customers can create own claims"
  ON reward_claims FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Policy: admins can do everything
CREATE POLICY "Admins full access"
  ON reward_claims FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
