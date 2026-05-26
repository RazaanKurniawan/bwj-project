<script setup lang="ts">
import { RouterLink } from "vue-router";
import OrderStatusBadge from "./OrderStatusBadge.vue";
import MobileOrderList from "./MobileOrderList.vue";
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

    <template v-else>
      <!-- Desktop Table View -->
      <div class="table-responsive desktop-only">
        <table class="order-table">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Alamat</th>
              <th>Volume</th>
              <th>Jadwal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td class="cell-bold">{{ order.customer_name }}</td>
              <td class="cell-muted" :title="order.address">{{ order.address }}</td>
              <td>{{ order.volume }}</td>
              <td class="cell-date">{{ formatDate(order.schedule_at) }}</td>
              <td>
                <OrderStatusBadge :status="order.status" />
              </td>
              <td>
                <RouterLink class="btn-detail" :to="`/orders/${order.id}`">Detail</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile List View -->
      <div class="mobile-only">
        <MobileOrderList :orders="orders" :empty-text="emptyText" />
      </div>
    </template>
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

.table-responsive {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  background: #fff;
  margin-top: 16px;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.order-table th {
  background: #ffffff;
  color: #1e293b;
  font-weight: 700;
  padding: 16px 16px;
  border-bottom: 2px solid #f1f5f9;
  font-size: 13px;
  white-space: nowrap;
}

.order-table td {
  padding: 16px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
  background: #ffffff;
}

.order-table tr:last-child td {
  border-bottom: none;
}

.order-table tr:hover td {
  background: #f8fafc;
}

.cell-bold {
  font-weight: 600;
  color: #4f46e5; /* Indigo color for main identifier */
}

.cell-muted {
  color: #64748b;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-date {
  color: #475569;
  font-size: 13px;
}

.btn-detail {
  display: inline-block;
  color: #1d4ed8;
  font-weight: 600;
  text-decoration: none;
  background: #eff6ff;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.btn-detail:hover {
  background: #dbeafe;
  color: #1e40af;
}

/* Responsiveness helper styles */
.desktop-only {
  display: block;
}

.mobile-only {
  display: none;
}

@media (max-width: 767px) {
  .desktop-only {
    display: none;
  }
  .mobile-only {
    display: block;
  }
}
</style>
