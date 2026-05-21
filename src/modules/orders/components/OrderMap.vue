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

const etaText = ref("-");
const distanceText = ref("-");
const routeLayer = shallowRef<L.GeoJSON | null>(null);
const customerMarker = shallowRef<L.Marker | null>(null);

const geocodeAddress = async (address: string) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Geocoding failed", err);
  }
  // Mock fallback location if not found (Jakarta)
  return { lat: -6.200000, lng: 106.816666 };
};

const fetchRoute = async (start: [number, number], end: [number, number]) => {
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.code === "Ok" && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry
      };
    }
  } catch (err) {
    console.error("OSRM failed", err);
  }
  return null;
};

const updateMarker = async (data: Order | null) => {
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
    </div>`,
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

  // Geocode customer location if not already
  if (!customerMarker.value) {
    let coords: { lat: number, lng: number } | null = null;
    
    // Gunakan GPS asli pelanggan jika ada!
    if (data.customer_lat && data.customer_lng) {
      coords = { lat: data.customer_lat, lng: data.customer_lng };
    } else if (data.address) {
      coords = await geocodeAddress(data.address);
    }

    if (coords && map.value) {
      const customerIcon = L.divIcon({
        html: `<div style="background:#dc2626; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
        className: 'customer-pin',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      customerMarker.value = L.marker([coords.lat, coords.lng], { icon: customerIcon })
        .addTo(map.value)
        .bindPopup("Lokasi Pelanggan");
    }
  }

  // Draw Route & Calculate ETA
  if (customerMarker.value) {
    const start: [number, number] = position;
    const end: [number, number] = [customerMarker.value.getLatLng().lat, customerMarker.value.getLatLng().lng];
    const route = await fetchRoute(start, end);
    
    if (route && map.value) {
      distanceText.value = (route.distance / 1000).toFixed(1) + " Km";
      etaText.value = Math.ceil(route.duration / 60) + " Menit";
      
      if (routeLayer.value) {
        map.value.removeLayer(routeLayer.value);
      }
      
      routeLayer.value = L.geoJSON(route.geometry as any, {
        style: { color: '#3b82f6', weight: 4, opacity: 0.8 }
      }).addTo(map.value);
      
      if (autoFollow.value) {
        map.value.fitBounds(routeLayer.value.getBounds(), { padding: [50, 50] });
      }
    }
  } else if (autoFollow.value && map.value) {
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
      <div class="header-right">
        <label class="toggle">
          <input v-model="autoFollow" type="checkbox" />
          Auto-follow
        </label>
      </div>
    </header>

    <div class="eta-panel" v-if="distanceText !== '-'">
      <div class="eta-item">
        <span class="eta-label">Jarak</span>
        <span class="eta-val">{{ distanceText }}</span>
      </div>
      <div class="eta-item">
        <span class="eta-label">Estimasi Tiba</span>
        <span class="eta-val highlight">{{ etaText }}</span>
      </div>
    </div>

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

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
}

.eta-panel {
  display: flex;
  gap: 20px;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.eta-item {
  display: flex;
  flex-direction: column;
}

.eta-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.eta-val {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 4px;
}

.eta-val.highlight {
  color: #2563eb;
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
