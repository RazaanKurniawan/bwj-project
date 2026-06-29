<script setup lang="ts">
import { ref, computed, onMounted, shallowRef } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Order, PaymentMethod } from "../types";
import { createOrder } from "../services/orderService";
import CustomSelect from "../../shared/components/CustomSelect.vue";
import { formatRupiah, getPricePerTank, calculateDistance } from "../utils/pricing";

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
const volume = ref("Air Pam");
const truckCount = ref<number | string>(1);
const customTruckCount = ref<number>(1);
const isCustomTruck = ref(false);
const notes = ref("");
const paymentMethod = ref<PaymentMethod>("cash");

const gettingLocation = ref(false);
const locError = ref("");
const locSuccess = ref(false);
const customerLat = ref<number | null>(null);
const customerLng = ref<number | null>(null);

const mapEl = ref<HTMLDivElement | null>(null);
const map = shallowRef<L.Map | null>(null);
const marker = shallowRef<L.Marker | null>(null);

const DEPOT_LAT = -6.432513175969628;
const DEPOT_LNG = 106.88722928789123;

const estQty = computed(() => isCustomTruck.value ? customTruckCount.value : Number(truckCount.value));
const pricePerTank = computed(() => getPricePerTank(volume.value));
const estBase = computed(() => estQty.value * pricePerTank.value);
const estDist = computed(() => {
  if (customerLat.value && customerLng.value) {
    return calculateDistance(DEPOT_LAT, DEPOT_LNG, customerLat.value, customerLng.value).toFixed(1);
  }
  return "0.0";
});
const estDelivery = computed(() => {
  if (customerLat.value && customerLng.value) {
    const dist = calculateDistance(DEPOT_LAT, DEPOT_LNG, customerLat.value, customerLng.value);
    return Math.round(dist * 5000);
  }
  return 0;
});
const estTotal = computed(() => estBase.value + estDelivery.value);

const initMap = () => {
  if (!mapEl.value) return;
  const initialPos: [number, number] = [-6.432513175969628, 106.88722928789123]; // BWJ Depot

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
  volume.value = "Air Pam";
  truckCount.value = 1;
  customTruckCount.value = 1;
  isCustomTruck.value = false;
  notes.value = "";
  paymentMethod.value = "cash";
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
  const count = isCustomTruck.value ? customTruckCount.value : Number(truckCount.value);
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
        payment_method: paymentMethod.value,
        payment_status: "belum_bayar",
        payment_proof_url: null,
        payment_verified_at: null,
        payment_verified_by: null,
        payment_amount: estTotal.value,
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
          <span>Jenis Air</span>
          <CustomSelect
            v-model="volume"
            :options="[
              { label: 'Air Pam', value: 'Air Pam' },
              { label: 'Air Minum', value: 'Air Minum' },
            ]"
          />
        </label>
        <label class="field">
          <span>Jumlah Truk</span>
          <CustomSelect
            v-if="!isCustomTruck"
            v-model="truckCount"
            :options="[
              ...Array.from({ length: 10 }, (_, i) => ({ label: `${i + 1} Truk`, value: i + 1 })),
              { label: 'Custom...', value: 'custom' },
            ]"
            @update:modelValue="(val: any) => { if (val === 'custom') { isCustomTruck = true; truckCount = 'custom'; } }"
          />
          <div v-else class="custom-truck-input">
            <input
              type="number"
              v-model.number="customTruckCount"
              min="1"
              max="100"
              placeholder="Jumlah truk"
            />
            <button type="button" class="btn-reset-truck" @click="isCustomTruck = false; truckCount = 1">
              ✕
            </button>
          </div>
        </label>
      </div>
      
      <div v-if="customerLat && customerLng" class="estimation-box">
        <h4 class="est-title">🧾 Rincian Estimasi Harga</h4>
        <div class="est-row">
          <span class="est-label">Harga Dasar ({{ estQty }} Truk &times; {{ formatRupiah(pricePerTank) }})</span>
          <span class="est-value">{{ formatRupiah(estBase) }}</span>
        </div>
        <div class="est-row">
          <span class="est-label">Biaya Pengiriman ({{ estDist }} km &times; Rp 5.000)</span>
          <span class="est-value">{{ formatRupiah(estDelivery) }}</span>
        </div>
        <div class="est-divider"></div>
        <div class="est-row est-total">
          <span class="est-label">Total Estimasi</span>
          <span class="est-value">{{ formatRupiah(estTotal) }}</span>
        </div>
        <p class="est-note">*Ini hanya estimasi kasar. Harga final dapat berbeda.</p>
      </div>

      <!-- Payment Method Selector -->
      <div class="field payment-field">
        <span>💰 Metode Pembayaran</span>
        <div class="payment-options">
          <label
            class="payment-option"
            :class="{ active: paymentMethod === 'cash' }"
          >
            <input type="radio" v-model="paymentMethod" value="cash" />
            <div class="payment-option-content">
              <div class="payment-icon">💵</div>
              <div class="payment-info">
                <strong>Cash (COD)</strong>
                <span>Bayar ke supir saat tiba</span>
              </div>
            </div>
          </label>
          <label
            class="payment-option"
            :class="{ active: paymentMethod === 'transfer' }"
          >
            <input type="radio" v-model="paymentMethod" value="transfer" />
            <div class="payment-option-content">
              <div class="payment-icon">🏦</div>
              <div class="payment-info">
                <strong>Transfer Bank</strong>
                <span>Bayar dulu, baru diproses</span>
              </div>
            </div>
          </label>
        </div>
        <div v-if="paymentMethod === 'transfer'" class="transfer-info-box">
          <p class="transfer-title">📋 Info Rekening Tujuan</p>
          <div class="bank-detail">
            <span class="bank-label">Bank</span>
            <span class="bank-value">BCA</span>
          </div>
          <div class="bank-detail">
            <span class="bank-label">No. Rekening</span>
            <span class="bank-value">123-456-7890</span>
          </div>
          <div class="bank-detail">
            <span class="bank-label">Atas Nama</span>
            <span class="bank-value">PT Bintang Water Jaya</span>
          </div>
          <p class="transfer-note">⚠️ Pesanan baru diproses setelah bukti transfer diverifikasi admin.</p>
        </div>
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
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

@media (max-width: 768px) {
  .form {
    padding-bottom: 80px;
  }
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

.error-sm { color: #dc2626; font-size: 13px; margin: 6px 0 0; }
.success-sm { color: #16a34a; font-size: 13px; margin: 6px 0 0; }

.estimation-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin: 4px 0 16px;
}
.est-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.est-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #475569;
}
.est-row:last-child {
  margin-bottom: 0;
}
.est-divider {
  height: 1px;
  background: #cbd5e1;
  margin: 12px 0;
}
.est-total {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}
.est-note {
  font-size: 11px;
  color: #94a3b8;
  margin: 12px 0 0;
  text-align: right;
  font-style: italic;
}

.row-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.custom-truck-input {
  display: flex;
  gap: 6px;
  align-items: center;
}

.custom-truck-input input {
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.custom-truck-input input:focus {
  border-color: #0f172a;
}

.btn-reset-truck {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-reset-truck:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

/* ─── Payment Selector ─── */
.payment-field {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.payment-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.payment-option {
  position: relative;
  cursor: pointer;
}

.payment-option input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.payment-option-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  transition: all 0.2s;
}

.payment-option.active .payment-option-content {
  border-color: #0f172a;
  background: #f0f9ff;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.payment-option:hover .payment-option-content {
  border-color: #94a3b8;
}

.payment-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-info strong {
  font-size: 13px;
  color: #0f172a;
}

.payment-info span {
  font-size: 11px;
  color: #64748b;
}

.transfer-info-box {
  margin-top: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 14px;
}

.transfer-title {
  margin: 0 0 10px;
  font-weight: 700;
  font-size: 13px;
  color: #92400e;
}

.bank-detail {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px dashed #fde68a;
}

.bank-detail:last-of-type {
  border-bottom: none;
}

.bank-label {
  color: #92400e;
}

.bank-value {
  font-weight: 700;
  color: #78350f;
}

.transfer-note {
  margin: 10px 0 0;
  font-size: 11px;
  color: #b45309;
  font-style: italic;
}
</style>
