<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Order } from "../types";
import { fetchOrderById, subscribeOrder } from "../services/orderService";

const props = defineProps<{
  orders: Order[];
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const map = shallowRef<L.Map | null>(null);
const markers = shallowRef<Record<string, L.Marker>>({});
const autoFollow = ref(true);
const trackingOrders = ref<Record<string, Order>>({});
const loading = ref(true);

let unsubscribes: Record<string, () => void> = {};

// Helper to format coordinates
const getCoordsText = (data: Order | null) => {
  if (!data || data.lat === null || data.lng === null) return "-";
  return `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`;
};

const updateMarker = (data: Order | null) => {
  if (!data || data.lat === null || data.lng === null || !map.value) {
    return;
  }

  const markerIcon = L.divIcon({
    html: `<div class="truck-pin">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
      <div class="pin-label">${data.notes ? data.notes.substring(0, 10) : 'Truk'}</div>
    </div>`,
    className: "custom-truck-pin",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  const position: [number, number] = [data.lat, data.lng];

  if (!markers.value[data.id]) {
    markers.value[data.id] = L.marker(position, { icon: markerIcon })
      .addTo(map.value)
      .bindPopup(`<b>${data.notes || 'Truk'}</b><br>Status: ${data.status}`);
  } else {
    markers.value[data.id].setLatLng(position);
    markers.value[data.id].setIcon(markerIcon);
    markers.value[data.id].setPopupContent(`<b>${data.notes || 'Truk'}</b><br>Status: ${data.status}`);
  }

  if (autoFollow.value) {
    const bounds = L.latLngBounds(Object.values(markers.value).map(m => m.getLatLng()));
    if (bounds.isValid()) {
      map.value.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }
};

const setupTracking = async () => {
  // Clear old subs
  Object.values(unsubscribes).forEach((unsub) => unsub());
  unsubscribes = {};
  
  // Clear old markers
  if (map.value) {
    Object.values(markers.value).forEach((m) => m.remove());
  }
  markers.value = {};
  trackingOrders.value = {};

  if (!props.orders || props.orders.length === 0) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    for (const order of props.orders) {
      const liveOrder = await fetchOrderById(order.id);
      if (liveOrder) {
        trackingOrders.value[order.id] = liveOrder;
        updateMarker(liveOrder);
      }

      unsubscribes[order.id] = subscribeOrder(order.id, (updatedOrder) => {
        trackingOrders.value[order.id] = updatedOrder;
        updateMarker(updatedOrder);
      });
    }
  } catch (error) {
    console.error("Failed to load tracking data", error);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (!mapEl.value) {
    return;
  }

  const mapInstance = L.map(mapEl.value).setView([-6.2, 106.816666], 13);
  map.value = mapInstance;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "(c) OpenStreetMap",
  }).addTo(mapInstance);

  await setupTracking();
});

watch(() => props.orders, () => {
  setupTracking();
}, { deep: true });

onBeforeUnmount(() => {
  Object.values(unsubscribes).forEach((unsub) => unsub());
  unsubscribes = {};

  if (map.value) {
    map.value.remove();
    map.value = null;
  }
});
</script>

<template>
  <section class="map-card">
    <header class="map-header">
      <div>
        <h3>Live Tracking ({{ orders.length }} Truk)</h3>
        <p>Status perjalanan pengiriman air kamu.</p>
      </div>
      <label class="toggle">
        <input v-model="autoFollow" type="checkbox" />
        Auto-follow
      </label>
    </header>

    <div class="map-wrapper">
      <div ref="mapEl" class="map"></div>
      <div v-if="loading" class="map-overlay">Memuat tracking...</div>
      <div v-else-if="Object.keys(markers).length === 0" class="map-overlay">Belum ada truk yang mengirim lokasi.</div>
    </div>

    <footer class="map-footer">
      <div v-for="order in props.orders" :key="order.id">
        <span><b>{{ order.notes || 'Truk' }}:</b> {{ getCoordsText(trackingOrders[order.id] || order) }}</span>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.map-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.map-header h3 {
  margin: 0;
  font-size: 18px;
}

.map-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
}

.map-wrapper {
  position: relative;
}

.map {
  height: 360px;
  width: 100%;
  border-radius: 12px;
}

.map-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
  color: #fff;
  font-weight: 600;
  border-radius: 12px;
  text-align: center;
  padding: 16px;
  z-index: 999;
}

.map-footer {
  margin-top: 12px;
  font-size: 13px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.custom-truck-pin) {
  background: transparent;
  border: none;
}

:deep(.truck-pin) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0f172a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.35);
  position: relative;
}

:deep(.pin-label) {
  position: absolute;
  bottom: -20px;
  background: #fff;
  color: #0f172a;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
</style>
