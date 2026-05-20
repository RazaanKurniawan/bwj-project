<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";
import { signOut } from "./modules/auth/services/authService";
import { useAuthStore } from "./modules/auth/stores/authStore";

const authStore = useAuthStore();
const router = useRouter();

const isLoggedIn = computed(() => Boolean(authStore.user.value));
const userRole = computed(() => authStore.profile.value?.role ?? "customer");
const isCustomer = computed(() => userRole.value === "customer" || userRole.value === "admin");
const isDriver = computed(() => userRole.value === "driver" || userRole.value === "admin");
const isAdmin = computed(() => userRole.value === "admin");
const displayName = computed(() => {
  return authStore.profile.value?.name ?? authStore.user.value?.email ?? "Guest";
});

const handleLogout = async () => {
  await signOut();
  await authStore.initAuth();
  await router.replace("/login");
};

onMounted(() => {
  void authStore.initAuth();
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark">BWJ</span>
        <div>
          <h1>Tracking Air</h1>
          <p>Live update supir dan pelanggan.</p>
        </div>
      </div>
      <nav class="nav-links">
        <RouterLink v-if="isCustomer" to="/customer">Customer</RouterLink>
        <RouterLink v-if="isDriver" to="/driver">Supir</RouterLink>
        <RouterLink v-if="isAdmin" to="/admin">Admin</RouterLink>
        <RouterLink v-if="!isLoggedIn" to="/login">Login</RouterLink>
        <button v-else class="btn-ghost" type="button" @click="handleLogout">Logout</button>
      </nav>
      <div class="user-chip">
        {{ displayName }}
      </div>
    </header>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 32px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #0f172a;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.brand h1 {
  margin: 0;
  font-size: 22px;
}

.brand p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}

.nav-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.nav-links a {
  text-decoration: none;
  color: #1e293b;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.nav-links a.router-link-active {
  background: #0f172a;
  color: #fff;
}

.btn-ghost {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
  color: #1e293b;
  font-weight: 600;
  cursor: pointer;
}

.user-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.app-content {
  max-width: 980px;
  margin: 24px auto 0;
  padding: 0 24px 48px;
}
</style>