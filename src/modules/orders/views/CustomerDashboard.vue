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
const selectedStatus = ref("all");

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
    orders.value = await fetchCustomerOrders(uid, selectedStatus.value);
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
      
      <div class="filter-wrapper">
        <label for="status-filter">Filter Status:</label>
        <select id="status-filter" v-model="selectedStatus" @change="loadOrders">
          <option value="all">Semua Status</option>
          <option value="menunggu">Menunggu</option>
          <option value="diproses">Diproses</option>
          <option value="dikirim">Dikirim</option>
          <option value="selesai">Selesai</option>
          <option value="batal">Batal</option>
        </select>
      </div>

      <OrderList :orders="orders" />
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 20px;
}

.filter-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  background: #fff;
  padding: 12px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.filter-wrapper label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.filter-wrapper select {
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  outline: none;
  background: #fff;
  cursor: pointer;
  min-width: 140px;
  transition: border-color 0.2s;
}

.filter-wrapper select:focus {
  border-color: #0f172a;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}
</style>
