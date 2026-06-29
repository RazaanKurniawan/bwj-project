-- ============================================================
-- BWJ Project — FULL RESET + Seed Demo Accounts
-- Jalankan di: Supabase Dashboard → SQL Editor
--
-- Script ini:
--   1. Menghapus SEMUA data (termasuk auth)
--   2. Membuat 3 akun demo (admin, customer, driver)
--
-- Akun yang dibuat:
-- ┌───────────┬────────────────────┬─────────────┐
-- │ Role      │ Email              │ Password    │
-- ├───────────┼────────────────────┼─────────────┤
-- │ Admin     │ admin@bwj.demo     │ Demo@12345  │
-- │ Customer  │ customer@bwj.demo  │ Demo@12345  │
-- │ Driver    │ driver@bwj.demo    │ Demo@12345  │
-- └───────────┴────────────────────┴─────────────┘
-- ============================================================


-- ═══════════════════════════════════════════════════════════════
-- STEP 1: CLEANUP — Hapus semua data (urutan FK-safe)
-- ═══════════════════════════════════════════════════════════════

-- Hapus data publik dulu (yang punya FK)
DELETE FROM reward_claims;
DELETE FROM orders;
DELETE FROM profiles;

-- Hapus data auth
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.identities;
DELETE FROM auth.users;


-- ═══════════════════════════════════════════════════════════════
-- STEP 2: SEED DEMO ACCOUNTS
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  admin_uid    UUID := gen_random_uuid();
  customer_uid UUID := gen_random_uuid();
  driver_uid   UUID := gen_random_uuid();
BEGIN

  -- ═══════════════════════════════════════
  -- ADMIN
  -- ═══════════════════════════════════════
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_uid, 'authenticated', 'authenticated',
    'admin@bwj.demo',
    crypt('Demo@12345', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin BWJ","phone":"081234567890","role":"admin"}'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    admin_uid, admin_uid,
    jsonb_build_object('sub', admin_uid::text, 'email', 'admin@bwj.demo', 'email_verified', true),
    'email', admin_uid::text,
    now(), now(), now()
  );

  INSERT INTO profiles (id, name, email, phone, role)
  VALUES (admin_uid, 'Admin BWJ', 'admin@bwj.demo', '081234567890', 'admin'::user_role)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = EXCLUDED.role;


  -- ═══════════════════════════════════════
  -- CUSTOMER
  -- ═══════════════════════════════════════
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    customer_uid, 'authenticated', 'authenticated',
    'customer@bwj.demo',
    crypt('Demo@12345', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Budi Santoso","phone":"082345678901","role":"customer"}'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    customer_uid, customer_uid,
    jsonb_build_object('sub', customer_uid::text, 'email', 'customer@bwj.demo', 'email_verified', true),
    'email', customer_uid::text,
    now(), now(), now()
  );

  INSERT INTO profiles (id, name, email, phone, role)
  VALUES (customer_uid, 'Budi Santoso', 'customer@bwj.demo', '082345678901', 'customer'::user_role)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = EXCLUDED.role;


  -- ═══════════════════════════════════════
  -- DRIVER
  -- ═══════════════════════════════════════
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    driver_uid, 'authenticated', 'authenticated',
    'driver@bwj.demo',
    crypt('Demo@12345', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Andi Prasetyo","phone":"083456789012","role":"driver"}'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    driver_uid, driver_uid,
    jsonb_build_object('sub', driver_uid::text, 'email', 'driver@bwj.demo', 'email_verified', true),
    'email', driver_uid::text,
    now(), now(), now()
  );

  INSERT INTO profiles (id, name, email, phone, role)
  VALUES (driver_uid, 'Andi Prasetyo', 'driver@bwj.demo', '083456789012', 'driver'::user_role)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = EXCLUDED.role;

END $$;


-- ═══════════════════════════════════════════════════════════════
-- VERIFIKASI
-- ═══════════════════════════════════════════════════════════════
SELECT 'auth.users' AS tabel, COUNT(*) AS jumlah FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'reward_claims', COUNT(*) FROM reward_claims;

SELECT id, name, email, phone, role FROM profiles ORDER BY role;
