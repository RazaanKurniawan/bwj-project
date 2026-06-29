/**
 * BWJ Project — Reset Database & Seed Demo Accounts
 * 
 * Cara pakai:
 * 1. Ambil service_role key dari Supabase Dashboard → Settings → API → service_role
 * 2. Jalankan: node setup_demo.js YOUR_SERVICE_ROLE_KEY
 * 
 * Atau set environment variable:
 *   set SUPABASE_SERVICE_ROLE_KEY=your_key_here
 *   node setup_demo.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ─── Read .env ───
let envFile = fs.readFileSync('.env', 'utf-8');
// Remove BOM if present
envFile = envFile.replace(/^\uFEFF/, '');
const envVars = {};
envFile.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim();
    envVars[key] = val;
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const serviceRoleKey = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL tidak ditemukan di .env');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Service role key belum diisi!');
  console.error('');
  console.error('Cara pakai:');
  console.error('  node setup_demo.js YOUR_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Ambil service_role key dari:');
  console.error('  Supabase Dashboard → Settings → API → service_role (secret)');
  process.exit(1);
}

// Admin client dengan service_role key (bypass RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_ACCOUNTS = [
  {
    email: 'admin@bwj.demo',
    password: 'Demo@12345',
    name: 'Admin BWJ',
    phone: '081234567890',
    role: 'admin',
  },
  {
    email: 'customer@bwj.demo',
    password: 'Demo@12345',
    name: 'Budi Santoso',
    phone: '082345678901',
    role: 'customer',
  },
  {
    email: 'driver@bwj.demo',
    password: 'Demo@12345',
    name: 'Andi Prasetyo',
    phone: '083456789012',
    role: 'driver',
  },
];

async function main() {
  console.log('');
  console.log('🔧 BWJ Database Reset & Demo Setup');
  console.log('═'.repeat(45));

  // ─── STEP 1: Hapus semua data ───
  console.log('\n📦 Step 1: Menghapus semua data...');

  // Hapus reward_claims
  const { error: rcErr } = await supabase.from('reward_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (rcErr) console.warn('  ⚠ reward_claims:', rcErr.message);
  else console.log('  ✓ reward_claims dihapus');

  // Hapus orders
  const { error: ordErr } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (ordErr) console.warn('  ⚠ orders:', ordErr.message);
  else console.log('  ✓ orders dihapus');

  // ─── STEP 2: Hapus semua user ───
  console.log('\n👤 Step 2: Menghapus semua user...');

  // Hapus profiles dulu (FK constraint)
  const { error: profErr } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (profErr) console.warn('  ⚠ profiles:', profErr.message);
  else console.log('  ✓ profiles dihapus');

  // Coba list users via Admin API
  const { data: existingUsers, error: listErr } = await supabase.auth.admin.listUsers();
  
  if (listErr) {
    // Data auth korup dari insert SQL manual sebelumnya
    // Bersihkan via SQL langsung
    console.warn('  ⚠ listUsers gagal, membersihkan auth via SQL...');
    
    // Gunakan rpc untuk jalankan cleanup SQL
    const cleanupSql = `
      DELETE FROM auth.sessions;
      DELETE FROM auth.refresh_tokens;
      DELETE FROM auth.mfa_factors;
      DELETE FROM auth.identities;
      DELETE FROM auth.users;
    `;
    
    // Execute each statement separately via REST API
    const authTables = ['auth.sessions', 'auth.refresh_tokens', 'auth.mfa_factors', 'auth.identities', 'auth.users'];
    for (const table of authTables) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({}),
        });
      } catch (e) {
        // ignore
      }
    }
    
    // Direct SQL via Supabase Management API (pg endpoint)
    try {
      const pgRes = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      });
    } catch(e) {}

    // Try deleting via individual user lookup
    // Get user IDs from profiles we know about
    console.log('  ℹ Mencoba hapus user satu per satu...');
    const demoEmails = ['admin@bwj.demo', 'customer@bwj.demo', 'driver@bwj.demo'];
    for (const demoEmail of demoEmails) {
      try {
        // Try to find and delete each demo user
        const { data: userData } = await supabase.auth.admin.getUserById && 
          await supabase.auth.admin.listUsers({ filter: `email.eq.${demoEmail}` });
      } catch(e) {}
    }

    // Last resort: try listing again after cleanup attempts
    const { data: retryUsers, error: retryErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (!retryErr && retryUsers?.users) {
      for (const user of retryUsers.users) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
        if (delErr) console.warn(`  ⚠ ${user.email}: ${delErr.message}`);
        else console.log(`  ✓ Dihapus: ${user.email}`);
      }
    } else {
      console.error('  ❌ Tidak bisa membersihkan auth users.');
      console.error('  → Hapus manual dari Supabase Dashboard → Authentication → Users');
      console.error('  → Atau jalankan SQL ini di SQL Editor:');
      console.error('     DELETE FROM auth.identities;');
      console.error('     DELETE FROM auth.users;');
      console.error('  → Lalu jalankan script ini lagi.');
      process.exit(1);
    }
  } else if (existingUsers?.users?.length > 0) {
    for (const user of existingUsers.users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.warn(`  ⚠ Gagal hapus ${user.email}: ${delErr.message}`);
      } else {
        console.log(`  ✓ Dihapus: ${user.email}`);
      }
    }
  } else {
    console.log('  ℹ Tidak ada user yang perlu dihapus');
  }

  // ─── STEP 3: Buat akun demo ───
  console.log('\n🌱 Step 3: Membuat akun demo...');

  for (const account of DEMO_ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        name: account.name,
        phone: account.phone,
        role: account.role,
      },
    });

    if (error) {
      console.error(`  ❌ ${account.role} (${account.email}): ${error.message}`);
      continue;
    }

    // Update profile dengan role yang benar
    const { error: profError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
      }, { onConflict: 'id' });

    if (profError) {
      console.error(`  ⚠ Profile ${account.email}: ${profError.message}`);
    }

    console.log(`  ✓ ${account.role.padEnd(8)} → ${account.email}`);
  }

  // ─── STEP 4: Verifikasi ───
  console.log('\n✅ Verifikasi:');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('name, email, role')
    .order('role');

  if (profiles && profiles.length > 0) {
    console.log('');
    console.log('  ┌──────────┬────────────────────┬──────────────────┐');
    console.log('  │ Role     │ Email              │ Name             │');
    console.log('  ├──────────┼────────────────────┼──────────────────┤');
    for (const p of profiles) {
      console.log(`  │ ${(p.role || '').padEnd(8)} │ ${(p.email || '').padEnd(18)} │ ${(p.name || '').padEnd(16)} │`);
    }
    console.log('  └──────────┴────────────────────┴──────────────────┘');
  }

  const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: claimCount } = await supabase.from('reward_claims').select('*', { count: 'exact', head: true });

  console.log('');
  console.log(`  Orders:        ${orderCount ?? 0}`);
  console.log(`  Reward Claims: ${claimCount ?? 0}`);
  console.log('');
  console.log('═'.repeat(45));
  console.log('🎉 Setup selesai! Login dengan:');
  console.log('   Email:    admin@bwj.demo');
  console.log('   Password: Demo@12345');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
