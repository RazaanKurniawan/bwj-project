-- ============================================================
-- BWJ Project — Database Cleanup Script
-- Jalankan di: Supabase Dashboard → SQL Editor
--
-- Script ini MENGHAPUS semua data pesanan & reward claims,
-- tetapi MEMPERTAHANKAN semua akun user (profiles).
-- ============================================================

-- ─────────────────────────────────────────
-- 1. Hapus semua reward claims
--    (harus dihapus duluan karena foreign key ke profiles)
-- ─────────────────────────────────────────
DELETE FROM reward_claims;

-- ─────────────────────────────────────────
-- 2. Hapus semua pesanan (orders)
-- ─────────────────────────────────────────
DELETE FROM orders;

-- ─────────────────────────────────────────
-- 3. (Opsional) Reset storage bucket 'proofs'
--    Uncomment jika mau hapus foto bukti pengiriman juga.
--    Catatan: file di storage harus dihapus manual dari
--    Supabase Dashboard → Storage → proofs, atau via API.
-- ─────────────────────────────────────────
-- Tidak bisa di-DELETE via SQL, harus via Storage API.
-- Tapi kamu bisa kosongkan dari: Storage → proofs → Select All → Delete


-- ─────────────────────────────────────────
-- Verifikasi (jalankan setelah cleanup)
-- ─────────────────────────────────────────
SELECT 'orders'        AS tabel, COUNT(*) AS sisa FROM orders
UNION ALL
SELECT 'reward_claims' AS tabel, COUNT(*) AS sisa FROM reward_claims;
