<script setup lang="ts">
import { computed, onMounted, ref, reactive, watch } from "vue";
import { debounce } from "lodash-es";
import OrderForm from "../components/OrderForm.vue";
import OrderList from "../components/OrderList.vue";
import MobileOrderList from "../components/MobileOrderList.vue";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import type { Order } from "../types";
import { fetchOrdersPaginated } from "../services/orderService";
import { useAuthStore } from "../../auth/stores/authStore";
import CustomSelect from "../../shared/components/CustomSelect.vue";
import { useRoute, useRouter } from "vue-router";
import { formatRupiah, calculateOrderTotal } from "../utils/pricing";

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const orders = ref<Order[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const selectedStatus = ref("all");
const activeMainTab = ref<"dashboard" | "create">(route.query.tab === "create" ? "create" : "dashboard");
const activeTab = ref<"active" | "history">("active");
const showSuccessModal = ref(false);

const userId = computed(() => authStore.user.value?.id ?? null);
const customerName = computed(() => authStore.profile.value?.name ?? null);
const customerPhone = computed(() => authStore.profile.value?.phone ?? null);

const activeOrders = ref<Order[]>([]);
const historyOrders = ref<Order[]>([]);

const tableFilters = reactive({ customerName: "", address: "", volume: "", scheduleAt: "" });
const currentPage = ref(1);
const limit = ref(10);
const totalCount = ref(0);
const totalPages = ref(1);

const statusFilterOptions = computed(() => {
  const options = [{ label: "Semua", value: "all" }];
  if (activeTab.value === 'active') {
    options.push(
      { label: "Menunggu", value: "menunggu" },
      { label: "Menunggu Approval", value: "menunggu_persetujuan" },
      { label: "Diproses", value: "diproses" },
      { label: "Dikirim", value: "dikirim" }
    );
  } else {
    options.push(
      { label: "Selesai", value: "selesai" },
      { label: "Batal", value: "batal" }
    );
  }
  return options;
});

const limitOptions = [
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
];



const fetchPaginatedData = async () => {
  const uid = userId.value;
  if (!uid) return;

  loading.value = true;
  errorMsg.value = "";

  try {
    const isHistory = activeTab.value === "history";
    const statusScope = isHistory ? ["selesai", "batal"] : ["menunggu", "menunggu_persetujuan", "diproses", "dikirim"];
    const finalStatus = selectedStatus.value !== "all" ? selectedStatus.value : statusScope;

    const res = await fetchOrdersPaginated(currentPage.value, limit.value, {
      customer_id: uid,
      status: finalStatus,
      customer_name: tableFilters.customerName || undefined,
      address: tableFilters.address || undefined,
      volume: tableFilters.volume || undefined,
      schedule_at: tableFilters.scheduleAt || undefined,
    });

    if (isHistory) {
      historyOrders.value = res.data;
    } else {
      activeOrders.value = res.data;
    }
    
    totalCount.value = res.count;
    totalPages.value = Math.ceil(res.count / limit.value) || 1;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengambil pesanan.";
  } finally {
    loading.value = false;
  }
};

const debouncedFetch = debounce(() => {
  currentPage.value = 1;
  fetchPaginatedData();
}, 500);

watch(tableFilters, () => debouncedFetch(), { deep: true });
watch(selectedStatus, () => { currentPage.value = 1; fetchPaginatedData(); });
watch(limit, () => { currentPage.value = 1; fetchPaginatedData(); });
watch(activeTab, () => { 
  currentPage.value = 1; 
  tableFilters.customerName = "";
  tableFilters.address = "";
  tableFilters.volume = "";
  tableFilters.scheduleAt = "";
  selectedStatus.value = "all";
  fetchPaginatedData(); 
});

watch(() => route.query.tab, (newTab) => {
  if (newTab === "create") {
    activeMainTab.value = "create";
  } else {
    activeMainTab.value = "dashboard";
  }
});

watch(activeMainTab, (newTab) => {
  if (newTab === "create") {
    router.replace({ query: { ...route.query, tab: "create" } });
  } else {
    const q = { ...route.query };
    delete q.tab;
    router.replace({ query: q });
  }
});

const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; fetchPaginatedData(); } };
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; fetchPaginatedData(); } };

const handleCreated = (newOrders: Order[]) => {
  fetchPaginatedData();
  showSuccessModal.value = true;
  activeMainTab.value = "dashboard";
};

onMounted(async () => {
  await authStore.initAuth();
  await fetchPaginatedData();
});
</script>

<template>
  <div class="dashboard">
    <div class="main-tabs-wrapper">
      <button 
        class="main-tab-btn" 
        :class="{ active: activeMainTab === 'dashboard' }" 
        @click="activeMainTab = 'dashboard'"
      >
        Beranda & Tracking
      </button>
      <button 
        class="main-tab-btn create-btn" 
        :class="{ active: activeMainTab === 'create' }" 
        @click="activeMainTab = 'create'"
      >
        + Buat Pesanan Baru
      </button>
    </div>

    <template v-if="activeMainTab === 'create'">
      <OrderForm
        v-if="userId"
        :customer-id="userId"
        :customer-name="customerName"
        :customer-phone="customerPhone"
        @created="handleCreated"
      />
    </template>

    <template v-else>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <p v-if="loading" class="info">Memuat pesanan...</p>

      <template v-else>

        <!-- Tabs -->
        <div class="tabs-wrapper">
          <div class="tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'active' }"
              @click="activeTab = 'active'"
            >
              Pesanan Aktif
              <span v-if="activeOrders.length" class="tab-count">{{ activeOrders.length }}</span>
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'history' }"
              @click="activeTab = 'history'"
            >
              Riwayat Pesanan
              <span v-if="historyOrders.length" class="tab-count">{{ historyOrders.length }}</span>
            </button>
          </div>

          <div class="filter-inline">
            <label for="status-filter">Filter:</label>
            <CustomSelect id="status-filter" v-model="selectedStatus" :options="statusFilterOptions" />
          </div>
        </div>

        <!-- Desktop: Table view -->
        <section class="card desktop-view">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th>Alamat</th>
                  <th>Jenis Air</th>
                  <th>Estimasi Harga</th>
                  <th>Jadwal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
                <tr class="filter-row">
                  <th><input type="text" v-model="tableFilters.customerName" placeholder="Cari Pelanggan..." /></th>
                  <th><input type="text" v-model="tableFilters.address" placeholder="Cari Alamat..." /></th>
                  <th><input type="text" v-model="tableFilters.volume" placeholder="Cari Jenis Air..." /></th>
                  <th></th>
                  <th><input type="date" v-model="tableFilters.scheduleAt" /></th>
                  <th>
                    <CustomSelect v-model="selectedStatus" :options="statusFilterOptions" class="filter-select" />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="(activeTab === 'active' ? activeOrders.length : historyOrders.length) === 0">
                  <td colspan="7" class="empty-table-cell">
                    {{ activeTab === 'active' ? 'Tidak ada pesanan aktif.' : 'Belum ada riwayat pesanan.' }}
                  </td>
                </tr>
                <template v-else>
                  <tr v-for="order in (activeTab === 'active' ? activeOrders : historyOrders)" :key="order.id">
                    <td class="cell-bold">{{ order.customer_name }}</td>
                    <td class="cell-muted" :title="order.address">{{ order.address }}</td>
                    <td>{{ order.volume }}</td>
                    <td class="cell-price">{{ formatRupiah(calculateOrderTotal(order.volume, order.customer_lat, order.customer_lng)) }}</td>
                    <td class="cell-date">{{ order.schedule_at ? new Date(order.schedule_at).toLocaleString() : '-' }}</td>
                    <td><OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" /></td>
                    <td>
                      <router-link class="btn-detail" :to="`/orders/${order.id}`">Detail</router-link>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="pagination-footer" v-if="(activeTab === 'active' ? activeOrders.length : historyOrders.length) > 0">
            <div class="row-count">Menampilkan {{ activeTab === 'active' ? activeOrders.length : historyOrders.length }} dari {{ totalCount }} baris data.</div>
            <div class="pagination-controls">
              <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
              <button class="btn-page" :disabled="currentPage === 1" @click="prevPage">&laquo;</button>
              <button class="btn-page" :disabled="currentPage === totalPages" @click="nextPage">&raquo;</button>
              <CustomSelect v-model="limit" :options="limitOptions" class="page-select" :small="true" />
            </div>
          </div>
        </section>

        <!-- Mobile: Card view -->
        <div class="mobile-view">
          <MobileOrderList
            :orders="activeTab === 'active' ? activeOrders : historyOrders"
            :empty-text="activeTab === 'active' ? 'Tidak ada pesanan aktif.' : 'Belum ada riwayat pesanan.'"
          />
          <!-- Mobile Pagination -->
          <div class="mobile-pagination" v-if="(activeTab === 'active' ? activeOrders.length : historyOrders.length) > 0">
            <span class="mobile-page-info">{{ currentPage }} / {{ totalPages }}</span>
            <div class="mobile-page-btns">
              <button class="btn-page" :disabled="currentPage === 1" @click="prevPage">&laquo; Prev</button>
              <button class="btn-page" :disabled="currentPage === totalPages" @click="nextPage">Next &raquo;</button>
            </div>
          </div>
        </div>

      </template>
    </template>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal-backdrop" @click.self="showSuccessModal = false">
      <div class="modal-content text-center">
        <div class="success-icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3 class="modal-title">Pesanan Berhasil Dibuat!</h3>
        <p class="modal-desc">Terima kasih telah memesan. Pesananmu sedang menunggu konfirmasi dari supir kami. Mohon ditunggu ya! 🚚💧</p>
        <button class="btn-primary mt-4" @click="showSuccessModal = false">Baik, Mengerti</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.main-tabs-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.main-tab-btn {
  flex: 1;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.main-tab-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.main-tab-btn.active {
  background: #0f172a;
  color: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.main-tab-btn.create-btn.active {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

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

.filter-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-inline label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.filter-inline select {
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  outline: none;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-inline select:focus {
  border-color: #0f172a;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}

/* Modal Styles */
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
  width: min(400px, 90%);
  padding: 32px 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.success-icon-wrapper {
  background: #dcfce7;
  color: #16a34a;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.modal-title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}
.modal-desc {
  margin: 0 0 24px;
  color: #475569;
  font-size: 15px;
  line-height: 1.5;
}
.btn-primary {
  border: none;
  border-radius: 10px;
  background: #0f172a;
  color: #fff;
  padding: 12px 24px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}
.btn-primary:hover {
  opacity: 0.9;
}
.mt-4 {
  margin-top: 16px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(12px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* Card */
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 12px 28px rgba(15,23,42,.08); }

/* Table Styles */
.table-responsive { width: 100%; overflow-x: auto; border-radius: 8px; background: #fff; margin-top: 16px;}
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.data-table th { background: #ffffff; color: #1e293b; font-weight: 700; padding: 16px 16px; border-bottom: 2px solid #f1f5f9; font-size: 13px; white-space: nowrap; }
.filter-row th { padding: 8px 16px; border-bottom: 2px solid #f1f5f9; }
.filter-row input, .filter-select { width: 100%; padding: 8px 12px; font-size: 12px; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; transition: border-color .2s; }
.filter-row input:focus, .filter-select:focus { border-color: #4f46e5; }
.data-table td { padding: 16px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; background: #ffffff; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #f8fafc; }
.cell-bold { font-weight: 600; color: #4f46e5; }
.cell-muted { color: #64748b; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-date { color: #475569; font-size: 13px; white-space: nowrap; }
.cell-price { color: #16a34a; font-weight: 600; white-space: nowrap; }

.btn-detail { display: inline-block; color: #1d4ed8; font-weight: 600; text-decoration: none; background: #eff6ff; padding: 6px 12px; border-radius: 8px; transition: all 0.2s ease; }
.btn-detail:hover { background: #dbeafe; color: #1e40af; }

/* Pagination styling */
.pagination-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; margin-top: 8px; flex-wrap: wrap; gap: 12px; }
.pagination-controls { display: flex; align-items: center; gap: 12px; }
.btn-page { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; cursor: pointer; color: #0f172a; font-weight: 600; transition: all .2s; }
.btn-page:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
.page-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; outline: none; cursor: pointer; }

.empty-table-cell {
  text-align: center;
  padding: 48px 16px !important;
  color: #64748b;
  font-style: italic;
  background: #ffffff !important;
}

/* ─── Desktop/Mobile view toggles ─── */
.desktop-view {
  display: block;
}
.mobile-view {
  display: none;
}

/* ─── Mobile Pagination ─── */
.mobile-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 4px;
  font-size: 14px;
  color: #475569;
}
.mobile-page-info {
  font-weight: 600;
}
.mobile-page-btns {
  display: flex;
  gap: 8px;
}
.mobile-page-btns .btn-page {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 10px;
}

/* ─── Mobile responsive ─── */
@media (max-width: 768px) {
  .dashboard {
    gap: 14px;
  }

  .desktop-view {
    display: none !important;
  }
  .mobile-view {
    display: block !important;
  }

  .main-tabs-wrapper {
    display: none;
  }

  .main-tab-btn {
    padding: 14px;
    font-size: 15px;
    border-radius: 12px;
  }

  .tabs-wrapper {
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 14px;
  }

  .tabs {
    width: 100%;
  }

  .tab-btn {
    flex: 1;
    justify-content: center;
    padding: 10px 12px;
    font-size: 13px;
  }

  .filter-inline {
    width: 100%;
  }

  .filter-inline select {
    flex: 1;
    padding: 10px 12px;
    font-size: 14px;
    border-radius: 10px;
  }

  .modal-content {
    width: min(360px, 92%);
    padding: 28px 20px;
    border-radius: 20px;
  }
}
</style>
