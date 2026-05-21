<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import OrderForm from "../components/OrderForm.vue";
import OrderList from "../components/OrderList.vue";
import MultiOrderMap from "../components/MultiOrderMap.vue";
import type { Order } from "../types";
import { fetchCustomerOrders } from "../services/orderService";
import { useAuthStore } from "../../auth/stores/authStore";

const authStore = useAuthStore();
const orders = ref<Order[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const selectedStatus = ref("all");
const activeTab = ref<"active" | "history">("active");

const userId = computed(() => authStore.user.value?.id ?? null);
const customerName = computed(() => authStore.profile.value?.name ?? null);
const customerPhone = computed(() => authStore.profile.value?.phone ?? null);

const activeOrders = computed(() => {
  return orders.value.filter(o => o.status !== "selesai" && o.status !== "batal");
});

const trackableOrders = computed(() => {
  return orders.value.filter(o => o.status === "diproses" || o.status === "dikirim");
});

const historyOrders = computed(() => {
  return orders.value.filter(o => o.status === "selesai" || o.status === "batal");
});

const loadOrders = async () => {
  const uid = userId.value;
  if (!uid) return;

  loading.value = true;
  errorMsg.value = "";

  try {
    orders.value = await fetchCustomerOrders(uid, selectedStatus.value);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengambil pesanan.";
  } finally {
    loading.value = false;
  }
};

const handleCreated = (newOrders: Order[]) => {
  orders.value = [...newOrders, ...orders.value];
};

onMounted(async () => {
  await authStore.initAuth();
  await loadOrders();
});
</script>

<template>
  <div class="dashboard">
    <OrderForm
      v-if="userId"
      :customer-id="userId"
      :customer-name="customerName"
      :customer-phone="customerPhone"
      @created="handleCreated"
    />

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat pesanan...</p>

    <template v-else>
      <MultiOrderMap v-if="trackableOrders.length > 0" :orders="trackableOrders" />

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
          <select id="status-filter" v-model="selectedStatus" @change="loadOrders">
            <option value="all">Semua</option>
            <option value="menunggu">Menunggu</option>
            <option value="diproses">Diproses</option>
            <option value="dikirim">Dikirim</option>
            <option value="selesai">Selesai</option>
            <option value="batal">Batal</option>
          </select>
        </div>
      </div>

      <!-- Active Orders -->
      <template v-if="activeTab === 'active'">
        <OrderList
          :orders="activeOrders"
          title="Pesanan Aktif"
          empty-text="Tidak ada pesanan aktif."
        />
      </template>

      <!-- History -->
      <template v-if="activeTab === 'history'">
        <OrderList
          :orders="historyOrders"
          title="Riwayat Pesanan"
          empty-text="Belum ada riwayat pesanan."
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
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
</style>
