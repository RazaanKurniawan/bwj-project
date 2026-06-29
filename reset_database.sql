-- ============================================================
-- BWJ Project — FULL Database Reset Script
-- Jalankan di: Supabase Dashboard → SQL Editor
--
-- Script ini MENGHAPUS SEMUA DATA di database:
--   1. reward_claims
--   2. orders
--   3. profiles
--   4. auth.users (via admin API)
--
-- ⚠️  PERINGATAN: Semua data akan HILANG PERMANEN!
-- ============================================================

-- ─────────────────────────────────────────
-- 1. Hapus semua reward claims
--    (FK ke profiles, harus dihapus duluan)
-- ─────────────────────────────────────────
DELETE FROM reward_claims;

-- ─────────────────────────────────────────
-- 2. Hapus semua pesanan (orders)
--    (FK ke profiles via customer_id / assigned_driver_id)
-- ─────────────────────────────────────────
DELETE FROM orders;

-- ─────────────────────────────────────────
-- 3. Hapus semua profiles
-- ─────────────────────────────────────────
DELETE FROM profiles;

-- ─────────────────────────────────────────
-- 4. Hapus semua user dari auth.users
--    (Harus pakai schema auth secara langsung)
-- ─────────────────────────────────────────
DELETE FROM auth.users;

-- ─────────────────────────────────────────
-- 5. (Opsional) Bersihkan storage bucket 'proofs'
--    File di storage TIDAK bisa dihapus via SQL.
--    Hapus manual dari: Supabase Dashboard → Storage → proofs → Select All → Delete
-- ─────────────────────────────────────────


-- ─────────────────────────────────────────
-- Verifikasi (jalankan setelah reset)
-- ─────────────────────────────────────────
SELECT 'auth.users'     AS tabel, COUNT(*) AS sisa FROM auth.users
UNION ALL
SELECT 'profiles'       AS tabel, COUNT(*) AS sisa FROM profiles
UNION ALL
SELECT 'orders'         AS tabel, COUNT(*) AS sisa FROM orders
UNION ALL
SELECT 'reward_claims'  AS tabel, COUNT(*) AS sisa FROM reward_claims;
