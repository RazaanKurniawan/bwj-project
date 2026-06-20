-- Fungsi untuk mendapatkan akumulasi rating dan jumlah ulasan secara aman (bypassing RLS)
-- Buka SQL Editor di Dashboard Supabase Anda, lalu tempel dan jalankan query ini.

CREATE OR REPLACE FUNCTION get_rating_stats()
RETURNS TABLE(avg_rating numeric, total_reviews bigint)
LANGUAGE plpgsql
SECURITY DEFINER -- Agar bisa diakses secara publik/anonim tanpa melanggar RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0) as avg_rating,
    COUNT(rating)::bigint as total_reviews
  FROM orders
  WHERE rating IS NOT NULL;
END;
$$;

-- Fungsi untuk mendapatkan jumlah pesanan selesai milik customer secara aman (bypassing RLS)
CREATE OR REPLACE FUNCTION get_completed_order_count(cust_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER -- Memungkinkan customer menghitung pesanan mereka melewati RLS
AS $$
DECLARE
  order_count bigint;
BEGIN
  SELECT COUNT(*)::bigint INTO order_count
  FROM orders
  WHERE customer_id = cust_id AND status = 'selesai';
  
  RETURN order_count;
END;
$$;
