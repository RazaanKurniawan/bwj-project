<script setup lang="ts">
import { ref, onMounted, shallowRef } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Order } from "../types";
import { createOrder } from "../services/orderService";

const props = defineProps<{
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
}>();

const emit = defineEmits<{
  (event: "created", orders: Order[]): void;
}>();

const name = ref(props.customerName ?? "");
const phone = ref(props.customerPhone ?? "");
const address = ref("");
const scheduleAt = ref("");
const volume = ref("8000 Liter");
const truckCount = ref<number | string>(1);
const notes = ref("");

const gettingLocation = ref(false);
const locError = ref("");
const locSuccess = ref(false);
const customerLat = ref<number | null>(null);
const customerLng = ref<number | null>(null);

const mapEl = ref<HTMLDivElement | null>(null);
const map = shallowRef<L.Map | null>(null);
const marker = shallowRef<L.Marker | null>(null);

const initMap = () => {
  if (!mapEl.value) return;
  const initialPos: [number, number] = [-6.200000, 106.816666]; // Default: Jakarta

  const mapInstance = L.map(mapEl.value).setView(initialPos, 12);
  map.value = mapInstance;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "(c) OpenStreetMap",
  }).addTo(mapInstance);

  const customerIcon = L.divIcon({
    html: `<div style="background:#dc2626; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
    className: 'customer-pin',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  marker.value = L.marker(initialPos, { icon: customerIcon, draggable: true })
    .addTo(mapInstance)
    .bindPopup("Geser pin ini ke lokasi tepat rumahmu.")
    .openPopup();

  marker.value.on("dragend", () => {
    const pos = marker.value?.getLatLng();
    if (pos) {
      customerLat.value = pos.lat;
      customerLng.value = pos.lng;
      locSuccess.value = true;
    }
  });

  mapInstance.on("click", (e: L.LeafletMouseEvent) => {
    marker.value?.setLatLng(e.latlng);
    customerLat.value = e.latlng.lat;
    customerLng.value = e.latlng.lng;
    locSuccess.value = true;
  });
};

onMounted(() => {
  setTimeout(() => initMap(), 100);
});

const handleGetLocation = () => {
  if (!("geolocation" in navigator)) {
    locError.value = "Browser kamu tidak mendukung GPS.";
    return;
  }
  
  gettingLocation.value = true;
  locError.value = "";
  locSuccess.value = false;
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      customerLat.value = pos.coords.latitude;
      customerLng.value = pos.coords.longitude;
      locSuccess.value = true;
      gettingLocation.value = false;
      
      if (map.value && marker.value) {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        map.value.setView(latlng, 16);
        marker.value.setLatLng(latlng);
      }
    },
    (err) => {
      locError.value = "Gagal mendeteksi lokasi: " + err.message;
      gettingLocation.value = false;
    },
    { enableHighAccuracy: true }
  );
};

const loading = ref(false);
const errorMsg = ref("");

const resetForm = () => {
  address.value = "";
  scheduleAt.value = "";
  volume.value = "5000 Liter";
  truckCount.value = 1;
  notes.value = "";
};

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = "";

  if (customerLat.value === null || customerLng.value === null) {
    errorMsg.value = "Titik lokasi peta wajib ditentukan! Silakan klik 'Deteksi Lokasi Saya' atau klik area pada peta.";
    loading.value = false;
    return;
  }

  const schedule = scheduleAt.value ? new Date(scheduleAt.value).toISOString() : null;
  const count = Number(truckCount.value);
  const newOrders: Order[] = [];

  try {
    for (let i = 0; i < count; i++) {
      const orderNotes = count > 1 
        ? `${notes.value ? notes.value + ' | ' : ''}Truk ${i + 1} dari ${count}`
        : (notes.value || null);

      const order = await createOrder({
        customer_id: props.customerId,
        customer_name: name.value,
        phone: phone.value,
        address: address.value,
        schedule_at: schedule,
        volume: volume.value,
        notes: orderNotes,
        status: "menunggu",
        truck_id: null,
        assigned_driver_id: null,
        lat: null,
        lng: null,
        customer_lat: customerLat.value,
        customer_lng: customerLng.value,
        accuracy: null,
        proof_url: null,
        rating: null,
        review: null,
      });
      newOrders.push(order);
    }

    resetForm();
    customerLat.value = null;
    customerLng.value = null;
    locSuccess.value = false;
    emit("created", newOrders);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal membuat pesanan.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <section class="card">
    <header>
      <h2>Buat Pesanan Air</h2>
      <p>Isi detail pengiriman agar supir segera berangkat.</p>
    </header>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>Nama</span>
        <input v-model="name" type="text" required />
      </label>
      <label class="field">
        <span>No HP</span>
        <input v-model="phone" type="tel" required />
      </label>
      <label class="field">
        <span>Alamat Lengkap</span>
        <textarea v-model="address" rows="3" placeholder="Tuliskan alamat lengkap dengan patokan" required></textarea>
      </label>

      <div class="field loc-field">
        <span>Pin Lokasi Peta (Wajib)</span>
        <div class="map-picker-wrapper">
          <div ref="mapEl" class="map-picker"></div>
        </div>
        <button type="button" class="btn-outline" @click="handleGetLocation" :disabled="gettingLocation" style="margin-top: 10px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
          {{ gettingLocation ? "Mendeteksi..." : (locSuccess ? "Lokasi Berhasil Dipin" : "Deteksi Lokasi Saya") }}
        </button>
        <p v-if="locError" class="error-sm">{{ locError }}</p>
        <p v-if="locSuccess" class="success-sm">Akurasi routing peta untuk supir akan meningkat!</p>
      </div>

      <label class="field">
        <span>Jadwal</span>
        <input v-model="scheduleAt" type="datetime-local" />
      </label>
      <div class="row-fields">
        <label class="field">
          <span>Volume per Truk</span>
          <select v-model="volume">
            <option>5000 Liter</option>
            <option>8000 Liter</option>
            <option>10000 Liter</option>
            <option>16000 Liter</option>
          </select>
        </label>
        <label class="field">
          <span>Jumlah Truk</span>
          <select v-model="truckCount">
            <option v-for="n in 10" :key="n" :value="n">{{ n }} Truk</option>
          </select>
        </label>
      </div>
      <label class="field">
        <span>Catatan</span>
        <textarea v-model="notes" rows="2" placeholder="Contoh: Tolong hubungi sebelum sampai"></textarea>
      </label>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <button class="btn-primary" type="submit" :disabled="loading">
        {{ loading ? "Menyimpan..." : "Kirim Pesanan" }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

header h2 {
  margin: 0;
  font-size: 20px;
}

header p {
  margin: 6px 0 0;
  color: #64748b;
}

.form {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.field input,
.field select,
.field textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
}

.error {
  color: #dc2626;
  margin: 0;
}

.btn-primary {
  border: none;
  border-radius: 10px;
  background: #0f172a;
  color: #fff;
  padding: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.btn-outline {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  border-radius: 8px;
  padding: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-outline:disabled {
  opacity: 0.7;
  cursor: wait;
}

.loc-field {
  background: #f1f5f9;
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}

.map-picker-wrapper {
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  margin-top: 6px;
}

.map-picker {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.error-sm {
  color: #dc2626;
  font-size: 12px;
  margin: 4px 0 0;
}

.success-sm {
  color: #16a34a;
  font-size: 12px;
  margin: 4px 0 0;
}

.row-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
