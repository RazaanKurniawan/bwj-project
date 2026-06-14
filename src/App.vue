<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRouter, useRoute } from "vue-router";
import { signOut } from "./modules/auth/services/authService";
import { useAuthStore } from "./modules/auth/stores/authStore";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const isLoggedIn = computed(() => Boolean(authStore.user.value));
const userRole = computed(() => authStore.profile.value?.role ?? "customer");
const isCustomer = computed(() => userRole.value === "customer" || userRole.value === "admin");
const isDriver = computed(() => userRole.value === "driver" || userRole.value === "admin");
const isAdmin = computed(() => userRole.value === "admin");
const displayName = computed(() => {
  return authStore.profile.value?.name ?? authStore.user.value?.email ?? "Guest";
});

// Sidebar state
const sidebarOpen = ref(false);

const windowWidth = ref(window.innerWidth);
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};
const isDesktop = computed(() => windowWidth.value > 768);

const topbarDropdownOpen = ref(false);
const closeDropdown = () => {
  topbarDropdownOpen.value = false;
};

const handleMouseEnter = () => {
  if (isDesktop.value) sidebarOpen.value = true;
};
const handleMouseLeave = () => {
  if (isDesktop.value) sidebarOpen.value = false;
};

// Detect if current route is the auth/login page
const isAuthPage = computed(() => route.path === "/login");

const handleLogout = async () => {
  sidebarOpen.value = false;
  await signOut();
  authStore.clearSession();
  await router.replace("/login");
};

// Redirect to login when session expires (detected by Supabase auth listener)
authStore.onSessionExpired(() => {
  const currentPath = router.currentRoute.value.fullPath;
  if (currentPath !== "/login") {
    router.replace({ path: "/login", query: { redirect: currentPath } });
  }
});

// Also watch for user becoming null (e.g. session expired mid-use)
watch(
  () => authStore.user.value,
  (newUser, oldUser) => {
    if (oldUser && !newUser) {
      const currentPath = router.currentRoute.value.fullPath;
      if (currentPath !== "/login") {
        router.replace({ path: "/login", query: { redirect: currentPath } });
      }
    }
  }
);

// Close sidebar on route change
watch(() => route.path, () => {
  sidebarOpen.value = false;
});

// Sidebar nav items based on role
const sidebarNavItems = computed(() => {
  const items: Array<{ label: string; to: string; icon: string }> = [];

  if (isAdmin.value) {
    items.push({ label: "Pesanan", to: "/admin/orders", icon: "order" });
    items.push({ label: "Persetujuan", to: "/admin/approval", icon: "approval" });
    items.push({ label: "Lacak Supir", to: "/admin/tracking", icon: "tracking" });
    items.push({ label: "Dashboard", to: "/admin", icon: "admin" });
    items.push({ label: "Hadiah", to: "/admin/rewards", icon: "reward" });
    items.push({ label: "Users", to: "/admin/users", icon: "users" });
  } else {
    if (isCustomer.value) {
      items.push({ label: "Pesanan", to: "/customer", icon: "order" });
      items.push({ label: "Buat Pesanan", to: "/customer?tab=create", icon: "plus" });
      items.push({ label: "Hadiah", to: "/customer/rewards", icon: "reward" });
    }
    if (isDriver.value) {
      items.push({ label: "Supir", to: "/driver", icon: "driver" });
    }
  }

  return items;
});

const isActiveRoute = (path: string) => {
  if (path === '/admin') {
    return route.path === path;
  }
  if (path === '/customer') {
    return route.path === path && route.query.tab !== 'create';
  }
  if (path === '/customer?tab=create') {
    return route.path === '/customer' && route.query.tab === 'create';
  }
  return route.path === path || route.path.startsWith(path + '/');
};

onMounted(() => {
  void authStore.initAuth();
  window.addEventListener('resize', handleResize);
  document.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', closeDropdown);
});
</script>

<template>
  <div class="app-shell" :class="{ 'no-sidebar': isAuthPage }">
    <!-- Sidebar overlay (mobile) -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen && isLoggedIn && !isAuthPage"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      ></div>
    </Transition>

    <!-- Sidebar -->
    <aside
      v-if="isLoggedIn && !isAuthPage"
      class="sidebar"
      :class="{ open: sidebarOpen }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <!-- Sidebar header / brand -->
      <div class="sidebar-header">
        <div class="sidebar-brand" @click="!sidebarOpen && (sidebarOpen = true)" :style="!sidebarOpen ? 'cursor:pointer' : ''">
          <img src="/logobwj.jpeg" alt="BWJ" class="brand-mark-img" />
          <Transition name="fade-text">
            <div v-if="sidebarOpen" class="brand-info">
              <h1>Tracking Air</h1>
              <p>Live update supir &amp; pelanggan</p>
            </div>
          </Transition>
        </div>
        <button
          v-if="sidebarOpen"
          class="sidebar-toggle"
          type="button"
          @click="sidebarOpen = false"
          aria-label="Close sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <!-- Navigation links -->
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in sidebarNavItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-nav-item"
          :class="{ active: isActiveRoute(item.to) }"
          :title="item.label"
        >
          <div class="sidebar-nav-icon">
            <!-- Order icon -->
            <svg v-if="item.icon === 'order'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <!-- Driver icon -->
            <svg v-if="item.icon === 'driver'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <!-- Admin icon -->
            <svg v-if="item.icon === 'admin'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            <!-- Users icon -->
            <svg v-if="item.icon === 'users'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <!-- Tracking icon -->
            <svg v-if="item.icon === 'tracking'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
            </svg>
            <!-- Reward icon -->
            <svg v-if="item.icon === 'reward'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
            <!-- Plus icon -->
            <svg v-if="item.icon === 'plus'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <!-- Approval icon -->
            <svg v-if="item.icon === 'approval'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <Transition name="fade-text">
            <span v-if="sidebarOpen" class="sidebar-nav-label">{{ item.label }}</span>
          </Transition>
        </RouterLink>
      </nav>

      <!-- Sidebar footer: user + logout -->
      <div class="sidebar-footer">
        <RouterLink to="/profile" class="sidebar-user" :title="displayName">
          <div class="sidebar-avatar">{{ displayName.charAt(0).toUpperCase() }}</div>
          <Transition name="fade-text">
            <div v-if="sidebarOpen" class="sidebar-user-info">
              <span class="sidebar-user-name">{{ displayName }}</span>
              <span class="sidebar-user-role">{{ userRole }}</span>
            </div>
          </Transition>
        </RouterLink>
        <button
          class="sidebar-logout-btn"
          type="button"
          @click="handleLogout"
          title="Logout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <Transition name="fade-text">
            <span v-if="sidebarOpen">Logout</span>
          </Transition>
        </button>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="app-main" :class="{ 'with-sidebar': isLoggedIn && !isAuthPage }">
      <!-- Top bar (only on mobile when logged in, or always when on auth page) -->
      <header v-if="!isAuthPage && isLoggedIn" class="app-topbar mobile-only">
        <div class="topbar-brand">
          <img src="/logobwj.jpeg" alt="BWJ" class="brand-mark-sm-img" />
          <span class="brand-title-sm">Tracking Air</span>
        </div>
        
        <div class="topbar-profile" @click.stop="topbarDropdownOpen = !topbarDropdownOpen">
          <div class="topbar-avatar" :title="displayName">
            {{ displayName.charAt(0).toUpperCase() }}
          </div>
          <Transition name="fade-text">
            <div v-if="topbarDropdownOpen" class="topbar-dropdown" @click.stop>
              <div class="dropdown-header">
                <span class="dropdown-name">{{ displayName }}</span>
                <span class="dropdown-role">{{ userRole }}</span>
              </div>
              <div class="dropdown-divider"></div>
              <RouterLink to="/profile" class="dropdown-item" @click="topbarDropdownOpen = false">
                Profil Saya
              </RouterLink>
              <button class="dropdown-item dropdown-logout" @click="handleLogout">
                Logout
              </button>
            </div>
          </Transition>
        </div>
      </header>

      <main class="app-content" :class="{ 'auth-content': isAuthPage }">
        <RouterView />
      </main>
    </div>

    <!-- Mobile bottom navigation bar -->
    <nav v-if="isLoggedIn && !isAuthPage" class="bottom-nav mobile-only">
      <RouterLink
        v-for="item in sidebarNavItems"
        :key="item.to"
        :to="item.to"
        class="bottom-nav-item"
        :class="{ active: isActiveRoute(item.to) }"
      >
        <div class="bottom-nav-icon">
          <!-- Order icon -->
          <svg v-if="item.icon === 'order'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <!-- Driver icon -->
          <svg v-if="item.icon === 'driver'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <!-- Admin icon -->
          <svg v-if="item.icon === 'admin'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          <!-- Users icon -->
          <svg v-if="item.icon === 'users'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <!-- Tracking icon -->
          <svg v-if="item.icon === 'tracking'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
          </svg>
          <!-- Reward icon -->
          <svg v-if="item.icon === 'reward'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
          <!-- Plus icon -->
          <svg v-if="item.icon === 'plus'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <!-- Approval icon -->
          <svg v-if="item.icon === 'approval'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
        <span class="bottom-nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
/* ─── Variables ─── */
:root {
  --sidebar-width-collapsed: 72px;
  --sidebar-width-expanded: 260px;
  --sidebar-icon-size: 22px;
  --sidebar-item-height: 48px;
}

.app-shell {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
  color: #0f172a;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  overflow-x: hidden;
}

.app-shell.no-sidebar {
  display: block;
}

/* ─── Sidebar ─── */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 72px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 4px 0 24px rgba(15, 23, 42, 0.18);
}

.sidebar.open {
  width: 260px;
}

/* ─── Sidebar Header ─── */
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  min-height: 72px;
  box-sizing: border-box;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.brand-mark-img {
  min-width: 40px;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(56, 189, 248, 0.3);
}

.brand-info {
  white-space: nowrap;
  overflow: hidden;
}

.brand-info h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}

.brand-info p {
  margin: 2px 0 0;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.3;
}

/* ─── Sidebar Toggle Button ─── */
.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  margin-left: auto;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}

/* ─── Sidebar Nav ─── */
.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: #94a3b8;
  font-weight: 600;
  font-size: 15px;
  min-height: var(--sidebar-item-height);
  padding: 10px 18px;
  margin: 0 12px;
  border-radius: 12px;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  box-sizing: border-box;
}

.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

.sidebar-nav-item.active {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.sidebar-nav-item.active::before {
  content: "";
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #38bdf8;
  border-radius: 0 3px 3px 0;
}

.sidebar-nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--sidebar-icon-size);
  min-width: var(--sidebar-icon-size);
  height: var(--sidebar-icon-size);
  flex-shrink: 0;
}

.sidebar-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Tooltip on collapsed sidebar ─── */
.sidebar:not(.open) .sidebar-nav-item {
  justify-content: center;
  padding: 10px 0;
  margin: 0 12px;
  min-height: var(--sidebar-item-height);
}

.sidebar:not(.open) .sidebar-nav-item::after {
  content: attr(title);
  position: absolute;
  left: calc(100% + 16px);
  top: 50%;
  transform: translateY(-50%);
  background: #1e293b;
  color: #f1f5f9;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  z-index: 200;
}

.sidebar:not(.open) .sidebar-nav-item:hover::after {
  opacity: 1;
}

/* Collapsed sidebar footer centering */
.sidebar:not(.open) .sidebar-footer {
  align-items: center;
  padding: 14px 12px;
}

.sidebar:not(.open) .sidebar-user {
  justify-content: center;
  padding: 6px 0;
}

.sidebar:not(.open) .sidebar-logout-btn {
  justify-content: center;
  padding: 10px 0;
  width: 48px;
  min-height: var(--sidebar-item-height);
}

/* ─── Sidebar Footer ─── */
.sidebar-footer {
  padding: 14px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  overflow: hidden;
  border-radius: 10px;
  transition: background 0.2s;
  text-decoration: none;
  cursor: pointer;
}

.sidebar-user:hover {
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-avatar {
  min-width: 36px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #334155, #475569);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}

.sidebar-user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
}

.sidebar-user-name {
  font-weight: 600;
  font-size: 13px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 11px;
  color: #64748b;
  text-transform: capitalize;
}

.sidebar-logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.sidebar-logout-btn:hover {
  background: rgba(239, 68, 68, 0.18);
}

/* ─── Sidebar Overlay (Mobile) ─── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9998;
}

/* ─── Main content ─── */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-main.with-sidebar {
  margin-left: 72px;
}

.app-content {
  flex: 1;
  max-width: 1200px;
  margin: 24px auto 0;
  padding: 0 24px 48px;
  width: 100%;
  box-sizing: border-box;
}

.app-content.auth-content {
  max-width: none;
  margin: 0;
  padding: 0;
}

/* ─── Mobile top bar ─── */
.app-topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 9999;
  min-height: 56px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.topbar-hamburger {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #0f172a;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.topbar-hamburger:hover,
.topbar-hamburger:active {
  background: #f1f5f9;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark-sm-img {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  object-fit: cover;
}

.brand-title-sm {
  font-weight: 700;
  font-size: 17px;
  color: #0f172a;
}

.topbar-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f172a, #334155);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.topbar-profile {
  position: relative;
}

.topbar-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.dropdown-name {
  font-weight: 600;
  font-size: 14px;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-role {
  font-size: 12px;
  color: #64748b;
  text-transform: capitalize;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
}

.dropdown-item {
  padding: 12px 16px;
  font-size: 14px;
  color: #334155;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  background: #fff;
  border: none;
  text-align: left;
  transition: background 0.2s;
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-logout {
  color: #ef4444;
}

.dropdown-logout:hover {
  background: #fef2f2;
}

/* ─── Bottom Navigation (Mobile) ─── */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px)) 12px;
  z-index: 9999;
  box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.08);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 4px;
  border-radius: 12px;
  transition: all 0.2s ease;
  position: relative;
  flex: 1;
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav-item.active {
  color: #0f172a;
}

.bottom-nav-item.active .bottom-nav-icon {
  background: #0f172a;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
}

.bottom-nav-icon {
  width: 44px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bottom-nav-label {
  letter-spacing: 0.02em;
  line-height: 1;
  font-size: 11px;
}

/* ─── Transitions ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-text-enter-active {
  transition: opacity 0.2s ease 0.05s;
}

.fade-text-leave-active {
  transition: opacity 0.1s ease;
}

.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}

/* ─── Visibility helpers ─── */
.desktop-only {
  display: flex;
}

.mobile-only {
  display: none !important;
}

/* ─── Mobile breakpoint ─── */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .app-shell {
    flex-direction: column;
  }

  /* Sidebar becomes completely hidden on mobile */
  .sidebar, .sidebar-overlay {
    display: none !important;
  }

  /* Main content takes full width on mobile */
  .app-main.with-sidebar {
    margin-left: 0;
  }

  .app-topbar {
    display: flex;
  }

  .bottom-nav {
    display: flex;
    justify-content: space-around;
  }

  /* Proper spacing: no top margin (topbar handles it), enough bottom padding for bottom nav */
  .app-content {
    margin-top: 8px;
    padding: 0 16px 90px;
  }
}
</style>