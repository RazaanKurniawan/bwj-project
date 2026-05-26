<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { signInWithEmail, signUpWithEmail } from "../services/authService";
import { useAuthStore } from "../stores/authStore";
import type { UserRole } from "../types";

const mode = ref<"login" | "signup">("login");
const email = ref("");
const password = ref("");
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

const switchMode = (nextMode: "login" | "signup") => {
  mode.value = nextMode;
  errorMsg.value = "";
  infoMsg.value = "";
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

const handleSubmit = async () => {
  if (mode.value === "login") {
    await handleLogin();
    return;
  }

  await handleSignup();
};
</script>

<template>
  <section class="auth-shell">
    <div class="card">
      <header class="card-header">
        <h1>{{ mode === "login" ? "Login" : "Daftar Akun" }}</h1>
        <p>Kelola pesanan depot air dengan cepat.</p>
      </header>

      <form class="form" @submit.prevent="handleSubmit">
        <div v-if="mode === 'signup'" class="field-grid">
          <label class="field">
            <span>Nama</span>
            <input v-model="name" type="text" placeholder="Nama lengkap" />
          </label>
          <label class="field">
            <span>No HP</span>
            <input v-model="phone" type="tel" placeholder="08xxxxxxxxxx" />
          </label>
        </div>

        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" placeholder="email@contoh.com" required />
        </label>
        <label class="field">
          <span>Password</span>
          <input v-model="password" type="password" placeholder="Minimal 6 karakter" required />
        </label>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <p v-if="infoMsg" class="info">{{ infoMsg }}</p>

        <button class="btn-primary" type="submit" :disabled="loading">
          {{ loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar" }}
        </button>
      </form>

      <footer class="card-footer">
        <span v-if="mode === 'login'">Belum punya akun?</span>
        <span v-else>Sudah punya akun?</span>
        <button class="btn-link" type="button" @click="switchMode(mode === 'login' ? 'signup' : 'login')">
          {{ mode === "login" ? "Daftar" : "Login" }}
        </button>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.auth-shell {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.card {
  width: min(480px, 100%);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.card-header h1 {
  margin: 0;
  font-size: 24px;
}

.card-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.field input,
.field select {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.error {
  color: #dc2626;
  margin: 0;
}

.info {
  color: #0f766e;
  margin: 0;
}

.btn-primary {
  border: none;
  border-radius: 10px;
  background: #0f172a;
  color: #fff;
  padding: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 14px;
  color: #475569;
}

.btn-link {
  border: none;
  background: transparent;
  color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
</style>
