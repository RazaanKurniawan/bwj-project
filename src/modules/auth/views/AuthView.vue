<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { signInWithEmail, signUpWithEmail, resetPasswordForEmail, verifyOtp, resendOtp } from "../services/authService";
import { useAuthStore } from "../stores/authStore";
import { supabase } from "../../core/supabaseClient";
import type { UserRole } from "../types";

const mode = ref<"login" | "signup" | "forgot-password" | "check-email">("login");
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

// OTP Ref Variables
const otpResendLoading = ref(false);

// Rating aggregation
const avgRating = ref(0);
const totalReviews = ref(0);

// Slide Gambar
const sliderImages = [
  "/Cuplikan layar 2026-06-08 090900.png",
  "/WhatsApp Image 2026-06-20 at 16.23.03 (1).jpeg",
  "/WhatsApp Image 2026-06-20 at 16.23.03.jpeg",
];
const currentImageIndex = ref(0);
let sliderInterval: any = null;

onMounted(async () => {
  // Slider interval
  sliderInterval = setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % sliderImages.length;
  }, 5000);

  // Ambil data rating secara aman melalui RPC function untuk menghindari RLS block
  const { data, error } = await supabase.rpc("get_rating_stats");
  if (!error && data && data.length > 0) {
    const stats = data[0];
    if (stats.total_reviews > 0) {
      totalReviews.value = Number(stats.total_reviews);
      avgRating.value = Number(stats.avg_rating);
    }
  } else {
    // Fallback jika RPC belum dipasang di database
    const { data: fallbackData } = await supabase
      .from("orders")
      .select("rating")
      .not("rating", "is", null);
    if (fallbackData && fallbackData.length > 0) {
      const ratings = fallbackData.map((r: { rating: number }) => r.rating).filter(Boolean);
      if (ratings.length > 0) {
        totalReviews.value = ratings.length;
        avgRating.value = Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10;
      }
    }
  }
});

onUnmounted(() => {
  if (sliderInterval) {
    clearInterval(sliderInterval);
  }
});

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

const switchMode = (nextMode: "login" | "signup" | "forgot-password" | "check-email") => {
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

const validateSignup = () => {
  if (!name.value.trim()) {
    errorMsg.value = "Nama / Perusahaan wajib diisi.";
    return false;
  }
  if (name.value.trim().length < 3) {
    errorMsg.value = "Nama minimal 3 karakter.";
    return false;
  }
  if (!phone.value.trim()) {
    errorMsg.value = "Nomor HP wajib diisi.";
    return false;
  }
  
  // Clean phone input for numbers only
  const cleanedPhone = phone.value.trim().replace(/\D/g, "");
  if (!/^(08|628)[0-9]{8,11}$/.test(cleanedPhone)) {
    errorMsg.value = "Nomor HP tidak valid. Harus dimulai dengan 08/628 dan panjang 10-14 digit.";
    return false;
  }
  
  if (!email.value.trim()) {
    errorMsg.value = "Email wajib diisi.";
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errorMsg.value = "Format email tidak valid.";
    return false;
  }
  if (!password.value) {
    errorMsg.value = "Password wajib diisi.";
    return false;
  }
  if (password.value.length < 6) {
    errorMsg.value = "Password minimal 6 karakter.";
    return false;
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Konfirmasi password tidak cocok.";
    return false;
  }
  return true;
};

const handleSignup = async () => {
  errorMsg.value = "";
  infoMsg.value = "";

  if (!validateSignup()) {
    return;
  }

  loading.value = true;

  const { data, error } = await signUpWithEmail(email.value, password.value, {
    name: name.value.trim(),
    phone: phone.value.trim(),
    role: role.value,
  });

  if (error) {
    errorMsg.value = error.message;
    loading.value = false;
    return;
  }

  if (data.session) {
    await authStore.updateSession(data.session);
    loading.value = false;
    await router.replace(redirectTo.value);
  } else {
    // If no session is returned, it means email confirmation is required
    infoMsg.value = "Akun berhasil didaftarkan! Silakan cek inbox/spam email Anda untuk verifikasi.";
    loading.value = false;
    // Transition to check-email verification mode
    switchMode("check-email");
  }
};

const handleResendConfirmation = async () => {
  otpResendLoading.value = true;
  errorMsg.value = "";
  infoMsg.value = "";

  const { error } = await resendOtp(email.value);

  if (error) {
    errorMsg.value = error.message;
  } else {
    infoMsg.value = "Tautan verifikasi baru telah dikirim ke email Anda.";
  }
  otpResendLoading.value = false;
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
      <!-- Background images slider -->
      <div 
        v-for="(img, idx) in sliderImages" 
        :key="idx" 
        class="auth-slider-bg"
        :class="{ active: idx === currentImageIndex }"
        :style="{ backgroundImage: `url('${img}')` }"
      ></div>

      <div class="auth-image-overlay"></div>
      <div class="auth-image-content">
        <img src="/logobwj.jpeg" alt="BWJ" class="auth-brand-badge" />
        <h2>Berdikari Water Jaya</h2>
        <p>Pengisian Air Bersih — Depok, Jawa Barat</p>

        <!-- Rating Widget -->
        <div v-if="totalReviews > 0" class="rating-widget">
          <div class="rating-stars">
            <svg
              v-for="i in 5"
              :key="i"
              width="20" height="20" viewBox="0 0 24 24"
              :fill="i <= Math.round(avgRating) ? '#fbbf24' : 'none'"
              :stroke="i <= Math.round(avgRating) ? '#fbbf24' : 'rgba(255,255,255,0.4)'"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div class="rating-info">
            <span class="rating-score">{{ avgRating.toFixed(1) }}</span>
            <span class="rating-label">dari {{ totalReviews }} ulasan pelanggan</span>
          </div>
        </div>

        <div class="auth-image-dots">
          <span 
            v-for="(img, idx) in sliderImages" 
            :key="idx" 
            class="dot" 
            :class="{ active: idx === currentImageIndex }"
            @click="currentImageIndex = idx"
          ></span>
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
          <h1>{{ mode === "login" ? "Selamat Datang 👋" : mode === "signup" ? "Buat Akun Baru" : mode === "check-email" ? "Verifikasi Email Anda ✉️" : "Lupa Password" }}</h1>
          <p>{{ mode === "login" ? "Masuk untuk mengelola pesanan depot air." : mode === "signup" ? "Daftarkan akun untuk mulai memesan." : mode === "check-email" ? "Tautan verifikasi telah dikirim ke " + email : "Masukkan email Anda dan kami akan mengirimkan tautan untuk mengatur ulang password." }}</p>
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

          <label class="field" v-if="mode !== 'check-email'">
            <span>Email</span>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input v-model="email" type="email" placeholder="email@contoh.com" required />
            </div>
          </label>
          
          <label class="field" v-if="mode !== 'forgot-password' && mode !== 'check-email'">
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

          <!-- Check Email View -->
          <div v-if="mode === 'check-email'" class="check-email-container">
            <div class="check-email-illustration">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <p class="check-email-text">
              Kami telah mengirimkan tautan konfirmasi ke alamat email <strong>{{ email }}</strong>. Silakan klik tautan tersebut untuk mengaktifkan akun Anda.
            </p>
            <div class="check-email-resend">
              <span>Tidak menerima email?</span>
              <button
                type="button"
                class="otp-resend-btn"
                :disabled="otpResendLoading"
                @click="handleResendConfirmation"
              >
                {{ otpResendLoading ? "Mengirim ulang..." : "Kirim ulang email konfirmasi" }}
              </button>
            </div>
          </div>

          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
          <p v-if="infoMsg" class="info">{{ infoMsg }}</p>

          <button v-if="mode !== 'check-email'" class="btn-primary" type="submit" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? "Memproses..." : mode === "login" ? "Masuk" : mode === "signup" ? "Daftar" : "Kirim Tautan" }}
          </button>
        </form>

        <footer class="card-footer">
          <template v-if="mode === 'check-email'">
            <span>Sudah melakukan verifikasi?</span>
            <button class="btn-link" type="button" @click="switchMode('login')">
              Login ke Akun
            </button>
          </template>
          <template v-else>
            <span v-if="mode === 'login'">Belum punya akun?</span>
            <span v-else-if="mode === 'signup'">Sudah punya akun?</span>
            <span v-else>Kembali ke menu</span>
            <button class="btn-link" type="button" @click="switchMode(mode === 'login' ? 'signup' : 'login')">
              {{ mode === "login" ? "Daftar" : "Login" }}
            </button>
          </template>
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
  background: #0f172a;
  min-height: 100vh;
}

.auth-slider-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 1s ease-in-out;
  z-index: 0;
}

.auth-slider-bg.active {
  opacity: 1;
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

/* ─── Rating Widget ─── */
.rating-widget {
  margin-top: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.rating-stars {
  display: flex;
  gap: 2px;
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rating-score {
  font-size: 18px;
  font-weight: 800;
  color: #fbbf24;
}

.rating-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
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
  cursor: pointer;
}

.dot:hover {
  background: rgba(255, 255, 255, 0.65);
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

/* ─── Check Email Styles ─── */
.check-email-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 16px 8px;
}

.check-email-illustration {
  background: rgba(14, 165, 233, 0.08);
  border-radius: 50%;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  animation: pulse 2.5s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.06); opacity: 0.85; }
}

.check-email-text {
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
  margin: 0;
}

.check-email-text strong {
  color: #0f172a;
}

.check-email-resend {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  margin-top: 12px;
}

.otp-resend-btn {
  border: none;
  background: transparent;
  color: #0ea5e9;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
  font-size: 13px;
}

.otp-resend-btn:hover:not(:disabled) {
  color: #0284c7;
}

.otp-resend-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ─── Mobile ─── */
@media (max-width: 900px) {
  .auth-page {
    flex-direction: column;
  }

  .auth-image-panel {
    min-height: 290px;
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
    min-height: 240px;
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
