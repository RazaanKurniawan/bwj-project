-- Fungsi untuk mendapatkan ulasan pelanggan secara aman (bypassing RLS)
-- Buka SQL Editor di Dashboard Supabase Anda, lalu tempel dan jalankan query ini.

CREATE OR REPLACE FUNCTION get_recent_reviews(limit_val int DEFAULT 6)
RETURNS TABLE(customer_name text, rating int, review text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER -- Agar bisa diakses secara publik/anonim tanpa melanggar RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.customer_name::text,
    o.rating::int,
    o.review::text,
    o.created_at::timestamptz
  FROM orders o
  WHERE o.rating IS NOT NULL 
    AND o.review IS NOT NULL 
    AND o.review <> ''
  ORDER BY o.created_at DESC
  LIMIT limit_val;
END;
$$;
