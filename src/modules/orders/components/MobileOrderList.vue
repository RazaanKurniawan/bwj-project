<script setup lang="ts">
import { RouterLink } from "vue-router";
import OrderStatusBadge from "./OrderStatusBadge.vue";
import type { Order } from "../types";

defineProps<{
  orders: Order[];
  emptyText?: string;
}>();

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
};
</script>

<template>
  <div class="mobile-order-list">
    <div v-if="orders.length === 0" class="empty">
      {{ emptyText ?? "Belum ada pesanan." }}
    </div>
    
    <div v-else class="mobile-cards">
      <div v-for="order in orders" :key="order.id" class="mobile-card">
        <div class="card-header">
          <div class="customer-info">
            <span class="label">Pelanggan</span>
            <span class="value">{{ order.customer_name }}</span>
          </div>
          <OrderStatusBadge :status="order.status" />
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="label">Alamat</span>
            <span class="value address" :title="order.address">{{ order.address }}</span>
          </div>
          <div class="info-grid">
            <div class="info-col">
              <span class="label">Volume</span>
              <span class="value">{{ order.volume }}</span>
            </div>
            <div class="info-col">
              <span class="label">Jadwal</span>
              <span class="value date">{{ formatDate(order.schedule_at) }}</span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <RouterLink class="btn-detail-mobile" :to="`/orders/${order.id}`">
            Lihat Detail Pesanan
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-order-list {
  margin-top: 16px;
}

.empty {
  padding: 20px 0;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.mobile-cards {
  display: grid;
  gap: 16px;
}

.mobile-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mobile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 10px;
}

.label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.value.address {
  font-weight: 500;
  color: #475569;
}

.info-row {
  margin-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.value.date {
  font-size: 13px;
  color: #475569;
}

.card-footer {
  margin-top: 4px;
}

.btn-detail-mobile {
  display: block;
  text-align: center;
  color: #2563eb;
  background: #f0f7ff;
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  padding: 10px;
  border-radius: 10px;
  transition: background 0.2s;
}

.btn-detail-mobile:hover {
  background: #e0f2fe;
  color: #1d4ed8;
}
</style>
