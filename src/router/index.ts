import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../modules/auth/stores/authStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/customer",
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../modules/auth/views/AuthView.vue"),
      meta: { public: true },
    },
    {
      path: "/update-password",
      name: "update-password",
      component: () => import("../modules/auth/views/UpdatePasswordView.vue"),
      meta: { public: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("../modules/auth/views/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/customer",
      name: "customer",
      component: () => import("../modules/orders/views/CustomerDashboard.vue"),
      meta: { requiresAuth: true, role: ["customer", "admin"] },
    },
    {
      path: "/customer/rewards",
      name: "customer-rewards",
      component: () => import("../modules/orders/views/CustomerRewardsView.vue"),
      meta: { requiresAuth: true, role: ["customer", "admin"] },
    },
    {
      path: "/driver",
      name: "driver",
      component: () => import("../modules/orders/views/DriverDashboard.vue"),
      meta: { requiresAuth: true, role: ["driver", "admin"] },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("../modules/orders/views/AdminDashboard.vue"),
      meta: { requiresAuth: true, role: ["admin"] },
    },
    {
      path: "/admin/users",
      name: "admin-users",
      component: () => import("../modules/auth/views/AdminUsersView.vue"),
      meta: { requiresAuth: true, role: ["admin"] },
    },
    {
      path: "/admin/orders",
      name: "admin-orders",
      component: () => import("../modules/orders/views/AdminOrdersView.vue"),
      meta: { requiresAuth: true, role: ["admin"] },
    },
    {
      path: "/admin/tracking",
      name: "admin-tracking",
      component: () => import("../modules/tracking/views/AdminTrackingView.vue"),
      meta: { requiresAuth: true, role: ["admin"] },
    },
    {
      path: "/admin/rewards",
      name: "admin-rewards",
      component: () => import("../modules/orders/views/AdminRewardsView.vue"),
      meta: { requiresAuth: true, role: ["admin"] },
    },
    {
      path: "/admin/approval",
      name: "admin-approval",
      component: () => import("../modules/orders/views/AdminApprovalView.vue"),
      meta: { requiresAuth: true, role: ["admin"] },
    },
    {
      path: "/orders/:id",
      name: "order-detail",
      component: () => import("../modules/orders/views/OrderDetailView.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.initAuth();

  if (to.hash.includes("type=recovery") && to.path !== "/update-password") {
    return { path: "/update-password", hash: to.hash };
  }

  if (to.meta.public) {
    return true;
  }

  if (!authStore.user.value) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  const allowedRoles = to.meta.role as string[] | undefined;
  const role = authStore.profile.value?.role ?? "customer";

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "driver") {
      return { path: "/driver" };
    }
    if (role === "admin") {
      return { path: "/admin" };
    }
    return { path: "/customer" };
  }

  return true;
});

export default router;
