-- ============================================================
-- RPC Function: check_email_exists
-- Checks if an email is registered in auth.users
-- Can be called by anonymous (unauthenticated) users
-- Returns boolean
-- ============================================================

CREATE OR REPLACE FUNCTION check_email_exists(target_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(trim(target_email))
  );
END;
$$;

-- Allow anonymous and authenticated users to call this function
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon, authenticated;
