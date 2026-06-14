<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { updateUserCredentials } from "../services/authService";
import { useAuthStore } from "../stores/authStore";

const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const loading = ref(false);

const router = useRouter();
const authStore = useAuthStore();

// Optional: check if the user is actually authenticated via the recovery link
// Supabase handles the hash implicitly and logs the user in if the token is valid.
onMounted(async () => {
  await authStore.initAuth();
  if (!authStore.user.value) {
    errorMsg.value = "Tautan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.";
  }
});

const handleUpdatePassword = async () => {
  if (!authStore.user.value) {
    errorMsg.value = "Sesi tidak valid.";
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Konfirmasi password tidak cocok.";
    return;
  }

  if (password.value.length < 6) {
    errorMsg.value = "Password minimal 6 karakter.";
    return;
  }

  loading.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  const { error } = await updateUserCredentials({ password: password.value });

  if (error) {
    errorMsg.value = error.message;
  } else {
    successMsg.value = "Password berhasil diperbarui! Anda akan diarahkan ke halaman login.";
    setTimeout(() => {
      authStore.signOut(); // Force them to login again with new password
      router.replace("/login");
    }, 3000);
  }

  loading.value = false;
};
</script>

<template>
  <section class="auth-page">
    <div class="auth-image-panel">
      <div class="auth-image-overlay"></div>
      <div class="auth-image-content">
        <img src="/logobwj.jpeg" alt="BWJ" class="auth-brand-badge" />
        <h2>Berdikari Water Jaya</h2>
        <p>Pengisian Air Bersih — Depok, Jawa Barat</p>
      </div>
    </div>

    <div class="auth-form-panel">
      <div class="auth-form-wrapper">
        <div class="auth-form-header">
          <div class="auth-logo-mobile">
            <img src="/logobwj.jpeg" alt="BWJ" class="brand-mark-mini" />
            <span class="brand-text-mini">Tracking Air</span>
          </div>
          <h1>Ubah Password</h1>
          <p>Silakan masukkan password baru Anda.</p>
        </div>

        <form class="auth-form" @submit.prevent="handleUpdatePassword">
          <label class="field">
            <span>Password Baru</span>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Minimal 6 karakter" required />
              <button type="button" class="password-toggle" @click="showPassword = !showPassword" tabindex="-1">
                <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </label>

          <label class="field">
            <span>Konfirmasi Password Baru</span>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="Ulangi password" required />
              <button type="button" class="password-toggle" @click="showConfirmPassword = !showConfirmPassword" tabindex="-1">
                <svg v-if="!showConfirmPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </label>

          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
          <p v-if="successMsg" class="info">{{ successMsg }}</p>

          <button class="btn-primary" type="submit" :disabled="loading || !authStore.user.value">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? "Menyimpan..." : "Simpan Password" }}
          </button>
        </form>

        <footer class="card-footer">
          <router-link to="/login" class="btn-link">Kembali ke Login</router-link>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Resembling AuthView styling for consistency */
.auth-page {
  display: flex;
  min-height: 100vh;
  background: #f0f4f8;
}

.auth-image-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  background: url("/Cuplikan layar 2026-06-08 090900.png") center/cover no-repeat;
  min-height: 100vh;
}

.auth-image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, rgba(15, 23, 42, 0.55) 60%, rgba(15, 23, 42, 0.85) 100%);
  z-index: 1;
}

.auth-image-content {
  position: relative;
  z-index: 2;
  padding: 48px 40px;
  color: #fff;
}

.auth-brand-badge {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
}

.auth-image-content h2 { margin: 0; font-size: 28px; font-weight: 700; line-height: 1.3; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
.auth-image-content p { margin: 10px 0 0; font-size: 15px; opacity: 0.85; line-height: 1.5; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2); }

.auth-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  background: linear-gradient(165deg, #f0f9ff 0%, #e0f2fe 30%, #f8fafc 100%);
  position: relative;
  overflow: hidden;
}

.auth-form-panel::before {
  content: ""; position: absolute; top: -120px; right: -120px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%); pointer-events: none;
}
.auth-form-panel::after {
  content: ""; position: absolute; bottom: -80px; left: -80px; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%); pointer-events: none;
}

.auth-form-wrapper { width: min(440px, 100%); position: relative; z-index: 1; }

.auth-logo-mobile { display: none; align-items: center; gap: 10px; margin-bottom: 24px; }
.brand-mark-mini { width: 38px; height: 38px; border-radius: 10px; object-fit: cover; }
.brand-text-mini { font-weight: 700; font-size: 18px; color: #0f172a; }

.auth-form-header h1 { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.auth-form-header p { margin: 8px 0 0; color: #64748b; font-size: 15px; line-height: 1.5; }

.auth-form { display: flex; flex-direction: column; gap: 16px; margin-top: 32px; }

.field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; color: #334155; }
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; flex-shrink: 0; }

.field input { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 42px; font-size: 14px; background: #fff; width: 100%; transition: all 0.2s ease; color: #0f172a; box-sizing: border-box; }
.field input::placeholder { color: #94a3b8; }
.field input:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15); }

.password-toggle { position: absolute; right: 14px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
.password-toggle:hover { color: #0f172a; }

.error { color: #dc2626; margin: 0; font-size: 14px; background: #fef2f2; padding: 10px 14px; border-radius: 10px; border: 1px solid #fecaca; }
.info { color: #0f766e; margin: 0; font-size: 14px; background: #f0fdfa; padding: 10px 14px; border-radius: 10px; border: 1px solid #99f6e4; }

.btn-primary { border: none; border-radius: 12px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 14px; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.25s ease; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.7; cursor: wait; }

.spinner { width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.card-footer { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 28px; font-size: 14px; color: #64748b; }
.btn-link { border: none; background: transparent; color: #0ea5e9; font-weight: 700; cursor: pointer; padding: 0; transition: color 0.2s; text-decoration: none; }
.btn-link:hover { color: #0284c7; }

@media (max-width: 900px) {
  .auth-page { flex-direction: column; }
  .auth-image-panel { min-height: 240px; flex: none; }
  .auth-image-content { padding: 24px 24px; }
  .auth-image-content h2 { font-size: 22px; }
  .auth-form-panel { padding: 32px 20px; }
  .auth-logo-mobile { display: flex; }
  .auth-form-header h1 { font-size: 24px; }
}
@media (max-width: 480px) {
  .auth-image-panel { min-height: 180px; }
  .auth-image-content h2 { font-size: 18px; }
  .auth-image-content p { font-size: 13px; }
  .auth-brand-badge { width: 40px; height: 40px; font-size: 14px; margin-bottom: 14px; }
}
</style>
