<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Order } from "../types";
import { fetchAllOrders } from "../services/orderService";
import AdminAnalytics from "../components/AdminAnalytics.vue";

const orders = ref<Order[]>([]);
const loading = ref(true);

const loadData = async () => {
  loading.value = true;
  try {
    orders.value = await fetchAllOrders();
  } catch (e) {
    console.error("Failed to load orders:", e);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
</script>

<template>
  <div class="dashboard">
    <header class="section-header">
      <div>
        <h2>Dashboard Admin</h2>
        <p>Pantau statistik dan laporan pengiriman.</p>
      </div>
    </header>

    <p v-if="loading" class="info">Memuat data admin...</p>

    <template v-if="!loading">
      <AdminAnalytics :orders="orders" />
    </template>
  </div>
</template>

<style scoped>
.dashboard { display: grid; gap: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.section-header h2 { margin: 0; font-size: 22px; }
.section-header p { margin: 6px 0 0; color: #64748b; }
.info { color: #64748b; }

@media (max-width: 768px) {
  .dashboard { gap: 14px; }
  .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .section-header h2 { font-size: 20px; }
}
</style>
