<script setup lang="ts">
import { onMounted, ref, onUnmounted } from "vue";
import type { Order } from "../../orders/types";
import { supabase } from "../../core/supabaseClient";
import { fetchDrivers } from "../../auth/services/profileService";
import type { Profile } from "../../auth/types";
import OrderMap from "../../orders/components/OrderMap.vue";

interface ActiveDriver {
  driver: Profile;
  orders: Order[];
  latestLat: number | null;
  latestLng: number | null;
}

const activeDrivers = ref<ActiveDriver[]>([]);
const loading = ref(true);
const errorMsg = ref("");

let channel: ReturnType<typeof supabase.channel> | null = null;
const activeMapDriverId = ref<string | null>(null);

const loadActiveDrivers = async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    const drivers = await fetchDrivers();

    // Fetch orders that are actively being delivered (status = dikirim or diproses)
    const { data: activeOrders, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["diproses", "dikirim"])
      .not("assigned_driver_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const driverMap = new Map<string, ActiveDriver>();

    for (const order of (activeOrders ?? []) as Order[]) {
      const driverId = order.assigned_driver_id;
      if (!driverId) continue;

      if (!driverMap.has(driverId)) {
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
          driverMap.set(driverId, { driver, orders: [], latestLat: null, latestLng: null });
        }
      }

      const entry = driverMap.get(driverId);
      if (entry) {
        entry.orders.push(order);
        if (entry.latestLat === null && order.lat !== null) {
          entry.latestLat = order.lat;
          entry.latestLng = order.lng;
        }
      }
    }

    activeDrivers.value = Array.from(driverMap.values());
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal memuat data supir.";
  } finally {
    loading.value = false;
  }
};

const formatDate = (v: string | null) => v ? new Date(v).toLocaleString() : "-";

const getStatusColor = (status: string) => {
  switch (status) {
    case "dikirim": return { bg: "#dbeafe", color: "#1d4ed8", label: "DIKIRIM" };
    case "diproses": return { bg: "#fef3c7", color: "#d97706", label: "DIPROSES" };
    default: return { bg: "#e2e8f0", color: "#475569", label: status.toUpperCase() };
  }
};

const toggleMap = (driverId: string) => {
  activeMapDriverId.value = activeMapDriverId.value === driverId ? null : driverId;
};

onMounted(() => {
  loadActiveDrivers();

  // Subscribe to real-time order updates
  channel = supabase
    .channel("admin-tracking")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => { loadActiveDrivers(); }
    )
    .subscribe();
});

onUnmounted(() => {
  if (channel) {
    supabase.removeChannel(channel);
  }
});
</script>

<template>
  <div class="tracking-page">
    <header class="section-header">
      <div>
        <h2>Lacak Supir</h2>
        <p>Pantau supir yang sedang menjalankan pengiriman secara real-time.</p>
      </div>
      <button class="btn-refresh" @click="loadActiveDrivers" :disabled="loading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        Refresh
      </button>
    </header>

    <p v-if="loading" class="info">Memuat data supir aktif...</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <template v-if="!loading && !errorMsg">
      <div v-if="activeDrivers.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <h3>Tidak Ada Supir Aktif</h3>
        <p>Saat ini tidak ada supir yang sedang menjalankan pengiriman.</p>
      </div>

      <div v-else class="driver-grid">
        <div v-for="entry in activeDrivers" :key="entry.driver.id" class="driver-card">
          <div class="driver-header">
            <div class="driver-avatar">{{ entry.driver.name?.charAt(0)?.toUpperCase() ?? "?" }}</div>
            <div class="driver-info">
              <h3>{{ entry.driver.name ?? "Tanpa Nama" }}</h3>
              <span class="driver-phone">{{ entry.driver.phone ?? "-" }}</span>
            </div>
            <div class="driver-actions">
              <div class="order-badge">{{ entry.orders.length }} pesanan</div>
              <button class="btn-map" v-if="entry.latestLat && entry.latestLng" @click="toggleMap(entry.driver.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                {{ activeMapDriverId === entry.driver.id ? 'Tutup Map' : 'Lacak Supir' }}
              </button>
              <span v-else class="no-gps">Belum ada sinyal GPS</span>
            </div>
          </div>

          <div class="order-list">
            <div v-for="order in entry.orders" :key="order.id" class="order-item">
              <div class="order-item-header">
                <span class="customer-name">{{ order.customer_name }}</span>
                <span
                  class="status-chip"
                  :style="{ background: getStatusColor(order.status).bg, color: getStatusColor(order.status).color }"
                >{{ getStatusColor(order.status).label }}</span>
              </div>
              <div class="order-item-details">
                <div class="detail-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{{ order.address }}</span>
                </div>
                <div class="detail-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>{{ formatDate(order.schedule_at) }}</span>
                </div>
                <div class="detail-row" v-if="order.lat && order.lng">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                  <span class="gps-coord">{{ order.lat.toFixed(5) }}, {{ order.lng.toFixed(5) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeMapDriverId === entry.driver.id && entry.orders[0]" class="driver-map-container">
            <OrderMap :order-id="entry.orders[0].id" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tracking-page { display: grid; gap: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.section-header h2 { margin: 0; font-size: 22px; }
.section-header p { margin: 6px 0 0; color: #64748b; }
.info { color: #64748b; }
.error { color: #dc2626; background: #fef2f2; padding: 12px 16px; border-radius: 8px; font-weight: 500; }

.btn-refresh { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; color: #0f172a; font-weight: 600; font-size: 13px; cursor: pointer; transition: all .2s; }
.btn-refresh:hover { background: #f8fafc; border-color: #94a3b8; }
.btn-refresh:disabled { opacity: 0.5; cursor: wait; }

.empty-state { text-align: center; padding: 60px 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05); }
.empty-icon { display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: #f1f5f9; border-radius: 50%; color: #94a3b8; margin-bottom: 16px; }
.empty-state h3 { margin: 0 0 8px; font-size: 18px; color: #0f172a; }
.empty-state p { margin: 0; color: #64748b; font-size: 14px; }

.driver-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); }

.driver-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(15,23,42,.06); transition: box-shadow .2s; }
.driver-card:hover { box-shadow: 0 8px 24px rgba(15,23,42,.1); }

.driver-header { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
.driver-avatar { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0f172a, #334155); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0; }
.driver-info { flex: 1; min-width: 0; }
.driver-info h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
.driver-phone { font-size: 12px; color: #64748b; }
.driver-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.order-badge { background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.no-gps { font-size: 11px; color: #94a3b8; font-style: italic; white-space: nowrap; }

.order-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.order-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
.order-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.customer-name { font-weight: 600; color: #0f172a; font-size: 14px; }
.status-chip { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.order-item-details { display: flex; flex-direction: column; gap: 6px; }
.detail-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #475569; }
.detail-row svg { flex-shrink: 0; margin-top: 1px; }
.gps-coord { font-family: monospace; font-size: 12px; color: #64748b; }
.btn-map { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font-weight: 600; font-size: 12px; cursor: pointer; transition: all .2s; }
.btn-map:hover { background: #f1f5f9; border-color: #94a3b8; }

.driver-map-container {
  margin-top: 16px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}

@media (max-width: 768px) {
  .tracking-page { gap: 14px; }
  .section-header { flex-direction: column; align-items: flex-start; }
  .section-header h2 { font-size: 20px; }
  .btn-refresh { width: 100%; justify-content: center; }
  .driver-grid { grid-template-columns: 1fr; }
  .driver-card { padding: 16px; }
}
</style>
