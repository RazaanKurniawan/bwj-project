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
const showWarningModal = ref(false);

const showConfirmModal = ref(false);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmAction = ref<(() => void) | (() => Promise<void>) | null>(null);

const triggerConfirmation = (title: string, message: string, action: () => void | Promise<void>) => {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  showConfirmModal.value = true;
};

const handleConfirm = async () => {
  if (confirmAction.value) {
    await confirmAction.value();
  }
  showConfirmModal.value = false;
  confirmAction.value = null;
};

const statusOptions: OrderStatus[] = ["menunggu", "diproses", "dikirim", "selesai", "batal"];

const hasActiveOrder = computed(() => {
  return assignedOrders.value.some(o => o.status !== "selesai" && o.status !== "batal");
});

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
};

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

const handleClaim = (orderId: string) => {
  if (hasActiveOrder.value) {
    showWarningModal.value = true;
    return;
  }

  const user = authStore.user.value;
  if (!user) {
    return;
  }

  triggerConfirmation(
    "Konfirmasi Ambil Pesanan",
    "Apakah kamu yakin ingin mengambil pesanan ini dan memproses pengirimannya?",
    async () => {
      try {
        await claimOrder(orderId, user.id);
        await refresh();
      } catch (error) {
        errorMsg.value = error instanceof Error ? error.message : "Gagal mengambil pesanan.";
      }
    }
  );
};

const handleUpdateStatus = (orderId: string) => {
  const status = statusUpdates[orderId] ?? "dikirim";

  triggerConfirmation(
    "Konfirmasi Perbarui Status",
    `Apakah kamu yakin ingin memperbarui status pesanan menjadi "${status}"?`,
    async () => {
      try {
        await updateOrderStatus(orderId, status);
        await refresh();
      } catch (error) {
        errorMsg.value = error instanceof Error ? error.message : "Gagal update status.";
      }
    }
  );
};

const handleSendLocation = (orderId: string) => {
  triggerConfirmation(
    "Konfirmasi Kirim Lokasi",
    "Apakah kamu yakin ingin membagikan lokasi GPS saat ini secara real-time?",
    () => {
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
    }
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

    <!-- ====== PESANAN KAMU (Table) ====== -->
    <section class="card">
      <header class="card-header">
        <h3>Pesanan Kamu</h3>
        <p>Pesanan yang sedang kamu tangani.</p>
      </header>

      <div v-if="assignedOrders.length === 0" class="empty">Belum ada pesanan aktif.</div>

      <template v-else>
        <!-- Desktop Table -->
        <div class="table-responsive desktop-only">
          <table class="order-table">
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Alamat</th>
                <th>Volume</th>
                <th>Jadwal</th>
                <th>Status</th>
                <th>Ubah Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in assignedOrders" :key="order.id">
                <td class="cell-bold">{{ order.customer_name }}</td>
                <td class="cell-muted" :title="order.address">{{ order.address }}</td>
                <td>{{ order.volume }}</td>
                <td class="cell-date">{{ formatDate(order.schedule_at) }}</td>
                <td>
                  <OrderStatusBadge :status="order.status" />
                </td>
                <td>
                  <select v-model="statusUpdates[order.id]" class="table-select">
                    <option v-for="status in statusOptions" :key="status" :value="status">
                      {{ status }}
                    </option>
                  </select>
                </td>
                <td class="cell-actions">
                  <button class="btn-secondary" @click="handleUpdateStatus(order.id)">
                    Update
                  </button>
                  <button class="btn-outline" @click="handleSendLocation(order.id)">
                    Kirim Lokasi
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="mobile-only">
          <div class="mobile-cards">
            <div v-for="order in assignedOrders" :key="order.id" class="mobile-card">
              <div class="mc-header">
                <div class="customer-info">
                  <span class="label">Pelanggan</span>
                  <span class="value">{{ order.customer_name }}</span>
                </div>
                <OrderStatusBadge :status="order.status" />
              </div>
              <div class="mc-body">
                <div class="info-row">
                  <span class="label">Alamat</span>
                  <span class="value address">{{ order.address }}</span>
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
              <div class="mc-footer">
                <select v-model="statusUpdates[order.id]" class="table-select">
                  <option v-for="status in statusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
                <div class="mc-actions">
                  <button class="btn-secondary" @click="handleUpdateStatus(order.id)">
                    Update
                  </button>
                  <button class="btn-outline" @click="handleSendLocation(order.id)">
                    Kirim Lokasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- ====== PESANAN MENUNGGU (Table) ====== -->
    <section class="card" v-if="availableOrders.length">
      <header class="card-header">
        <h3>Pesanan Menunggu</h3>
        <p>Pesanan yang belum diambil supir.</p>
      </header>

      <p v-if="hasActiveOrder" class="warning-text">
        Selesaikan pesanan aktif kamu sebelum mengambil pesanan baru.
      </p>

      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table class="order-table">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Alamat</th>
              <th>Volume</th>
              <th>Jadwal</th>
              <th>Catatan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in availableOrders" :key="order.id">
              <td class="cell-bold">{{ order.customer_name }}</td>
              <td class="cell-muted" :title="order.address">{{ order.address }}</td>
              <td>{{ order.volume }}</td>
              <td class="cell-date">{{ formatDate(order.schedule_at) }}</td>
              <td class="cell-muted">{{ order.notes ?? '-' }}</td>
              <td>
                <OrderStatusBadge :status="order.status" />
              </td>
              <td class="cell-actions">
                <router-link :to="{ name: 'order-detail', params: { id: order.id } }" class="btn-detail">
                  Detail
                </router-link>
                <button
                  class="btn-primary"
                  :class="{ 'btn-disabled': hasActiveOrder }"
                  @click="handleClaim(order.id)"
                >
                  Ambil
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-only">
        <div class="mobile-cards">
          <div v-for="order in availableOrders" :key="order.id" class="mobile-card">
            <div class="mc-header">
              <div class="customer-info">
                <span class="label">Pelanggan</span>
                <span class="value">{{ order.customer_name }}</span>
              </div>
              <OrderStatusBadge :status="order.status" />
            </div>
            <div class="mc-body">
              <div class="info-row">
                <span class="label">Alamat</span>
                <span class="value address">{{ order.address }}</span>
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
              <div v-if="order.notes" class="info-row" style="margin-top: 8px;">
                <span class="label">Catatan</span>
                <span class="value address">{{ order.notes }}</span>
              </div>
            </div>
            <div class="mc-footer">
              <div class="mc-actions">
                <router-link :to="{ name: 'order-detail', params: { id: order.id } }" class="btn-detail-mobile">
                  Lihat Detail
                </router-link>
                <button
                  class="btn-primary"
                  :class="{ 'btn-disabled': hasActiveOrder }"
                  @click="handleClaim(order.id)"
                >
                  Ambil Pesanan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Custom Warning Modal -->
    <div v-if="showWarningModal" class="modal-backdrop" @click.self="showWarningModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <div class="warning-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h3>Gagal Mengambil Pesanan</h3>
        </div>
        <div class="modal-body">
          <p>Kamu masih memiliki pesanan aktif yang belum selesai. Selesaikan pesanan aktif kamu terlebih dahulu di bagian <strong>Pesanan Kamu</strong> sebelum mengambil pesanan baru.</p>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" @click="showWarningModal = false">Mengerti</button>
        </div>
      </div>
    </div>

    <!-- Reusable Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-backdrop" @click.self="showConfirmModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <div class="info-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <h3>{{ confirmTitle }}</h3>
        </div>
        <div class="modal-body">
          <p>{{ confirmMessage }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" @click="showConfirmModal = false">Batal</button>
          <button class="btn-primary" @click="handleConfirm">Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
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
  padding: 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.card-header h3 {
  margin: 0;
  font-size: 20px;
}

.card-header p {
  margin: 6px 0 0;
  color: #64748b;
}

/* ========= TABLE STYLES (matches OrderList.vue) ========= */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-top: 16px;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.order-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.order-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;
  vertical-align: middle;
}

.order-table tr:last-child td {
  border-bottom: none;
}

.order-table tr:hover td {
  background: #f8fafc;
}

.cell-bold {
  font-weight: 600;
  color: #0f172a;
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
  white-space: nowrap;
}

.cell-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}

.table-select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 13px;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.table-select:focus {
  border-color: #0f172a;
}

/* ========= BUTTONS ========= */
.btn-primary,
.btn-secondary,
.btn-outline {
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 13px;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #0f172a;
  color: #fff;
}

.btn-primary:hover {
  background: #1e293b;
}

.btn-secondary {
  background: #1d4ed8;
  color: #fff;
}

.btn-secondary:hover {
  background: #1e40af;
}

.btn-outline {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
}

.btn-outline:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.btn-detail {
  display: inline-block;
  color: #1d4ed8;
  font-weight: 600;
  text-decoration: none;
  background: #eff6ff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.btn-detail:hover {
  background: #dbeafe;
  color: #1e40af;
}

.btn-primary.btn-disabled {
  background: #64748b;
  opacity: 0.85;
  cursor: not-allowed;
}

/* ========= MOBILE CARD STYLES ========= */
.mobile-cards {
  display: grid;
  gap: 16px;
  margin-top: 16px;
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

.mc-header {
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

.value.date {
  font-size: 13px;
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

.mc-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 10px;
}

.mc-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-detail-mobile {
  display: inline-block;
  text-align: center;
  color: #2563eb;
  background: #f0f7ff;
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-detail-mobile:hover {
  background: #e0f2fe;
  color: #1d4ed8;
}

/* ========= RESPONSIVE HELPERS ========= */
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

/* ========= MISC ========= */
.empty {
  color: #64748b;
  padding: 20px 0;
}

.warning-text {
  color: #d97706;
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 0;
  font-weight: 500;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}

/* ========= MODALS ========= */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: min(440px, 90%);
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
  font-weight: 700;
}

.warning-icon-wrapper {
  background: #fef3c7;
  color: #d97706;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon-wrapper {
  background: #dbeafe;
  color: #2563eb;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-body p {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(12px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
</style>
