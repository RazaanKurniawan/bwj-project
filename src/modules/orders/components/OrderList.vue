<script setup lang="ts">
import { RouterLink } from "vue-router";
import OrderStatusBadge from "./OrderStatusBadge.vue";
import type { Order } from "../types";

defineProps<{
  orders: Order[];
  emptyText?: string;
  title?: string;
}>();

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};
</script>

<template>
  <section class="card">
    <header class="card-header">
      <h2>{{ title ?? "Daftar Pesanan" }}</h2>
      <p>Update status pesanan secara real-time.</p>
    </header>

    <div v-if="orders.length === 0" class="empty">
      {{ emptyText ?? "Belum ada pesanan." }}
    </div>

    <ul v-else class="order-list">
      <li v-for="order in orders" :key="order.id" class="order-item">
        <div class="order-main">
          <div>
            <h3>{{ order.customer_name }}</h3>
            <p>{{ order.address }}</p>
          </div>
          <OrderStatusBadge :status="order.status" />
        </div>
        <div class="order-meta">
          <span>Jadwal: {{ formatDate(order.schedule_at) }}</span>
          <span>Volume: {{ order.volume }}</span>
          <RouterLink class="link" :to="`/orders/${order.id}`">Detail</RouterLink>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
}

.card-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.empty {
  padding: 20px 0;
  color: #64748b;
}

.order-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 12px;
}

.order-item {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #f8fafc;
  display: grid;
  gap: 10px;
}

.order-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.order-main h3 {
  margin: 0;
  font-size: 16px;
}

.order-main p {
  margin: 6px 0 0;
  color: #475569;
}

.order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
}

.link {
  color: #1d4ed8;
  font-weight: 600;
  text-decoration: none;
}
</style>
