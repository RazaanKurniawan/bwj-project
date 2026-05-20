<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { Order, OrderStatus } from "../types";
import {
  claimOrder,
  fetchAvailableOrders,
  fetchDriverOrders,
  updateOrderLocation,
  updateOrderStatus,
} from "../services/orderService";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import { useAuthStore } from "../../auth/stores/authStore";

const authStore = useAuthStore();
const assignedOrders = ref<Order[]>([]);
const availableOrders = ref<Order[]>([]);
const statusUpdates = reactive<Record<string, OrderStatus>>({});
const loading = ref(true);
const errorMsg = ref("");

const statusOptions: OrderStatus[] = ["menunggu", "diproses", "dikirim", "selesai", "batal"];

const hasActiveOrder = computed(() => {
  return assignedOrders.value.some(o => o.status !== "selesai" && o.status !== "batal");
});

const refresh = async () => {
  const user = authStore.user.value;
  if (!user) {
    return;
  }

  loading.value = true;
  errorMsg.value = "";

  try {
    const [assigned, available] = await Promise.all([
      fetchDriverOrders(user.id),
      fetchAvailableOrders(),
    ]);

    assignedOrders.value = assigned;
    availableOrders.value = available;
    assigned.forEach((order) => {
      statusUpdates[order.id] = order.status;
    });
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal memuat data.";
  } finally {
    loading.value = false;
  }
};

const handleClaim = async (orderId: string) => {
  if (hasActiveOrder.value) {
    errorMsg.value = "Selesaikan pesanan saat ini sebelum mengambil pesanan baru.";
    return;
  }

  const user = authStore.user.value;
  if (!user) {
    return;
  }

  try {
    await claimOrder(orderId, user.id);
    await refresh();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengambil pesanan.";
  }
};

const handleUpdateStatus = async (orderId: string) => {
  const status = statusUpdates[orderId] ?? "dikirim";

  try {
    await updateOrderStatus(orderId, status);
    await refresh();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal update status.";
  }
};

const handleSendLocation = async (orderId: string) => {
  if (!("geolocation" in navigator)) {
    errorMsg.value = "Browser ini tidak mendukung geolocation.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await updateOrderLocation(
          orderId,
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy ?? null
        );
        await refresh();
      } catch (error) {
        errorMsg.value = error instanceof Error ? error.message : "Gagal update lokasi.";
      }
    },
    (error) => {
      errorMsg.value = error.message;
    },
    { enableHighAccuracy: true, maximumAge: 0 }
  );
};

onMounted(async () => {
  await authStore.initAuth();
  await refresh();
});
</script>

<template>
  <div class="dashboard">
    <header class="section-header">
      <div>
        <h2>Dashboard Supir</h2>
        <p>Ambil pesanan dan kirim lokasi real-time.</p>
      </div>
    </header>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat data supir...</p>

    <section class="card" v-if="availableOrders.length">
      <h3>Pesanan Menunggu</h3>
      <p v-if="hasActiveOrder" class="warning-text">Selesaikan pesanan aktif kamu sebelum mengambil pesanan baru.</p>
      <ul class="order-list">
        <li v-for="order in availableOrders" :key="order.id" class="order-item available-order">
          <div class="available-order-header">
            <div>
              <strong>{{ order.customer_name }}</strong>
              <p class="address">{{ order.address }}</p>
            </div>
            <OrderStatusBadge :status="order.status" />
          </div>
          <div class="available-order-details">
            <div class="detail-item">
              <span class="detail-label">No HP</span>
              <span class="detail-value">{{ order.phone }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Volume</span>
              <span class="detail-value">{{ order.volume }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Jadwal</span>
              <span class="detail-value">{{ order.schedule_at ? new Date(order.schedule_at).toLocaleString() : '-' }}</span>
            </div>
            <div v-if="order.notes" class="detail-item detail-notes">
              <span class="detail-label">Catatan</span>
              <span class="detail-value">{{ order.notes }}</span>
            </div>
          </div>
          <div class="available-order-actions">
            <router-link :to="{ name: 'order-detail', params: { id: order.id } }" class="btn-outline">
              Lihat Detail
            </router-link>
            <button class="btn-primary" @click="handleClaim(order.id)" :disabled="hasActiveOrder" :title="hasActiveOrder ? 'Selesaikan pesanan aktif terlebih dahulu' : ''">
              Ambil Pesanan
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="card">
      <h3>Pesanan Kamu</h3>
      <div v-if="assignedOrders.length === 0" class="empty">Belum ada pesanan aktif.</div>
      <ul v-else class="order-list">
        <li v-for="order in assignedOrders" :key="order.id" class="order-item">
          <div class="order-detail">
            <div>
              <strong>{{ order.customer_name }}</strong>
              <p>{{ order.address }}</p>
            </div>
            <OrderStatusBadge :status="order.status" />
          </div>
          <div class="order-actions">
            <select v-model="statusUpdates[order.id]">
              <option v-for="status in statusOptions" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
            <button class="btn-secondary" @click="handleUpdateStatus(order.id)">
              Update Status
            </button>
            <button class="btn-outline" @click="handleSendLocation(order.id)">
              Kirim Lokasi
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 22px;
}

.section-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.order-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 12px;
}

.order-item {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.order-item p {
  margin: 6px 0 0;
  color: #475569;
}

.order-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.order-actions select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
}

.btn-primary,
.btn-secondary,
.btn-outline {
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #0f172a;
  color: #fff;
}

.btn-secondary {
  background: #1d4ed8;
  color: #fff;
}

.btn-outline {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
}

.empty {
  color: #64748b;
  padding: 12px 0;
}

.warning-text {
  color: #d97706;
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 12px;
  font-weight: 500;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}

.available-order {
  flex-direction: column;
  align-items: stretch;
}

.available-order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.available-order-header .address {
  margin: 4px 0 0;
  color: #475569;
}

.available-order-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  padding: 12px 0;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  margin-top: 10px;
}

.detail-notes {
  grid-column: 1 / -1;
}

.detail-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.detail-value {
  display: block;
  margin-top: 4px;
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.available-order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
</style>
