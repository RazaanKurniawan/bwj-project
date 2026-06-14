<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { debounce } from "lodash-es";
import type { Order, OrderStatus } from "../types";
import {
  claimOrder,
  fetchOrdersPaginated,
  fetchDriverOrders,
  updateOrderLocation,
  updateOrderStatus,
  uploadProof
} from "../services/orderService";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import CustomSelect from "../../shared/components/CustomSelect.vue";
import { useAuthStore } from "../../auth/stores/authStore";

const authStore = useAuthStore();
const activeAssigned = ref<Order[]>([]);
const pendingApproval = ref<Order[]>([]);
const availableOrders = ref<Order[]>([]);
const historyOrders = ref<Order[]>([]);

const tableFilters = reactive({ customerName: "", address: "", volume: "", scheduleAt: "", status: "all" });
const currentPage = ref(1);
const limit = ref(10);
const totalCount = ref(0);
const totalPages = ref(1);
const statusUpdates = reactive<Record<string, OrderStatus>>({});
const loading = ref(true);
const errorMsg = ref("");
const successMsg = ref("");
const activeTab = ref<"active" | "history">("active");
const showWarningModal = ref(false);

const showConfirmModal = ref(false);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmAction = ref<(() => void) | (() => Promise<void>) | null>(null);

const showProofModal = ref(false);
const proofTarget = ref<string | null>(null);
const proofFile = ref<File | null>(null);
const uploadingProof = ref(false);

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    proofFile.value = target.files[0] || null;
  }
};

const handleUploadProof = async () => {
  if (!proofTarget.value) return;
  
  const orderObj = activeAssigned.value.find(o => o.id === proofTarget.value);
  
  uploadingProof.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  
  try {
    if (proofFile.value) {
      await uploadProof(proofTarget.value, proofFile.value);
    } else {
      await updateOrderStatus(proofTarget.value, "selesai");
    }
    showProofModal.value = false;
    proofTarget.value = null;
    proofFile.value = null;
    
    await refresh();

    successMsg.value = "Pesanan berhasil diselesaikan.";
    
    setTimeout(() => { successMsg.value = ""; errorMsg.value = ""; }, 5000);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengunggah foto.";
  } finally {
    uploadingProof.value = false;
  }
};

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

const statusOptions: OrderStatus[] = ["menunggu", "menunggu_persetujuan", "diproses", "dikirim", "selesai", "batal"];
const statusSelectOptions = computed(() => statusOptions.map((s) => ({ label: s, value: s })));
const limitOptions = [{ label: "5", value: 5 }, { label: "10", value: 10 }, { label: "20", value: 20 }];

const hasActiveOrder = computed(() => {
  return activeAssigned.value.length > 0;
});

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
};

const fetchPaginatedData = async () => {
  const user = authStore.user.value;
  if (!user) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    if (activeTab.value === "active") {
      const res = await fetchOrdersPaginated(currentPage.value, limit.value, {
        is_unassigned: true,
        customer_name: tableFilters.customerName || undefined,
        address: tableFilters.address || undefined,
        volume: tableFilters.volume || undefined,
        schedule_at: tableFilters.scheduleAt || undefined,
      });
      availableOrders.value = res.data;
      totalCount.value = res.count;
      totalPages.value = Math.ceil(res.count / limit.value) || 1;
    } else {
      const res = await fetchOrdersPaginated(currentPage.value, limit.value, {
        assigned_driver_id: user.id,
        status: tableFilters.status !== "all" ? tableFilters.status : ["selesai", "batal"],
        customer_name: tableFilters.customerName || undefined,
        address: tableFilters.address || undefined,
        volume: tableFilters.volume || undefined,
        schedule_at: tableFilters.scheduleAt || undefined,
      });
      historyOrders.value = res.data;
      totalCount.value = res.count;
      totalPages.value = Math.ceil(res.count / limit.value) || 1;
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal memuat data paginasi.";
  } finally {
    loading.value = false;
  }
};

const debouncedFetch = debounce(() => {
  currentPage.value = 1;
  fetchPaginatedData();
}, 500);

watch(tableFilters, () => debouncedFetch(), { deep: true });
watch(limit, () => { currentPage.value = 1; fetchPaginatedData(); });
watch(activeTab, () => {
  currentPage.value = 1;
  tableFilters.customerName = "";
  tableFilters.address = "";
  tableFilters.volume = "";
  tableFilters.scheduleAt = "";
  tableFilters.status = "all";
  fetchPaginatedData();
});

const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; fetchPaginatedData(); } };
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; fetchPaginatedData(); } };

const refresh = async () => {
  const user = authStore.user.value;
  if (!user) return;
  loading.value = true;
  try {
    const assigned = await fetchDriverOrders(user.id);
    activeAssigned.value = assigned.filter(o => o.status !== "selesai" && o.status !== "batal" && o.status !== "menunggu");
    pendingApproval.value = assigned.filter(o => o.status === "menunggu");
    activeAssigned.value.forEach(order => { statusUpdates[order.id] = order.status; });
    await fetchPaginatedData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal memuat data aktif.";
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
    "Pesanan ini akan menunggu persetujuan admin terlebih dahulu. Apakah kamu yakin ingin mengajukan pengambilan pesanan ini?",
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

const advanceStatus = (orderId: string, currentStatus: OrderStatus) => {
  const targetStatus = currentStatus === "diproses" ? "dikirim" : "selesai";

  if (targetStatus === "selesai") {
    proofTarget.value = orderId;
    proofFile.value = null;
    showProofModal.value = true;
    return;
  }

  triggerConfirmation(
    "Konfirmasi Perbarui Status",
    `Apakah kamu yakin ingin memperbarui status pesanan menjadi "${targetStatus.toUpperCase()}"?`,
    async () => {
      errorMsg.value = "";
      successMsg.value = "";
      try {
        await updateOrderStatus(orderId, targetStatus);
        await refresh();

        successMsg.value = `Status pesanan berhasil diperbarui menjadi "${targetStatus}".`;
        setTimeout(() => { successMsg.value = ""; errorMsg.value = ""; }, 5000);
      } catch (error) {
        errorMsg.value = error instanceof Error ? error.message : "Gagal update status.";
      }
    }
  );
};

const handleSendLocation = (orderId: string) => {
  const orderObj = activeAssigned.value.find(o => o.id === orderId);
  if (orderObj && orderObj.status !== "dikirim") {
    errorMsg.value = "Ubah status pesanan menjadi 'Dikirim' terlebih dahulu sebelum membagikan lokasi GPS.";
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { errorMsg.value = ""; }, 4000);
    return;
  }

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

const openGoogleMaps = (order: Order) => {
  const query = encodeURIComponent(order.address);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
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
    <p v-if="successMsg" class="success-toast">{{ successMsg }}</p>
    <p v-if="loading" class="info">Memuat data supir...</p>

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
            <span v-if="activeAssigned.length || availableOrders.length" class="tab-count">{{ activeAssigned.length + availableOrders.length }}</span>
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
      </div>

      <!-- ====== ACTIVE TAB ====== -->
      <template v-if="activeTab === 'active'">
        <!-- ====== PESANAN KAMU (Table) ====== -->
        <section class="card">
          <header class="card-header">
            <h3>Pesanan Aktif</h3>
            <p>Pesanan yang sedang kamu tangani.</p>
          </header>

          <div v-if="activeAssigned.length === 0" class="empty">Belum ada pesanan aktif.</div>

          <template v-else>
            <!-- Desktop Table -->
            <div class="table-responsive desktop-only">
              <table class="order-table">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Alamat</th>
                    <th>Jenis Air</th>
                    <th>Jadwal</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in activeAssigned" :key="order.id">
                    <td class="cell-bold">{{ order.customer_name }}</td>
                    <td class="cell-muted" :title="order.address">{{ order.address }}</td>
                    <td>{{ order.volume }}</td>
                    <td class="cell-date">{{ formatDate(order.schedule_at) }}</td>
                    <td>
                      <OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" />
                    </td>
                    <td class="cell-actions">
                      <button 
                        v-if="order.status === 'diproses' || order.status === 'dikirim'"
                        class="btn-primary" 
                        @click="advanceStatus(order.id, order.status)"
                      >
                        {{ order.status === 'diproses' ? 'Kirim Pesanan' : 'Selesaikan' }}
                      </button>
                      <button class="btn-outline icon-btn" @click="handleSendLocation(order.id)" title="Update GPS Supir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                      </button>
                      <button class="btn-outline map-btn icon-btn" @click="openGoogleMaps(order)" title="Navigasi Pelanggan">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-only">
              <div class="mobile-cards">
                <div v-for="order in activeAssigned" :key="order.id" class="mobile-card">
                  <div class="mc-header">
                    <div class="customer-info">
                      <span class="label">Pelanggan</span>
                      <span class="value">{{ order.customer_name }}</span>
                    </div>
                    <OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" />
                  </div>
                  <div class="mc-body">
                    <div class="info-row">
                      <span class="label">Alamat</span>
                      <span class="value address">{{ order.address }}</span>
                    </div>
                    <div class="info-grid">
                      <div class="info-col">
                        <span class="label">Jenis Air</span>
                        <span class="value">{{ order.volume }}</span>
                      </div>
                      <div class="info-col">
                        <span class="label">Jadwal</span>
                        <span class="value date">{{ formatDate(order.schedule_at) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="mc-footer">
                    <div class="mc-actions" style="width: 100%;">
                      <button 
                        v-if="order.status === 'diproses' || order.status === 'dikirim'"
                        class="btn-primary flex-1" 
                        @click="advanceStatus(order.id, order.status)"
                      >
                        {{ order.status === 'diproses' ? 'Kirim Pesanan' : 'Selesaikan' }}
                      </button>
                      <button class="btn-outline icon-btn" @click="handleSendLocation(order.id)" title="Update GPS Supir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                      </button>
                      <button class="btn-outline map-btn icon-btn" @click="openGoogleMaps(order)" title="Navigasi Pelanggan">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </section>

        <!-- ====== MENUNGGU PERSETUJUAN ====== -->
        <section class="card" v-if="pendingApproval.length">
          <header class="card-header">
            <h3>⏳ Menunggu Persetujuan Admin</h3>
            <p>Pesanan yang kamu ajukan dan sedang menunggu persetujuan admin.</p>
          </header>

          <div class="mobile-cards" style="margin-top: 12px;">
            <div v-for="order in pendingApproval" :key="order.id" class="mobile-card pending-card">
              <div class="mc-header">
                <div class="customer-info">
                  <span class="label">Pelanggan</span>
                  <span class="value">{{ order.customer_name }}</span>
                </div>
                <OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" />
              </div>
              <div class="mc-body">
                <div class="info-row">
                  <span class="label">Alamat</span>
                  <span class="value address">{{ order.address }}</span>
                </div>
                <div class="info-grid">
                  <div class="info-col">
                    <span class="label">Jenis Air</span>
                    <span class="value">{{ order.volume }}</span>
                  </div>
                  <div class="info-col">
                    <span class="label">Jadwal</span>
                    <span class="value date">{{ formatDate(order.schedule_at) }}</span>
                  </div>
                </div>
              </div>
              <div class="mc-footer pending-footer">
                <span class="pending-info">🕐 Menunggu admin untuk menyetujui pengambilan pesanan ini.</span>
              </div>
            </div>
          </div>
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
                  <th>Jenis Air</th>
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
                    <OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" />
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
                  <OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" />
                </div>
                <div class="mc-body">
                  <div class="info-row">
                    <span class="label">Alamat</span>
                    <span class="value address">{{ order.address }}</span>
                  </div>
                  <div class="info-grid">
                    <div class="info-col">
                      <span class="label">Jenis Air</span>
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

          <!-- Pagination Controls for Available Orders -->
          <div class="pagination-footer" v-if="availableOrders.length > 0">
            <div class="row-count">Menampilkan {{ availableOrders.length }} dari {{ totalCount }} baris data.</div>
            <div class="pagination-controls">
              <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
              <button class="btn-page" :disabled="currentPage === 1" @click="prevPage">&laquo;</button>
              <button class="btn-page" :disabled="currentPage === totalPages" @click="nextPage">&raquo;</button>
              <CustomSelect v-model="limit" :options="limitOptions" class="page-select" :small="true" />
            </div>
          </div>
        </section>
      </template>

      <!-- ====== HISTORY TAB ====== -->
      <template v-if="activeTab === 'history'">
        <!-- ====== RIWAYAT PESANAN ====== -->
        <section class="card">
          <header class="card-header">
            <h3>Riwayat Pesanan</h3>
            <p>Pesanan yang sudah selesai atau dibatalkan.</p>
          </header>

          <!-- Desktop Table -->
            <div class="table-responsive desktop-only">
              <table class="order-table">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Alamat</th>
                    <th>Jenis Air</th>
                    <th>Jadwal</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="historyOrders.length === 0">
                    <td colspan="6" class="empty-table-cell">Belum ada riwayat pesanan.</td>
                  </tr>
                  <template v-else>
                  <tr v-for="order in historyOrders" :key="order.id">
                    <td class="cell-bold">{{ order.customer_name }}</td>
                    <td class="cell-muted" :title="order.address">{{ order.address }}</td>
                    <td>{{ order.volume }}</td>
                    <td class="cell-date">{{ formatDate(order.schedule_at) }}</td>
                    <td><OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" /></td>
                    <td>
                      <router-link :to="{ name: 'order-detail', params: { id: order.id } }" class="btn-detail">Detail</router-link>
                    </td>
                  </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-only">
              <div class="mobile-cards">
                <div v-for="order in historyOrders" :key="order.id" class="mobile-card">
                  <div class="mc-header">
                    <div class="customer-info">
                      <span class="label">Pelanggan</span>
                      <span class="value">{{ order.customer_name }}</span>
                    </div>
                    <OrderStatusBadge :status="order.status === 'menunggu' && order.assigned_driver_id ? 'menunggu_persetujuan' : order.status" />
                  </div>
                  <div class="mc-body">
                    <div class="info-grid">
                      <div class="info-col">
                        <span class="label">Jenis Air</span>
                        <span class="value">{{ order.volume }}</span>
                      </div>
                      <div class="info-col">
                        <span class="label">Jadwal</span>
                        <span class="value date">{{ formatDate(order.schedule_at) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="mc-footer">
                    <router-link :to="{ name: 'order-detail', params: { id: order.id } }" class="btn-detail-mobile">Lihat Detail</router-link>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination Controls for History Orders -->
            <div class="pagination-footer" v-if="historyOrders.length > 0">
              <div class="row-count">Menampilkan {{ historyOrders.length }} dari {{ totalCount }} baris data.</div>
              <div class="pagination-controls">
                <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
                <button class="btn-page" :disabled="currentPage === 1" @click="prevPage">&laquo;</button>
                <button class="btn-page" :disabled="currentPage === totalPages" @click="nextPage">&raquo;</button>
                <CustomSelect v-model="limit" :options="limitOptions" class="page-select" :small="true" />
              </div>
            </div>
        </section>
      </template>
    </template>

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

    <!-- Proof Upload Modal -->
    <div v-if="showProofModal" class="modal-backdrop" @click.self="showProofModal = false">
      <div class="modal-content">
        <h3>Upload Bukti Pengiriman</h3>
        <p class="modal-body-text" style="margin-bottom: 16px;">Pesanan selesai membutuhkan foto bukti pengiriman ke pelanggan.</p>
        <form @submit.prevent="handleUploadProof" class="modal-form">
          <label class="field">
            <span>Ambil Foto / Pilih Galeri (Opsional)</span>
            <input type="file" accept="image/*" capture="environment" @change="handleFileChange" />
          </label>
          <div class="modal-actions">
            <button type="button" class="btn-outline" @click="showProofModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="uploadingProof">
              {{ uploadingProof ? "Mengunggah..." : "Upload & Selesai" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
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
  
  .pagination-footer {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    margin-top: 20px;
    padding-top: 20px;
  }
  
  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
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
  background: #fef2f2;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 500;
}

.success-toast {
  color: #16a34a;
  background: #f0fdf4;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
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
/* Pending Approval Card */
.pending-card {
  border: 1.5px solid #fed7aa;
}

.pending-footer {
  background: #fff7ed;
}

.pending-info {
  font-size: 13px;
  color: #9a3412;
  font-weight: 500;
  line-height: 1.4;
}

</style>
