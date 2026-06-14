<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from "vue";
import { debounce } from "lodash-es";
import type { Order, OrderStatus } from "../types";
import { fetchOrdersPaginated, updateOrder, deleteOrder } from "../services/orderService";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import { fetchDrivers } from "../../auth/services/profileService";
import type { Profile } from "../../auth/types";
import CustomSelect from "../../shared/components/CustomSelect.vue";

const orders = ref<Order[]>([]);
const drivers = ref<Profile[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const successMsg = ref("");
const selectedFilter = ref("all");

const currentPage = ref(1);
const limit = ref(10);
const totalCount = ref(0);
const totalPages = ref(1);

const updates = reactive<Record<string, { status: OrderStatus; driverId: string | null }>>({});
const statusOptions: OrderStatus[] = ["menunggu", "menunggu_persetujuan", "diproses", "dikirim", "selesai", "batal"];

const statusSelectOptions = computed(() => statusOptions.map(s => ({ label: s, value: s })));
const statusFilterOptions = computed(() => [{ label: "Semua Status", value: "all" }, ...statusSelectOptions.value]);
const driverSelectOptions = computed(() => [{ label: "Pilih Supir", value: null }, ...drivers.value.map(d => ({ label: d.name || d.id, value: d.id }))]);
const limitOptions = [{ label: "5", value: 5 }, { label: "10", value: 10 }, { label: "20", value: 20 }, { label: "50", value: 50 }];

const showEditModal = ref(false);
const editOrder = ref<Order | null>(null);
const editForm = reactive({
  customer_name: "", address: "", phone: "", volume: "",
  notes: "", schedule_at: "", status: "menunggu" as OrderStatus,
  assigned_driver_id: null as string | null,
});
const saving = ref(false);

const showDeleteModal = ref(false);
const deleteTarget = ref<Order | null>(null);
const deleting = ref(false);

const formatDate = (v: string | null) => v ? new Date(v).toLocaleString() : "-";

const tableFilters = reactive({
  customerName: "", address: "", volume: "", scheduleAt: "", driverName: ""
});

const loadDrivers = async () => {
  try { drivers.value = await fetchDrivers(); } catch (e) { console.error("Failed to load drivers:", e); }
};

const fetchTableData = async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    const filters = {
      customer_name: tableFilters.customerName || undefined,
      address: tableFilters.address || undefined,
      volume: tableFilters.volume || undefined,
      schedule_at: tableFilters.scheduleAt || undefined,
      driver_name: tableFilters.driverName || undefined,
      status: selectedFilter.value !== "all" ? selectedFilter.value : undefined
    };
    const res = await fetchOrdersPaginated(currentPage.value, limit.value, filters);
    orders.value = res.data;
    totalCount.value = res.count;
    totalPages.value = Math.ceil(res.count / limit.value) || 1;
    orders.value.forEach(o => { updates[o.id] = { status: o.status, driverId: o.assigned_driver_id }; });
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal memuat data.";
  } finally { loading.value = false; }
};

const debouncedFetch = debounce(() => { currentPage.value = 1; fetchTableData(); }, 500);
watch(tableFilters, () => { debouncedFetch(); }, { deep: true });
watch(selectedFilter, () => { currentPage.value = 1; fetchTableData(); });
watch(limit, () => { currentPage.value = 1; fetchTableData(); });

const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; fetchTableData(); } };
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; fetchTableData(); } };

const loadData = async () => { await loadDrivers(); await fetchTableData(); };

const handleSave = async (orderId: string) => {
  const u = updates[orderId];
  if (!u) return;
  try {
    await updateOrder(orderId, { status: u.status, assigned_driver_id: u.driverId });
    successMsg.value = "Pesanan berhasil diperbarui.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadData();
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : "Gagal update order."; }
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
      customer_name: editForm.customer_name, address: editForm.address,
      phone: editForm.phone, volume: editForm.volume,
      notes: editForm.notes || null, schedule_at: editForm.schedule_at || null,
      status: editForm.status, assigned_driver_id: editForm.assigned_driver_id,
    });
    showEditModal.value = false;
    successMsg.value = "Pesanan berhasil diedit.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadData();
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : "Gagal edit pesanan."; }
  finally { saving.value = false; }
};

const openDelete = (order: Order) => { deleteTarget.value = order; showDeleteModal.value = true; };

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  errorMsg.value = "";
  try {
    await deleteOrder(deleteTarget.value.id);
    successMsg.value = "Pesanan berhasil dihapus.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadData();
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : "Gagal menghapus pesanan."; }
  finally { deleting.value = false; showDeleteModal.value = false; deleteTarget.value = null; }
};

onMounted(loadData);
</script>

<template>
  <div class="dashboard">
    <header class="section-header">
      <div>
        <h2>Manajemen Pesanan</h2>
        <p>Kelola semua pesanan, status, dan penugasan supir.</p>
      </div>
    </header>

    <p v-if="successMsg" class="success">{{ successMsg }}</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat data pesanan...</p>

    <template v-if="!loading">


      <section class="card">
        <!-- Desktop Table -->
        <div class="table-responsive desktop-only">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pelanggan</th><th>Alamat</th><th>Jenis Air</th>
                <th>Jadwal</th><th>Status</th><th>Supir</th><th>Aksi</th>
              </tr>
              <tr class="filter-row">
                <th><input type="text" v-model="tableFilters.customerName" placeholder="Cari Pelanggan..." /></th>
                <th><input type="text" v-model="tableFilters.address" placeholder="Cari Alamat..." /></th>
                <th><input type="text" v-model="tableFilters.volume" placeholder="Cari Jenis Air..." /></th>
                <th><input type="date" v-model="tableFilters.scheduleAt" /></th>
                <th>
                  <CustomSelect v-model="selectedFilter" :options="statusFilterOptions" class="csel-filter-width" />
                </th>
                <th><input type="text" v-model="tableFilters.driverName" placeholder="Cari Supir..." /></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="orders.length === 0">
                <td colspan="7" class="empty-table-cell">Tidak ada pesanan.</td>
              </tr>
              <template v-else>
                <tr v-for="order in orders" :key="order.id">
                  <td class="cell-bold">{{ order.customer_name }}</td>
                  <td class="cell-muted" :title="order.address">{{ order.address }}</td>
                  <td>{{ order.volume }}</td>
                  <td class="cell-date">{{ formatDate(order.schedule_at) }}</td>
                  <td><OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" /></td>
                  <td class="cell-muted">
                    {{ drivers.find(d => d.id === order.assigned_driver_id)?.name ?? "Belum ada" }}
                  </td>
                  <td class="cell-actions-group">
                    <div class="actions-card">
                      <div class="actions-quick" v-if="updates[order.id]">
                        <div class="quick-selects">
                          <CustomSelect v-model="updates[order.id]!.status" :options="statusSelectOptions" :small="true" />
                          <CustomSelect v-model="updates[order.id]!.driverId" :options="driverSelectOptions" :small="true" placeholder="Pilih Supir" />
                        </div>
                        <button class="btn-sm btn-save" @click="handleSave(order.id)">Simpan</button>
                      </div>
                      <div class="actions-manage">
                        <button class="btn-sm btn-edit" @click="openEdit(order)">✏️ Edit</button>
                        <button class="btn-sm btn-delete" @click="openDelete(order)">🗑️ Hapus</button>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View -->
        <div class="mobile-only">
          <!-- Mobile Filters -->
          <div class="mobile-filters">
            <input type="text" v-model="tableFilters.customerName" placeholder="🔍 Cari pelanggan..." class="mobile-filter-input" />
            <div class="mobile-filter-row">
              <CustomSelect v-model="selectedFilter" :options="statusFilterOptions" />
              <input type="date" v-model="tableFilters.scheduleAt" class="mobile-filter-input" />
            </div>
          </div>

          <div v-if="orders.length === 0" class="mobile-empty">Tidak ada pesanan.</div>

          <div v-else class="mobile-cards">
            <div v-for="order in orders" :key="order.id" class="mobile-order-card">
              <div class="moc-header">
                <div class="moc-customer">
                  <span class="moc-name">{{ order.customer_name }}</span>
                  <span class="moc-phone">{{ order.phone }}</span>
                </div>
                <OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" />
              </div>

              <div class="moc-body">
                <div class="moc-row">
                  <span class="moc-label">📍 Alamat</span>
                  <span class="moc-value">{{ order.address }}</span>
                </div>
                <div class="moc-grid">
                  <div class="moc-col">
                    <span class="moc-label">📦 Kategori</span>
                    <span class="moc-value">{{ order.volume }}</span>
                  </div>
                  <div class="moc-col">
                    <span class="moc-label">🚗 Supir</span>
                    <span class="moc-value">{{ drivers.find(d => d.id === order.assigned_driver_id)?.name ?? 'Belum ada' }}</span>
                  </div>
                </div>
                <div class="moc-row" v-if="order.schedule_at">
                  <span class="moc-label">📅 Jadwal</span>
                  <span class="moc-value moc-date">{{ formatDate(order.schedule_at) }}</span>
                </div>
              </div>

              <div class="moc-footer" v-if="updates[order.id]">
                <CustomSelect v-model="updates[order.id]!.status" :options="statusSelectOptions" />
                <CustomSelect v-model="updates[order.id]!.driverId" :options="driverSelectOptions" placeholder="Pilih Supir" />
                <div class="moc-actions">
                  <button class="btn-sm btn-save" @click="handleSave(order.id)">💾 Simpan</button>
                  <button class="btn-sm btn-edit" @click="openEdit(order)">✏️ Edit</button>
                  <button class="btn-sm btn-delete" @click="openDelete(order)">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-footer" v-if="orders.length > 0">
          <div class="row-count">Menampilkan {{ orders.length }} dari {{ totalCount }} baris data.</div>
          <div class="pagination-controls">
            <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
            <button class="btn-page" :disabled="currentPage === 1" @click="prevPage">&laquo;</button>
            <button class="btn-page" :disabled="currentPage === totalPages" @click="nextPage">&raquo;</button>
            <CustomSelect v-model="limit" :options="limitOptions" class="page-select" :small="true" />
          </div>
        </div>
      </section>
    </template>

    <!-- Edit Modal -->
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
            <label class="field"><span>Jenis Air</span><input v-model="editForm.volume" /></label>
            <label class="field"><span>Jadwal</span><input v-model="editForm.schedule_at" type="datetime-local" /></label>
          </div>
          <label class="field"><span>Catatan</span><textarea v-model="editForm.notes" rows="2"></textarea></label>
          <div class="field-grid">
            <label class="field"><span>Status</span>
              <CustomSelect v-model="editForm.status" :options="statusSelectOptions" />
            </label>
            <label class="field"><span>Supir</span>
              <CustomSelect v-model="editForm.assigned_driver_id" :options="driverSelectOptions" placeholder="Pilih Supir" />
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

    <!-- Delete Modal -->
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
.dashboard { display: flex; flex-direction: column; gap: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.section-header h2 { margin: 0; font-size: 22px; }
.section-header p { margin: 6px 0 0; color: #64748b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 12px 28px rgba(15,23,42,.08); }
.filter-wrapper { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; padding: 12px 18px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05); }
.filter-wrapper label { font-size: 13px; font-weight: 600; color: #475569; }
.filter-wrapper select { padding: 8px 12px; font-size: 13px; border-radius: 8px; border: 1px solid #cbd5e1; color: #1e293b; outline: none; background: #fff; cursor: pointer; min-width: 140px; transition: border-color .2s; }
.filter-wrapper select:focus { border-color: #0f172a; }
.order-count { margin-left: auto; font-size: 13px; color: #64748b; font-weight: 500; }
.table-responsive { width: 100%; overflow-x: auto; border-radius: 8px; background: #fff; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.data-table th { background: #ffffff; color: #1e293b; font-weight: 700; padding: 16px; border-bottom: 2px solid #f1f5f9; font-size: 13px; white-space: nowrap; }
.filter-row th { padding: 8px 16px; border-bottom: 2px solid #f1f5f9; }
.filter-row input { width: 100%; min-width: 140px; padding: 8px 12px; font-size: 12px; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; transition: border-color .2s; box-sizing: border-box; background-color: #fff; cursor: pointer; }
.filter-row input:focus { border-color: #4f46e5; }
.csel-filter-width { min-width: 140px; }
.data-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; background: #ffffff; white-space: nowrap; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #f8fafc; }
.cell-bold { font-weight: 600; color: #4f46e5; }
.cell-muted { color: #64748b; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-date { color: #475569; font-size: 13px; white-space: nowrap; }
.cell-actions-group { vertical-align: middle; min-width: 220px; }
.actions-card { display: flex; flex-direction: column; gap: 8px; }
.actions-quick { display: flex; align-items: stretch; gap: 6px; }
.quick-selects { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.actions-manage { display: flex; gap: 6px; border-top: 1px dashed #e2e8f0; padding-top: 8px; }
.btn-sm { padding: 6px 10px; font-size: 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: all .15s ease; white-space: nowrap; }
.btn-save { background: #0f172a; color: #fff; }
.btn-save:hover { background: #1e293b; }
.btn-edit { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; flex: 1; justify-content: center; }
.btn-edit:hover { background: #dbeafe; }
.btn-delete { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; flex: 1; justify-content: center; }
.btn-delete:hover { background: #fee2e2; }

/* Pagination */
.pagination-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; margin-top: 8px; flex-wrap: wrap; gap: 12px; }
.pagination-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn-page { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; cursor: pointer; color: #0f172a; font-weight: 600; transition: all .2s; font-size: 13px; }
.btn-page:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
.page-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; outline: none; cursor: pointer; }

.btn-primary { border: none; border-radius: 8px; padding: 8px 16px; font-weight: 600; background: #0f172a; color: #fff; cursor: pointer; font-size: 13px; transition: background .2s; display: inline-flex; align-items: center; }
.btn-primary:hover { background: #1e293b; }
.btn-primary:disabled { opacity: .7; cursor: wait; }
.btn-outline { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-weight: 600; color: #0f172a; cursor: pointer; font-size: 13px; transition: all .2s; }
.btn-outline:hover { background: #f8fafc; }
.btn-danger { border: none; border-radius: 8px; padding: 8px 12px; font-weight: 600; background: #dc2626; color: #fff; cursor: pointer; font-size: 13px; }
.btn-danger:hover { background: #b91c1c; }
.btn-danger:disabled { opacity: .7; cursor: wait; }
.error { color: #dc2626; margin: 4px 0; }
.success { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; }
.info { color: #64748b; }
.empty-table-cell { text-align: center; padding: 48px 16px !important; color: #64748b; font-style: italic; background: #ffffff !important; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn .2s ease-out; }
.modal-content { background: #fff; border-radius: 16px; width: min(480px, 90%); padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1); animation: slideUp .25s cubic-bezier(.16,1,.3,1); }
.modal-wide { width: min(600px, 95%); }
.modal-content h3 { margin: 0 0 16px; font-size: 18px; font-weight: 700; }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.field-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.field input, .field select, .field textarea { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; transition: border-color .2s; font-family: inherit; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: #0f172a; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.modal-icon-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.danger-icon-wrapper { background: #fee2e2; color: #dc2626; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-body-text { color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(12px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

/* Mobile responsive */
@media (max-width: 768px) {
  .dashboard { gap: 14px; }
  .section-header { flex-direction: column; align-items: flex-start; }
  .section-header h2 { font-size: 20px; }
  .card { padding: 12px; border-radius: 14px; }
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }
  .pagination-footer { flex-direction: column; align-items: center; gap: 10px; text-align: center; }
  .pagination-controls { justify-content: center; flex-wrap: wrap; }
  .field-grid { grid-template-columns: 1fr; }
  .modal-content { width: min(360px, 92%); padding: 20px; border-radius: 20px; }
  .modal-wide { width: min(400px, 94%); }
  .modal-actions { flex-direction: column-reverse; }
  .modal-actions button { width: 100%; padding: 12px; font-size: 14px; border-radius: 12px; text-align: center; justify-content: center; }
}

/* ─── Desktop/Mobile helpers ─── */
.desktop-only { display: block; }
.mobile-only { display: none; }

/* ─── Mobile Filters ─── */
.mobile-filters { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.mobile-filter-input { width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 14px; box-sizing: border-box; outline: none; background: #f8fafc; }
.mobile-filter-input:focus { border-color: #4f46e5; background: #fff; }
.mobile-filter-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }

/* ─── Mobile Empty ─── */
.mobile-empty { text-align: center; padding: 48px 16px; color: #64748b; font-style: italic; }

/* ─── Mobile Cards ─── */
.mobile-cards { display: flex; flex-direction: column; gap: 12px; }

.mobile-order-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(15,23,42,0.06);
  transition: box-shadow 0.2s;
}

.moc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
  border-radius: 16px 16px 0 0;
}

.moc-customer { display: flex; flex-direction: column; gap: 2px; }
.moc-name { font-size: 15px; font-weight: 700; color: #0f172a; }
.moc-phone { font-size: 12px; color: #94a3b8; }

.moc-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }

.moc-row { display: flex; flex-direction: column; gap: 2px; }
.moc-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
.moc-col { display: flex; flex-direction: column; gap: 2px; }

.moc-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.moc-value { font-size: 14px; color: #334155; font-weight: 500; line-height: 1.4; }
.moc-date { font-size: 13px; color: #475569; }

.moc-footer {
  padding: 12px 16px;
  border-top: 1px dashed #e2e8f0;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 0 0 16px 16px;
}



.moc-actions {
  display: flex;
  gap: 8px;
}

.moc-actions .btn-sm {
  flex: 1;
  justify-content: center;
  text-align: center;
  padding: 10px 8px;
  font-size: 13px;
  border-radius: 10px;
}
</style>
