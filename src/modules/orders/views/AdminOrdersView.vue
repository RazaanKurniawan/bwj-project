<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from "vue";
import { debounce } from "lodash-es";
import type { Order, OrderStatus } from "../types";
import { fetchOrdersPaginated, updateOrder } from "../services/orderService";
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

const statusOptions: OrderStatus[] = ["menunggu", "menunggu_persetujuan", "diproses", "dikirim", "selesai", "batal"];
const statusSelectOptions = computed(() => statusOptions.map(s => ({ label: s, value: s })));
const statusFilterOptions = computed(() => [{ label: "Semua Status", value: "all" }, ...statusSelectOptions.value]);
const driverSelectOptions = computed(() => [{ label: "Pilih Supir", value: null }, ...drivers.value.map(d => ({ label: d.name || d.id, value: d.id }))]);
const limitOptions = [{ label: "5", value: 5 }, { label: "10", value: 10 }, { label: "20", value: 20 }, { label: "50", value: 50 }];

// Terima popup (untuk status: menunggu)
const showTerimaModal = ref(false);
const terimaTarget = ref<Order | null>(null);
const terimaDriverId = ref<string | null>(null);
const terima_loading = ref(false);

// Approve popup (untuk status: menunggu_persetujuan)
const showApproveModal = ref(false);
const approveTarget = ref<Order | null>(null);
const approveDriverId = ref<string | null>(null);
const approving = ref(false);

// Tolak popup (shared untuk menunggu & menunggu_persetujuan)
const showTolakModal = ref(false);
const tolakTarget = ref<Order | null>(null);
const tolaking = ref(false);

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

// Terima flow (menunggu → diproses, pilih supir)
const openTerima = (order: Order) => {
  terimaTarget.value = order;
  terimaDriverId.value = null;
  showTerimaModal.value = true;
};
const handleTerima = async () => {
  if (!terimaTarget.value) return;
  terima_loading.value = true;
  errorMsg.value = "";
  try {
    await updateOrder(terimaTarget.value.id, { status: "diproses", assigned_driver_id: terimaDriverId.value });
    successMsg.value = "Pesanan diterima dan supir berhasil ditugaskan.";
    setTimeout(() => (successMsg.value = ""), 3000);
    showTerimaModal.value = false;
    terimaTarget.value = null;
    terimaDriverId.value = null;
    await loadData();
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : "Gagal menerima pesanan."; }
  finally { terima_loading.value = false; }
};

// Approve flow (menunggu_persetujuan → diproses, pilih/ganti supir)
const openApprove = (order: Order) => {
  approveTarget.value = order;
  approveDriverId.value = order.assigned_driver_id;
  showApproveModal.value = true;
};
const handleApprove = async () => {
  if (!approveTarget.value) return;
  approving.value = true;
  errorMsg.value = "";
  try {
    await updateOrder(approveTarget.value.id, { status: "diproses", assigned_driver_id: approveDriverId.value });
    successMsg.value = "Pesanan disetujui dan supir dikonfirmasi.";
    setTimeout(() => (successMsg.value = ""), 3000);
    showApproveModal.value = false;
    approveTarget.value = null;
    await loadData();
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : "Gagal menyetujui pesanan."; }
  finally { approving.value = false; }
};

// Tolak flow (menunggu / menunggu_persetujuan → batal)
const openTolak = (order: Order) => {
  tolakTarget.value = order;
  showTolakModal.value = true;
};
const handleTolak = async () => {
  if (!tolakTarget.value) return;
  tolaking.value = true;
  errorMsg.value = "";
  try {
    await updateOrder(tolakTarget.value.id, { status: "batal" });
    successMsg.value = "Pesanan berhasil ditolak.";
    setTimeout(() => (successMsg.value = ""), 3000);
    showTolakModal.value = false;
    tolakTarget.value = null;
    await loadData();
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : "Gagal menolak pesanan."; }
  finally { tolaking.value = false; }
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
                    <!-- menunggu: Terima / Tolak -->
                    <div v-if="order.status === 'menunggu'" class="action-btns">
                      <button class="btn-sm btn-terima" @click="openTerima(order)">📦 Terima</button>
                      <button class="btn-sm btn-tolak" @click="openTolak(order)">❌ Tolak</button>
                    </div>
                    <!-- menunggu_persetujuan: Approve / Tolak -->
                    <div v-else-if="order.status === 'menunggu_persetujuan'" class="action-btns">
                      <button class="btn-sm btn-approve" @click="openApprove(order)">✅ Approve</button>
                      <button class="btn-sm btn-tolak" @click="openTolak(order)">❌ Tolak</button>
                    </div>
                    <!-- diproses -->
                    <span v-else-if="order.status === 'diproses'" class="status-label label-diproses">⚙️ Sedang Diproses</span>
                    <!-- dikirim -->
                    <span v-else-if="order.status === 'dikirim'" class="status-label label-dikirim">🚚 Sedang Dikirim</span>
                    <!-- selesai -->
                    <span v-else-if="order.status === 'selesai'" class="status-label label-selesai">✔️ Selesai</span>
                    <!-- batal -->
                    <span v-else-if="order.status === 'batal'" class="status-label label-batal">🚫 Dibatalkan</span>
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

              <div class="moc-footer">
                <!-- menunggu -->
                <div v-if="order.status === 'menunggu'" class="moc-actions">
                  <button class="btn-sm btn-terima" @click="openTerima(order)">📦 Terima</button>
                  <button class="btn-sm btn-tolak" @click="openTolak(order)">❌ Tolak</button>
                </div>
                <!-- menunggu_persetujuan -->
                <div v-else-if="order.status === 'menunggu_persetujuan'" class="moc-actions">
                  <button class="btn-sm btn-approve" @click="openApprove(order)">✅ Approve</button>
                  <button class="btn-sm btn-tolak" @click="openTolak(order)">❌ Tolak</button>
                </div>
                <!-- status final / in-progress -->
                <div v-else class="moc-actions">
                  <span v-if="order.status === 'diproses'" class="status-label label-diproses">⚙️ Sedang Diproses</span>
                  <span v-else-if="order.status === 'dikirim'" class="status-label label-dikirim">🚚 Sedang Dikirim</span>
                  <span v-else-if="order.status === 'selesai'" class="status-label label-selesai">✔️ Selesai</span>
                  <span v-else-if="order.status === 'batal'" class="status-label label-batal">🚫 Dibatalkan</span>
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

    <!-- Terima Modal (menunggu → diproses) -->
    <div v-if="showTerimaModal" class="modal-backdrop" @click.self="showTerimaModal = false">
      <div class="modal-content">
        <div class="modal-icon-row">
          <div class="terima-icon-wrapper">📦</div>
          <h3>Terima Pesanan</h3>
        </div>
        <p class="modal-body-text">
          Pilih supir untuk pesanan dari <strong>{{ terimaTarget?.customer_name }}</strong>. Status akan diubah menjadi <strong>Diproses</strong>.
        </p>
        <div class="field">
          <span>Tugaskan Supir</span>
          <CustomSelect v-model="terimaDriverId" :options="driverSelectOptions" placeholder="Pilih Supir" />
        </div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <div class="modal-actions">
          <button class="btn-outline" @click="showTerimaModal = false">Batal</button>
          <button class="btn-terima-primary" :disabled="terima_loading" @click="handleTerima">
            {{ terima_loading ? "Memproses..." : "📦 Terima Pesanan" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Approve Modal (menunggu_persetujuan → diproses) -->
    <div v-if="showApproveModal" class="modal-backdrop" @click.self="showApproveModal = false">
      <div class="modal-content">
        <div class="modal-icon-row">
          <div class="approve-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3>Setujui Pesanan</h3>
        </div>
        <p class="modal-body-text">
          Konfirmasi supir untuk pesanan dari <strong>{{ approveTarget?.customer_name }}</strong>. Status akan diubah menjadi <strong>Diproses</strong>.
        </p>
        <div class="field">
          <span>Konfirmasi Supir</span>
          <CustomSelect v-model="approveDriverId" :options="driverSelectOptions" placeholder="Pilih Supir" />
        </div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <div class="modal-actions">
          <button class="btn-outline" @click="showApproveModal = false">Batal</button>
          <button class="btn-approve-primary" :disabled="approving" @click="handleApprove">
            {{ approving ? "Menyetujui..." : "✅ Approve" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tolak Modal (menunggu / menunggu_persetujuan → batal) -->
    <div v-if="showTolakModal" class="modal-backdrop" @click.self="showTolakModal = false">
      <div class="modal-content">
        <div class="modal-icon-row">
          <div class="danger-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h3>Tolak Pesanan</h3>
        </div>
        <p class="modal-body-text">
          Yakin ingin menolak pesanan dari <strong>{{ tolakTarget?.customer_name }}</strong>? Status akan diubah menjadi <strong>Batal</strong>.
        </p>
        <div class="modal-actions">
          <button class="btn-outline" @click="showTolakModal = false">Kembali</button>
          <button class="btn-danger" :disabled="tolaking" @click="handleTolak">
            {{ tolaking ? "Menolak..." : "❌ Tolak" }}
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
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 12px 28px rgba(15,23,42,.08); }
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
.cell-actions-group { vertical-align: middle; min-width: 160px; }

/* Action buttons */
.action-btns { display: flex; gap: 6px; }
.btn-sm { padding: 7px 12px; font-size: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: all .15s ease; white-space: nowrap; }
.btn-terima { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.btn-terima:hover { background: #dbeafe; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(29,78,216,0.15); }
.btn-approve { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
.btn-approve:hover { background: #bbf7d0; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(21,128,61,0.15); }
.btn-tolak { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.btn-tolak:hover { background: #fee2e2; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(220,38,38,0.15); }
/* Status labels for non-actionable rows */
.status-label { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.label-diproses { background: #eff6ff; color: #1d4ed8; }
.label-dikirim  { background: #f0fdf4; color: #15803d; }
.label-selesai  { background: #f0fdf4; color: #166534; }
.label-batal    { background: #fef2f2; color: #dc2626; }

/* Pagination */
.pagination-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; margin-top: 8px; flex-wrap: wrap; gap: 12px; }
.pagination-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn-page { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; cursor: pointer; color: #0f172a; font-weight: 600; transition: all .2s; font-size: 13px; }
.btn-page:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
.page-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; outline: none; cursor: pointer; }

.btn-outline { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-weight: 600; color: #0f172a; cursor: pointer; font-size: 13px; transition: all .2s; }
.btn-outline:hover { background: #f8fafc; }
.btn-danger { border: none; border-radius: 8px; padding: 8px 14px; font-weight: 600; background: #dc2626; color: #fff; cursor: pointer; font-size: 13px; transition: background .2s; }
.btn-danger:hover { background: #b91c1c; }
.btn-danger:disabled { opacity: .7; cursor: wait; }
.btn-terima-primary { border: none; border-radius: 8px; padding: 8px 14px; font-weight: 600; background: #1d4ed8; color: #fff; cursor: pointer; font-size: 13px; transition: background .2s; }
.btn-terima-primary:hover { background: #1e40af; }
.btn-terima-primary:disabled { opacity: .7; cursor: wait; }
.btn-approve-primary { border: none; border-radius: 8px; padding: 8px 14px; font-weight: 600; background: #16a34a; color: #fff; cursor: pointer; font-size: 13px; transition: background .2s; }
.btn-approve-primary:hover { background: #15803d; }
.btn-approve-primary:disabled { opacity: .7; cursor: wait; }

.error { color: #dc2626; margin: 4px 0; }
.success { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; }
.info { color: #64748b; }
.empty-table-cell { text-align: center; padding: 48px 16px !important; color: #64748b; font-style: italic; background: #ffffff !important; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn .2s ease-out; }
.modal-content { background: #fff; border-radius: 16px; width: min(440px, 90%); padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1); animation: slideUp .25s cubic-bezier(.16,1,.3,1); display: flex; flex-direction: column; gap: 14px; }
.modal-content h3 { margin: 0; font-size: 18px; font-weight: 700; }
.modal-icon-row { display: flex; align-items: center; gap: 12px; }
.terima-icon-wrapper { background: #eff6ff; font-size: 20px; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.approve-icon-wrapper { background: #dcfce7; color: #16a34a; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.danger-icon-wrapper { background: #fee2e2; color: #dc2626; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-body-text { color: #475569; font-size: 14px; line-height: 1.5; margin: 0; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; color: #374151; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
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
  .modal-content { width: min(360px, 92%); padding: 20px; border-radius: 20px; }
  .modal-actions { flex-direction: column-reverse; }
  .modal-actions button { width: 100%; padding: 12px; font-size: 14px; border-radius: 12px; text-align: center; justify-content: center; }
}

/* Desktop/Mobile helpers */
.desktop-only { display: block; }
.mobile-only { display: none; }

/* Mobile Filters */
.mobile-filters { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.mobile-filter-input { width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 14px; box-sizing: border-box; outline: none; background: #f8fafc; }
.mobile-filter-input:focus { border-color: #4f46e5; background: #fff; }
.mobile-filter-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }

/* Mobile Empty */
.mobile-empty { text-align: center; padding: 48px 16px; color: #64748b; font-style: italic; }

/* Mobile Cards */
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
