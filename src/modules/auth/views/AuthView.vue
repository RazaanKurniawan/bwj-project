<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { signInWithEmail, signUpWithEmail, resetPasswordForEmail } from "../services/authService";
import { useAuthStore } from "../stores/authStore";
import type { UserRole } from "../types";

const mode = ref<"login" | "signup" | "forgot-password">("login");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const name = ref("");
const phone = ref("");
const role = ref<UserRole>("customer");
const errorMsg = ref("");
const infoMsg = ref("");
const loading = ref(false);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const defaultRedirect = computed(() => {
  const roleValue = authStore.profile.value?.role;

  if (roleValue === "admin") {
    return "/admin";
  }

  if (roleValue === "driver") {
    return "/driver";
  }

  return "/customer";
});

const redirectTo = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === "string" ? redirect : defaultRedirect.value;
});

const switchMode = (nextMode: "login" | "signup" | "forgot-password") => {
  mode.value = nextMode;
  errorMsg.value = "";
  infoMsg.value = "";
  password.value = "";
  confirmPassword.value = "";
};

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = "";
  infoMsg.value = "";

  const { data, error } = await signInWithEmail(email.value, password.value);

  if (error) {
    errorMsg.value = error.message;
    loading.value = false;
    return;
  }

  if (data.session) {
    await authStore.updateSession(data.session);
  }
  loading.value = false;
  await router.replace(redirectTo.value);
};

const handleSignup = async () => {
  loading.value = true;
  errorMsg.value = "";
  infoMsg.value = "";

  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Konfirmasi password tidak cocok.";
    loading.value = false;
    return;
  }

  const { data, error } = await signUpWithEmail(email.value, password.value, {
    name: name.value || undefined,
    phone: phone.value || undefined,
    role: role.value,
  });

  if (error) {
    errorMsg.value = error.message;
    loading.value = false;
    return;
  }

  if (data.session) {
    await authStore.updateSession(data.session);
  }

  if (!data.session) {
    infoMsg.value = "Akun dibuat. Silakan cek email untuk verifikasi.";
  } else {
    await router.replace(redirectTo.value);
  }

  loading.value = false;
};

const handleForgotPassword = async () => {
  loading.value = true;
  errorMsg.value = "";
  infoMsg.value = "";

  if (!email.value) {
    errorMsg.value = "Silakan masukkan alamat email Anda.";
    loading.value = false;
    return;
  }

  const { error } = await resetPasswordForEmail(email.value, `${window.location.origin}/update-password`);

  if (error) {
    errorMsg.value = error.message;
  } else {
    infoMsg.value = "Tautan reset password telah dikirim ke email Anda. (Silakan cek folder Inbox/Spam)";
  }
  
  loading.value = false;
};

const handleSubmit = async () => {
  if (mode.value === "login") {
    await handleLogin();
    return;
  }
  
  if (mode.value === "forgot-password") {
    await handleForgotPassword();
    return;
  }

  await handleSignup();
};
</script>

<template>
  <section class="auth-page">
    <!-- Left panel: background image -->
    <div class="auth-image-panel">
      <div class="auth-image-overlay"></div>
      <div class="auth-image-content">
        <img src="/logobwj.jpeg" alt="BWJ" class="auth-brand-badge" />
        <h2>Berdikari Water Jaya</h2>
        <p>Pengisian Air Bersih — Depok, Jawa Barat</p>
        <div class="auth-image-dots">
          <span class="dot active"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>

    <!-- Right panel: form -->
    <div class="auth-form-panel">
      <div class="auth-form-wrapper">
        <div class="auth-form-header">
          <div class="auth-logo-mobile">
            <img src="/logobwj.jpeg" alt="BWJ" class="brand-mark-mini" />
            <span class="brand-text-mini">Tracking Air</span>
          </div>
          <h1>{{ mode === "login" ? "Selamat Datang 👋" : mode === "signup" ? "Buat Akun Baru" : "Lupa Password" }}</h1>
          <p>{{ mode === "login" ? "Masuk untuk mengelola pesanan depot air." : mode === "signup" ? "Daftarkan akun untuk mulai memesan." : "Masukkan email Anda dan kami akan mengirimkan tautan untuk mengatur ulang password." }}</p>
        </div>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div v-if="mode === 'signup'" class="field-grid">
            <label class="field">
              <span>Nama / Perusahaan (PT)</span>
              <div class="input-wrapper">
                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input v-model="name" type="text" placeholder="Nama lengkap atau nama PT" />
              </div>
            </label>
            <label class="field">
              <span>No HP</span>
              <div class="input-wrapper">
                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <input v-model="phone" type="tel" placeholder="08xxxxxxxxxx" />
              </div>
            </label>
          </div>

          <label class="field">
            <span>Email</span>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input v-model="email" type="email" placeholder="email@contoh.com" required />
            </div>
          </label>
          <label class="field" v-if="mode !== 'forgot-password'">
            <div class="password-label">
              <span>Password</span>
              <button v-if="mode === 'login'" type="button" class="forgot-link" @click="switchMode('forgot-password')">Lupa Password?</button>
            </div>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Minimal 6 karakter" required />
              <button type="button" class="password-toggle" @click="showPassword = !showPassword" tabindex="-1">
                <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </label>
          <label v-if="mode === 'signup'" class="field">
            <span>Konfirmasi Password</span>
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
          <p v-if="infoMsg" class="info">{{ infoMsg }}</p>

          <button class="btn-primary" type="submit" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? "Memproses..." : mode === "login" ? "Masuk" : mode === "signup" ? "Daftar" : "Kirim Tautan" }}
          </button>
        </form>

        <footer class="card-footer">
          <span v-if="mode === 'login'">Belum punya akun?</span>
          <span v-else-if="mode === 'signup'">Sudah punya akun?</span>
          <span v-else>Kembali ke menu</span>
          <button class="btn-link" type="button" @click="switchMode(mode === 'login' ? 'signup' : 'login')">
            {{ mode === "login" ? "Daftar" : "Login" }}
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-page {
  display: flex;
  min-height: 100vh;
  background: #f0f4f8;
}

/* ─── Left Image Panel ─── */
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
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.25) 0%,
    rgba(15, 23, 42, 0.55) 60%,
    rgba(15, 23, 42, 0.85) 100%
  );
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

.auth-image-content h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.auth-image-content p {
  margin: 10px 0 0;
  font-size: 15px;
  opacity: 0.85;
  line-height: 1.5;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.auth-image-dots {
  display: flex;
  gap: 8px;
  margin-top: 28px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  transition: all 0.3s ease;
}

.dot.active {
  width: 28px;
  border-radius: 4px;
  background: #fff;
}

/* ─── Right Form Panel ─── */
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
  content: "";
  position: absolute;
  top: -120px;
  right: -120px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.auth-form-panel::after {
  content: "";
  position: absolute;
  bottom: -80px;
  left: -80px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.auth-form-wrapper {
  width: min(440px, 100%);
  position: relative;
  z-index: 1;
}

/* ─── Mobile brand (hidden on desktop) ─── */
.auth-logo-mobile {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.brand-mark-mini {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: cover;
}

.brand-text-mini {
  font-weight: 700;
  font-size: 18px;
  color: #0f172a;
}

/* ─── Form Header ─── */
.auth-form-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.auth-form-header p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 15px;
  line-height: 1.5;
}

/* ─── Form ─── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 32px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.password-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: #0ea5e9;
  cursor: pointer;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: #0284c7;
  text-decoration: underline;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #94a3b8;
  pointer-events: none;
  flex-shrink: 0;
}

.field input,
.field select {
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 42px 12px 42px;
  font-size: 14px;
  background: #fff;
  width: 100%;
  transition: all 0.2s ease;
  color: #0f172a;
  box-sizing: border-box;
}

.password-toggle {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: #0f172a;
}

.field input::placeholder {
  color: #94a3b8;
}

.field input:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}

.error {
  color: #dc2626;
  margin: 0;
  font-size: 14px;
  background: #fef2f2;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #fecaca;
}

.info {
  color: #0f766e;
  margin: 0;
  font-size: 14px;
  background: #f0fdfa;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #99f6e4;
}

.btn-primary {
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  padding: 14px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 28px;
  font-size: 14px;
  color: #64748b;
}

.btn-link {
  border: none;
  background: transparent;
  color: #0ea5e9;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.btn-link:hover {
  color: #0284c7;
}

/* ─── Mobile ─── */
@media (max-width: 900px) {
  .auth-page {
    flex-direction: column;
  }

  .auth-image-panel {
    min-height: 240px;
    flex: none;
  }

  .auth-image-content {
    padding: 24px 24px;
  }

  .auth-image-content h2 {
    font-size: 22px;
  }

  .auth-form-panel {
    padding: 32px 20px;
  }

  .auth-logo-mobile {
    display: flex;
  }

  .auth-form-header h1 {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .auth-image-panel {
    min-height: 180px;
  }

  .auth-image-content h2 {
    font-size: 18px;
  }

  .auth-image-content p {
    font-size: 13px;
  }

  .auth-brand-badge {
    width: 40px;
    height: 40px;
    font-size: 14px;
    margin-bottom: 14px;
  }
}
</style>
