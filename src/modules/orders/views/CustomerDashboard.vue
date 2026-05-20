<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import OrderForm from "../components/OrderForm.vue";
import OrderList from "../components/OrderList.vue";
import MultiOrderMap from "../components/MultiOrderMap.vue";
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

const activeOrders = computed(() => {
  return orders.value.filter(o => o.status === 'diproses' || o.status === 'dikirim');
});

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

const handleCreated = (newOrders: Order[]) => {
  orders.value = [...newOrders, ...orders.value];
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

    <template v-else>
      <MultiOrderMap v-if="activeOrders.length > 0" :orders="activeOrders" />
      <OrderList :orders="orders" />
    </template>
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
