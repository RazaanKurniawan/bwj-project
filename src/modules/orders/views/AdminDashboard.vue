<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import type { Order, OrderStatus } from "../types";
import { fetchAllOrders, updateOrder, deleteOrder } from "../services/orderService";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import AdminAnalytics from "../components/AdminAnalytics.vue";
import { fetchDrivers } from "../../auth/services/profileService";
import type { Profile } from "../../auth/types";

const activeTab = ref<"orders" | "analytics">("analytics");

const orders = ref<Order[]>([]);
const drivers = ref<Profile[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const successMsg = ref("");
const selectedFilter = ref("all");

const updates = reactive<Record<string, { status: OrderStatus; driverId: string | null }>>({});
const statusOptions: OrderStatus[] = ["menunggu", "diproses", "dikirim", "selesai", "batal"];

// Edit modal
const showEditModal = ref(false);
const editOrder = ref<Order | null>(null);
const editForm = reactive({
  customer_name: "", address: "", phone: "", volume: "",
  notes: "", schedule_at: "", status: "menunggu" as OrderStatus,
  assigned_driver_id: null as string | null,
});
const saving = ref(false);

// Delete modal
const showDeleteModal = ref(false);
const deleteTarget = ref<Order | null>(null);
const deleting = ref(false);

const formatDate = (v: string | null) => v ? new Date(v).toLocaleString() : "-";

const filteredOrders = computed(() => {
  if (selectedFilter.value === "all") return orders.value;
  return orders.value.filter(o => o.status === selectedFilter.value);
});

const loadData = async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    const [od, dd] = await Promise.all([fetchAllOrders(), fetchDrivers()]);
    orders.value = od;
    drivers.value = dd;
    od.forEach(o => { updates[o.id] = { status: o.status, driverId: o.assigned_driver_id }; });
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal memuat data.";
  } finally {
    loading.value = false;
  }
};

const handleSave = async (orderId: string) => {
  const u = updates[orderId];
  if (!u) return;
  try {
    await updateOrder(orderId, { status: u.status, assigned_driver_id: u.driverId });
    successMsg.value = "Pesanan berhasil diperbarui.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadData();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal update order.";
  }
};

const openEdit = (order: Order) => {
  editOrder.value = order;
  editForm.customer_name = order.customer_name;
  editForm.address = order.address;
  editForm.phone = order.phone;
  editForm.volume = order.volume;
  editForm.notes = order.notes ?? "";
  editForm.schedule_at = order.schedule_at ?? "";
  editForm.status = order.status;
  editForm.assigned_driver_id = order.assigned_driver_id;
  showEditModal.value = true;
};

const handleEdit = async () => {
  if (!editOrder.value) return;
  saving.value = true;
  errorMsg.value = "";
  try {
    await updateOrder(editOrder.value.id, {
      customer_name: editForm.customer_name,
      address: editForm.address,
      phone: editForm.phone,
      volume: editForm.volume,
      notes: editForm.notes || null,
      schedule_at: editForm.schedule_at || null,
      status: editForm.status,
      assigned_driver_id: editForm.assigned_driver_id,
    });
    showEditModal.value = false;
    successMsg.value = "Pesanan berhasil diedit.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadData();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal edit pesanan.";
  } finally {
    saving.value = false;
  }
};

const openDelete = (order: Order) => {
  deleteTarget.value = order;
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  errorMsg.value = "";
  try {
    await deleteOrder(deleteTarget.value.id);
    successMsg.value = "Pesanan berhasil dihapus.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadData();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal menghapus pesanan.";
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
    deleteTarget.value = null;
  }
};

onMounted(loadData);
</script>

<template>
  <div class="dashboard">
    <header class="section-header">
      <div>
        <h2>Dashboard Admin</h2>
        <p>Kelola pesanan, status, dan pantau statistik pengiriman.</p>
      </div>
      <router-link to="/admin/users" class="btn-primary">Manajemen User</router-link>
    </header>

    <!-- Tabs -->
    <div class="tabs-wrapper">
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'analytics' }"
          @click="activeTab = 'analytics'"
        >
          Statistik & Laporan
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'orders' }"
          @click="activeTab = 'orders'"
        >
          Manajemen Pesanan
          <span v-if="orders.length" class="tab-count">{{ orders.length }}</span>
        </button>
      </div>
    </div>

    <p v-if="successMsg" class="success">{{ successMsg }}</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat data admin...</p>

    <template v-if="!loading">
      <!-- ====== TAB: ANALYTICS ====== -->
      <template v-if="activeTab === 'analytics'">
        <AdminAnalytics :orders="orders" />
      </template>

      <!-- ====== TAB: MANAJEMEN PESANAN ====== -->
      <template v-if="activeTab === 'orders'">
        <!-- Filter -->
        <div class="filter-wrapper">
          <label for="admin-filter">Filter Status:</label>
          <select id="admin-filter" v-model="selectedFilter">
            <option value="all">Semua Status</option>
            <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
          <span class="order-count">{{ filteredOrders.length }} pesanan</span>
        </div>

        <section class="card">
        <div v-if="filteredOrders.length === 0" class="empty">Tidak ada pesanan.</div>
        <div v-else class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pelanggan</th>
                <th>Alamat</th>
                <th>Volume</th>
                <th>Jadwal</th>
                <th>Status</th>
                <th>Supir</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in filteredOrders" :key="order.id">
                <td class="cell-bold">{{ order.customer_name }}</td>
                <td class="cell-muted" :title="order.address">{{ order.address }}</td>
                <td>{{ order.volume }}</td>
                <td class="cell-date">{{ formatDate(order.schedule_at) }}</td>
                <td><OrderStatusBadge :status="order.status" /></td>
                <td class="cell-muted">
                  {{ drivers.find(d => d.id === order.assigned_driver_id)?.name ?? "Belum ada" }}
                </td>
                <td class="cell-actions-group">
                  <div class="actions-card">
                    <div class="actions-quick" v-if="updates[order.id]">
                      <div class="quick-selects">
                        <select v-model="updates[order.id]!.status" class="table-select">
                          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
                        </select>
                        <select v-model="updates[order.id]!.driverId" class="table-select">
                          <option :value="null">Tidak ada</option>
                          <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name || d.id }}</option>
                        </select>
                      </div>
                      <button class="btn-sm btn-save" @click="handleSave(order.id)">Simpan</button>
                    </div>
                    <div class="actions-manage">
                      <button class="btn-sm btn-edit" @click="openEdit(order)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button class="btn-sm btn-delete" @click="openDelete(order)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        Hapus
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      </template>
    </template>

    <!-- Edit Order Modal -->
    <div v-if="showEditModal" class="modal-backdrop" @click.self="showEditModal = false">
      <div class="modal-content modal-wide">
        <h3>Edit Pesanan</h3>
        <form class="modal-form" @submit.prevent="handleEdit">
          <div class="field-grid">
            <label class="field"><span>Nama Pelanggan</span><input v-model="editForm.customer_name" required /></label>
            <label class="field"><span>No HP</span><input v-model="editForm.phone" /></label>
          </div>
          <label class="field"><span>Alamat</span><input v-model="editForm.address" required /></label>
          <div class="field-grid">
            <label class="field"><span>Volume</span><input v-model="editForm.volume" /></label>
            <label class="field"><span>Jadwal</span><input v-model="editForm.schedule_at" type="datetime-local" /></label>
          </div>
          <label class="field"><span>Catatan</span><textarea v-model="editForm.notes" rows="2"></textarea></label>
          <div class="field-grid">
            <label class="field">
              <span>Status</span>
              <select v-model="editForm.status">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
            <label class="field">
              <span>Supir</span>
              <select v-model="editForm.assigned_driver_id">
                <option :value="null">Belum ditugaskan</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name || d.id }}</option>
              </select>
            </label>
          </div>
          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-outline" @click="showEditModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? "Menyimpan..." : "Simpan" }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal = false">
      <div class="modal-content">
        <div class="modal-icon-row">
          <div class="danger-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </div>
          <h3>Hapus Pesanan</h3>
        </div>
        <p class="modal-body-text">Yakin ingin menghapus pesanan dari <strong>{{ deleteTarget?.customer_name }}</strong>? Tindakan ini tidak bisa dibatalkan.</p>
        <div class="modal-actions">
          <button class="btn-outline" @click="showDeleteModal = false">Batal</button>
          <button class="btn-danger" :disabled="deleting" @click="handleDelete">{{ deleting ? "Menghapus..." : "Hapus" }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: grid; gap: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.section-header h2 { margin: 0; font-size: 22px; }
.section-header p { margin: 6px 0 0; color: #64748b; }

.tabs-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: #fff;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.tab-btn.active {
  background: #0f172a;
  color: #fff;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
}

.tab-btn:not(.active) .tab-count {
  background: #e2e8f0;
  color: #475569;
}
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 12px 28px rgba(15,23,42,.08); }
.filter-wrapper { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; padding: 12px 18px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05); }
.filter-wrapper label { font-size: 13px; font-weight: 600; color: #475569; }
.filter-wrapper select { padding: 8px 12px; font-size: 13px; border-radius: 8px; border: 1px solid #cbd5e1; color: #1e293b; outline: none; background: #fff; cursor: pointer; min-width: 140px; transition: border-color .2s; }
.filter-wrapper select:focus { border-color: #0f172a; }
.order-count { margin-left: auto; font-size: 13px; color: #64748b; font-weight: 500; }
.table-responsive { width: 100%; overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
.data-table th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px; letter-spacing: .05em; white-space: nowrap; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #f8fafc; }
.cell-bold { font-weight: 600; color: #0f172a; }
.cell-muted { color: #64748b; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-date { color: #475569; font-size: 13px; white-space: nowrap; }
.cell-actions-group { vertical-align: middle; min-width: 220px; }
.actions-card { display: flex; flex-direction: column; gap: 8px; }
.actions-quick { display: flex; align-items: center; gap: 6px; }
.quick-selects { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.actions-manage { display: flex; gap: 6px; border-top: 1px dashed #e2e8f0; padding-top: 8px; }
.table-select { padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; color: #1e293b; background: #fff; width: 100%; outline: none; transition: border-color .2s; cursor: pointer; }
.table-select:focus { border-color: #0f172a; }
.btn-sm { padding: 6px 10px; font-size: 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all .15s ease; white-space: nowrap; }
.btn-save { background: #0f172a; color: #fff; align-self: flex-end; }
.btn-save:hover { background: #1e293b; }
.btn-edit { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; flex: 1; justify-content: center; }
.btn-edit:hover { background: #dbeafe; }
.btn-delete { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; flex: 1; justify-content: center; }
.btn-delete:hover { background: #fee2e2; }
.btn-primary { border: none; border-radius: 8px; padding: 8px 16px; font-weight: 600; background: #0f172a; color: #fff; cursor: pointer; font-size: 13px; text-decoration: none; transition: background .2s; display: inline-flex; align-items: center; }
.btn-primary:hover { background: #1e293b; }
.btn-primary:disabled { opacity: .7; cursor: wait; }
.btn-outline { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-weight: 600; color: #0f172a; cursor: pointer; font-size: 13px; transition: all .2s; }
.btn-outline:hover { background: #f8fafc; }
.btn-danger { border: none; border-radius: 8px; padding: 8px 12px; font-weight: 600; background: #dc2626; color: #fff; cursor: pointer; font-size: 13px; }
.btn-danger:hover { background: #b91c1c; }
.btn-danger:disabled { opacity: .7; cursor: wait; }
.empty { color: #64748b; padding: 20px 0; }
.error { color: #dc2626; margin: 4px 0; }
.success { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; }
.info { color: #64748b; }
/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn .2s ease-out; }
.modal-content { background: #fff; border-radius: 16px; width: min(480px, 90%); padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1); animation: slideUp .25s cubic-bezier(.16,1,.3,1); }
.modal-wide { width: min(600px, 95%); }
.modal-content h3 { margin: 0 0 16px; font-size: 18px; font-weight: 700; }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.field input, .field select, .field textarea { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; transition: border-color .2s; font-family: inherit; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: #0f172a; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.modal-icon-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.danger-icon-wrapper { background: #fee2e2; color: #dc2626; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-body-text { color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(12px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
@media (max-width: 767px) { .field-grid { grid-template-columns: 1fr; } }
</style>
