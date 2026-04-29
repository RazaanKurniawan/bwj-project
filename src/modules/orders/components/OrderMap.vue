<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Order } from "../types";
import { fetchOrderById, subscribeOrder } from "../services/orderService";

const props = defineProps<{
  orderId: string;
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const map = shallowRef<L.Map | null>(null);
const marker = shallowRef<L.Marker | null>(null);
const autoFollow = ref(true);
const order = ref<Order | null>(null);
const loading = ref(true);

let unsubscribe: (() => void) | null = null;

const statusText = computed(() => order.value?.status ?? "Belum ada status");

const coordsText = computed(() => {
  if (!order.value || order.value.lat === null || order.value.lng === null) {
    return "-";
  }

  return `${order.value.lat.toFixed(6)}, ${order.value.lng.toFixed(6)}`;
});

const updateMarker = (data: Order | null) => {
  if (!data || data.lat === null || data.lng === null || !map.value) {
    return;
  }

  const markerIcon = L.divIcon({
    html: "<div class=\"truck-pin\">TRK</div>",
    className: "custom-truck-pin",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  const position: [number, number] = [data.lat, data.lng];

  if (!marker.value) {
    marker.value = L.marker(position, { icon: markerIcon })
      .addTo(map.value)
      .bindPopup("Posisi truk");
  } else {
    marker.value.setLatLng(position);
  }

  if (autoFollow.value) {
    map.value.setView(position, 16);
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

  try {
    order.value = await fetchOrderById(props.orderId);
    updateMarker(order.value);
  } catch (error) {
    console.error("Failed to load order", error);
  } finally {
    loading.value = false;
  }

  unsubscribe = subscribeOrder(props.orderId, (updatedOrder) => {
    order.value = updatedOrder;
    updateMarker(updatedOrder);
  });
});

onBeforeUnmount(() => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

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
        <h3>Live Tracking</h3>
        <p>Status: {{ statusText }}</p>
      </div>
      <label class="toggle">
        <input v-model="autoFollow" type="checkbox" />
        Auto-follow
      </label>
    </header>

    <div class="map-wrapper">
      <div ref="mapEl" class="map"></div>
      <div v-if="loading" class="map-overlay">Memuat tracking...</div>
      <div v-else-if="coordsText === '-'" class="map-overlay">Lokasi belum dikirim.</div>
    </div>

    <footer class="map-footer">
      <span>Koordinat: {{ coordsText }}</span>
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
}

.map-footer {
  margin-top: 12px;
  font-size: 13px;
  color: #64748b;
}

.custom-truck-pin {
  background: transparent;
  border: none;
}

.truck-pin {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0f172a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.35);
}
</style>
