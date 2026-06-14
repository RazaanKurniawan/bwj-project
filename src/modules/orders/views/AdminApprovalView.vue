<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import type { Order } from "../types";
import { fetchOrdersPaginated, updateOrder } from "../services/orderService";
import { fetchDrivers } from "../../auth/services/profileService";
import type { Profile } from "../../auth/types";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";

const pendingOrders = ref<Order[]>([]);
const drivers = ref<Profile[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const successMsg = ref("");
const processingId = ref<string | null>(null);

const showRejectModal = ref(false);
const rejectTargetId = ref<string | null>(null);

const driverMap = computed(() => {
  const map = new Map<string, string>();
  drivers.value.forEach(d => map.set(d.id, d.name ?? d.id));
  return map;
});

const formatDate = (v: string | null) => v ? new Date(v).toLocaleString() : "-";

const loadData = async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    const drv = await fetchDrivers();
    drivers.value = drv;

    const res = await fetchOrdersPaginated(1, 100, {
      is_pending_approval: true,
    });
    pendingOrders.value = res.data;
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal memuat data.";
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (orderId: string) => {
  processingId.value = orderId;
  errorMsg.value = "";
  try {
    await updateOrder(orderId, { status: "diproses" });
    successMsg.value = "Pesanan berhasil disetujui dan statusnya diubah menjadi DIPROSES.";
    setTimeout(() => (successMsg.value = ""), 4000);
    await loadData();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal menyetujui.";
  } finally {
    processingId.value = null;
  }
};

const openReject = (orderId: string) => {
  rejectTargetId.value = orderId;
  showRejectModal.value = true;
};

const handleReject = async () => {
  if (!rejectTargetId.value) return;
  processingId.value = rejectTargetId.value;
  errorMsg.value = "";
  try {
    await updateOrder(rejectTargetId.value, {
      status: "menunggu",
      assigned_driver_id: null,
    });
    successMsg.value = "Pengambilan pesanan ditolak. Status dikembalikan ke MENUNGGU.";
    setTimeout(() => (successMsg.value = ""), 4000);
    showRejectModal.value = false;
    rejectTargetId.value = null;
    await loadData();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal menolak.";
  } finally {
    processingId.value = null;
  }
};

onMounted(loadData);
</script>

<template>
  <div class="dashboard">
    <header class="section-header">
      <div>
        <h2>Persetujuan Supir</h2>
        <p>Approve atau reject pengambilan pesanan oleh supir.</p>
      </div>
      <div class="pending-count" v-if="pendingOrders.length > 0">
        <span class="count-badge">{{ pendingOrders.length }}</span>
        <span>menunggu persetujuan</span>
      </div>
    </header>

    <p v-if="successMsg" class="success">{{ successMsg }}</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat data...</p>

    <template v-if="!loading">
      <div v-if="pendingOrders.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>Semua Bersih!</h3>
        <p>Tidak ada pengajuan pengambilan pesanan yang menunggu persetujuan saat ini.</p>
      </div>

      <div v-else class="approval-cards">
        <div v-for="order in pendingOrders" :key="order.id" class="approval-card">
          <div class="ac-header">
            <div class="ac-customer">
              <span class="ac-name">{{ order.customer_name }}</span>
              <span class="ac-phone">{{ order.phone }}</span>
            </div>
            <OrderStatusBadge status="menunggu_persetujuan" />
          </div>

          <div class="ac-body">
            <div class="ac-info-grid">
              <div class="ac-info">
                <span class="ac-label">📍 Alamat</span>
                <span class="ac-value">{{ order.address }}</span>
              </div>
              <div class="ac-info">
                <span class="ac-label">🚗 Supir Pengaju</span>
                <span class="ac-value ac-driver">{{ driverMap.get(order.assigned_driver_id ?? '') ?? 'Unknown' }}</span>
              </div>
            </div>
            <div class="ac-info-grid">
              <div class="ac-info">
                <span class="ac-label">📦 Kategori</span>
                <span class="ac-value">{{ order.volume }}</span>
              </div>
              <div class="ac-info">
                <span class="ac-label">📅 Jadwal</span>
                <span class="ac-value">{{ formatDate(order.schedule_at) }}</span>
              </div>
            </div>
            <div v-if="order.notes" class="ac-info">
              <span class="ac-label">📝 Catatan</span>
              <span class="ac-value">{{ order.notes }}</span>
            </div>
          </div>

          <div class="ac-footer">
            <button
              class="btn-approve"
              :disabled="processingId === order.id"
              @click="handleApprove(order.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              {{ processingId === order.id ? 'Memproses...' : 'Setujui' }}
            </button>
            <button
              class="btn-reject"
              :disabled="processingId === order.id"
              @click="openReject(order.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Tolak
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Reject Confirmation Modal -->
    <div v-if="showRejectModal" class="modal-backdrop" @click.self="showRejectModal = false">
      <div class="modal-content">
        <div class="modal-icon-row">
          <div class="danger-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <h3>Tolak Pengambilan Pesanan</h3>
        </div>
        <p class="modal-body-text">
          Yakin ingin menolak pengambilan pesanan ini? Pesanan akan dikembalikan ke status <strong>MENUNGGU</strong> dan supir akan dihapus dari pesanan ini.
        </p>
        <div class="modal-actions">
          <button class="btn-outline" @click="showRejectModal = false">Batal</button>
          <button class="btn-danger" :disabled="processingId !== null" @click="handleReject">
            {{ processingId ? 'Memproses...' : 'Ya, Tolak' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 20px; }

.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.section-header h2 { margin: 0; font-size: 22px; }
.section-header p { margin: 6px 0 0; color: #64748b; }

.pending-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: #fed7aa;
  color: #9a3412;
  font-weight: 800;
  font-size: 13px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(15,23,42,.08);
}

.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state h3 { margin: 0; font-size: 20px; color: #0f172a; }
.empty-state p { margin: 8px 0 0; color: #64748b; font-size: 15px; }

/* Approval Cards */
.approval-cards { display: flex; flex-direction: column; gap: 16px; }

.approval-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(15,23,42,.06);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.approval-card:hover {
  box-shadow: 0 8px 24px rgba(15,23,42,.12);
}

.ac-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  border-bottom: 1px solid #fed7aa;
}

.ac-customer { display: flex; flex-direction: column; gap: 2px; }
.ac-name { font-size: 16px; font-weight: 700; color: #0f172a; }
.ac-phone { font-size: 12px; color: #94a3b8; }

.ac-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

.ac-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ac-info { display: flex; flex-direction: column; gap: 3px; }
.ac-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.ac-value { font-size: 14px; color: #334155; font-weight: 500; line-height: 1.4; }
.ac-driver { color: #1d4ed8; font-weight: 700; }

.ac-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px dashed #e2e8f0;
  background: #fafbfc;
}

.btn-approve {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
}

.btn-approve:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.35);
}

.btn-approve:disabled { opacity: 0.7; cursor: wait; }

.btn-reject {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1.5px solid #fca5a5;
  border-radius: 12px;
  background: #fff;
  color: #dc2626;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reject:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #ef4444;
}

.btn-reject:disabled { opacity: 0.7; cursor: wait; }

/* Messages */
.success { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; }
.error { color: #dc2626; margin: 4px 0; background: #fef2f2; border: 1px solid #fecaca; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; }
.info { color: #64748b; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn .2s ease-out; }
.modal-content { background: #fff; border-radius: 16px; width: min(480px, 90%); padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1); animation: slideUp .25s cubic-bezier(.16,1,.3,1); }
.modal-icon-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.modal-icon-row h3 { margin: 0; font-size: 18px; font-weight: 700; }
.danger-icon-wrapper { background: #fee2e2; color: #dc2626; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-body-text { color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.btn-outline { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-weight: 600; color: #0f172a; cursor: pointer; font-size: 13px; transition: all .2s; }
.btn-outline:hover { background: #f8fafc; }
.btn-danger { border: none; border-radius: 8px; padding: 8px 12px; font-weight: 600; background: #dc2626; color: #fff; cursor: pointer; font-size: 13px; }
.btn-danger:hover { background: #b91c1c; }
.btn-danger:disabled { opacity: .7; cursor: wait; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(12px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

@media (max-width: 768px) {
  .section-header { flex-direction: column; align-items: flex-start; }
  .ac-info-grid { grid-template-columns: 1fr; }
  .ac-footer { flex-direction: column; }
  .modal-content { width: min(360px, 92%); padding: 20px; }
  .modal-actions { flex-direction: column-reverse; }
  .modal-actions button { width: 100%; padding: 12px; font-size: 14px; border-radius: 12px; text-align: center; justify-content: center; }
}
</style>
