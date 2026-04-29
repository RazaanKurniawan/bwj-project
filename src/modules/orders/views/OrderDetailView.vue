<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import OrderMap from "../components/OrderMap.vue";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import type { Order } from "../types";
import { fetchOrderById } from "../services/orderService";

const route = useRoute();
const order = ref<Order | null>(null);
const loading = ref(true);
const errorMsg = ref("");

const loadOrder = async () => {
  const orderId = String(route.params.id ?? "");
  if (!orderId) {
    errorMsg.value = "Order tidak ditemukan.";
    loading.value = false;
    return;
  }

  try {
    order.value = await fetchOrderById(orderId);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengambil order.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadOrder);
</script>

<template>
  <div class="detail">
    <p v-if="loading" class="info">Memuat detail pesanan...</p>
    <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>

    <section v-else-if="order" class="card">
      <header class="card-header">
        <div>
          <h2>Pesanan {{ order.customer_name }}</h2>
          <p>{{ order.address }}</p>
        </div>
        <OrderStatusBadge :status="order.status" />
      </header>
      <div class="grid">
        <div>
          <span class="label">No HP</span>
          <span class="value">{{ order.phone }}</span>
        </div>
        <div>
          <span class="label">Volume</span>
          <span class="value">{{ order.volume }}</span>
        </div>
        <div>
          <span class="label">Jadwal</span>
          <span class="value">{{ order.schedule_at ? new Date(order.schedule_at).toLocaleString() : '-' }}</span>
        </div>
        <div>
          <span class="label">Catatan</span>
          <span class="value">{{ order.notes || '-' }}</span>
        </div>
      </div>
    </section>

    <OrderMap v-if="order" :order-id="order.id" />
  </div>
</template>

<style scoped>
.detail {
  display: grid;
  gap: 20px;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
}

.card-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.label {
  display: block;
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.value {
  display: block;
  margin-top: 6px;
  font-weight: 600;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}
</style>
