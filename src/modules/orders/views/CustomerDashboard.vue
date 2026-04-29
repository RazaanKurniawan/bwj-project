<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import OrderForm from "../components/OrderForm.vue";
import OrderList from "../components/OrderList.vue";
import type { Order } from "../types";
import { fetchCustomerOrders } from "../services/orderService";
import { useAuthStore } from "../../auth/stores/authStore";

const authStore = useAuthStore();
const orders = ref<Order[]>([]);
const loading = ref(true);
const errorMsg = ref("");

const userId = computed(() => authStore.user.value?.id ?? null);
const customerName = computed(() => authStore.profile.value?.name ?? null);
const customerPhone = computed(() => authStore.profile.value?.phone ?? null);

const loadOrders = async () => {
  const uid = userId.value;
  if (!uid) {
    return;
  }

  loading.value = true;
  errorMsg.value = "";

  try {
    orders.value = await fetchCustomerOrders(uid);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengambil pesanan.";
  } finally {
    loading.value = false;
  }
};

const handleCreated = (order: Order) => {
  orders.value = [order, ...orders.value];
};

onMounted(async () => {
  await authStore.initAuth();
  await loadOrders();
});
</script>

<template>
  <div class="dashboard">
    <OrderForm
      v-if="userId"
      :customer-id="userId"
      :customer-name="customerName"
      :customer-phone="customerPhone"
      @created="handleCreated"
    />

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat pesanan...</p>

    <OrderList v-else :orders="orders" />
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 20px;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}
</style>
