<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import OrderMap from "../components/OrderMap.vue";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import type { Order } from "../types";
import { fetchOrderById, submitReview, updateOrderStatus } from "../services/orderService";
import { fetchProfile } from "../../auth/services/profileService";
import type { Profile } from "../../auth/types";
import { useAuthStore } from "../../auth/stores/authStore";
import { formatRupiah, getPricePerTank, calculateDistance, calculateOrderTotal } from "../utils/pricing";

const route = useRoute();
const { profile } = useAuthStore();
const order = ref<Order | null>(null);
const driverProfile = ref<Profile | null>(null);
const loading = ref(true);
const errorMsg = ref("");

// Review State
const ratingValue = ref(0);
const reviewText = ref("");
const submittingReview = ref(false);
const reviewSuccess = ref(false);


const loadOrder = async () => {
  const orderId = String(route.params.id ?? "");
  if (!orderId) {
    errorMsg.value = "Order tidak ditemukan.";
    loading.value = false;
    return;
  }

  try {
    order.value = await fetchOrderById(orderId);
    // Load driver profile if assigned
    if (order.value?.assigned_driver_id) {
      driverProfile.value = await fetchProfile(order.value.assigned_driver_id);
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengambil order.";
  } finally {
    loading.value = false;
  }
};

const canceling = ref(false);
const showCancelModal = ref(false);

const handleCancelClick = () => {
  showCancelModal.value = true;
};

const confirmCancelOrder = async () => {
  if (!order.value || order.value.status !== 'menunggu') return;

  canceling.value = true;
  errorMsg.value = "";
  try {
    await updateOrderStatus(order.value.id, 'batal');
    order.value.status = 'batal';
    showCancelModal.value = false;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal membatalkan pesanan.";
  } finally {
    canceling.value = false;
  }
};

const handleSubmitReview = async () => {
  if (!order.value || ratingValue.value === 0) return;
  submittingReview.value = true;
  errorMsg.value = "";
  
  try {
    await submitReview(order.value.id, ratingValue.value, reviewText.value || null);
    order.value.rating = ratingValue.value;
    order.value.review = reviewText.value || null;
    reviewSuccess.value = true;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal mengirim ulasan.";
  } finally {
    submittingReview.value = false;
  }
};

const getWaLink = (phone: string) => {
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.substring(1);
  }
  return `https://wa.me/${cleanPhone}`;
};

const DEPOT_LAT = -6.432513175969628;
const DEPOT_LNG = 106.88722928789123;

const getDeliveryFee = (orderObj: Order) => {
  if (orderObj.customer_lat && orderObj.customer_lng) {
    const dist = calculateDistance(DEPOT_LAT, DEPOT_LNG, orderObj.customer_lat, orderObj.customer_lng);
    return Math.round(dist * 5000);
  }
  return 0;
};

onMounted(loadOrder);
</script>

<template>
  <div class="detail">
    <p v-if="loading" class="info">Memuat detail pesanan...</p>
    <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>

    <section v-else-if="order" class="card">
      <header class="card-header">
        <div>
          <h2>Pesanan {{ order.customer_name }}</h2>
          <p>{{ order.address }}</p>
        </div>
        <div class="header-actions">
          <OrderStatusBadge :status="order.status" />
          <button v-if="order.status === 'menunggu' && profile?.role === 'customer'" class="btn-danger btn-sm" @click="handleCancelClick" :disabled="canceling">
            {{ canceling ? 'Membatalkan...' : 'Batalkan Pesanan' }}
          </button>
        </div>
      </header>
      <div class="grid">
        <div>
          <span class="label">No HP</span>
          <span class="value" style="display: flex; align-items: center; gap: 8px;">
            {{ order.phone }}
            <a :href="getWaLink(order.phone)" target="_blank" class="wa-link" title="Chat WhatsApp">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </a>
          </span>
        </div>
        <div>
          <span class="label">Jenis Air</span>
          <span class="value">{{ order.volume }}</span>
        </div>
        <div>
          <span class="label">Harga Dasar</span>
          <span class="value">{{ formatRupiah(getPricePerTank(order.volume)) }}</span>
        </div>
        <div>
          <span class="label">Ongkir</span>
          <span class="value">{{ formatRupiah(getDeliveryFee(order)) }}</span>
        </div>
        <div>
          <span class="label">Total Pembayaran</span>
          <span class="value price-value">{{ formatRupiah(calculateOrderTotal(order.volume, order.customer_lat, order.customer_lng)) }}</span>
        </div>
        <div>
          <span class="label">Jadwal</span>
          <span class="value">{{ order.schedule_at ? new Date(order.schedule_at).toLocaleString() : '-' }}</span>
        </div>
        <div>
          <span class="label">Catatan</span>
          <span class="value">{{ order.notes || '-' }}</span>
        </div>
      </div>

      <div v-if="order.proof_url" class="proof-section">
        <h3 class="proof-title">Bukti Pengiriman</h3>
        <img :src="order.proof_url" alt="Bukti Pengiriman" class="proof-img" />
      </div>

      <div v-if="order.status === 'selesai'" class="review-section">
        <h3 class="proof-title">Ulasan Pelayanan</h3>
        
        <div v-if="order.rating" class="review-display">
          <div class="stars">
            <svg v-for="i in 5" :key="i" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" :fill="i <= order.rating ? '#f59e0b' : 'none'" :stroke="i <= order.rating ? '#f59e0b' : '#cbd5e1'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <p class="review-text" v-if="order.review">"{{ order.review }}"</p>
        </div>

        <form v-else-if="profile?.role === 'customer'" @submit.prevent="handleSubmitReview" class="review-form">
          <p class="review-prompt">Bagaimana pelayanan pengiriman hari ini?</p>
          <div class="stars-input">
            <button type="button" v-for="i in 5" :key="i" @click="ratingValue = i" class="star-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" :fill="i <= ratingValue ? '#f59e0b' : 'none'" :stroke="i <= ratingValue ? '#f59e0b' : '#cbd5e1'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          </div>
          <textarea v-model="reviewText" placeholder="Tuliskan pengalaman Anda (opsional)..." class="review-textarea"></textarea>
          <p v-if="reviewSuccess" class="success">Terima kasih atas ulasan Anda!</p>
          <button type="submit" class="btn-primary" :disabled="ratingValue === 0 || submittingReview">
            {{ submittingReview ? 'Mengirim...' : 'Kirim Ulasan' }}
          </button>
        </form>

        <p v-else class="info">Pelanggan belum memberikan ulasan.</p>
      </div>
    </section>

    <!-- Driver Info Card: tampil jika ada supir & status aktif -->
    <section
      v-if="driverProfile && order && ['diproses', 'dikirim', 'selesai'].includes(order.status)"
      class="driver-card"
    >
      <div class="driver-card-header">
        <div class="driver-avatar">
          {{ driverProfile.name?.charAt(0).toUpperCase() ?? '?' }}
        </div>
        <div class="driver-info">
          <p class="driver-label">{{ order.status === 'selesai' ? 'Supir Pengiriman' : 'Supir Sedang Mengantar' }}</p>
          <h3 class="driver-name">{{ driverProfile.name ?? 'Tidak diketahui' }}</h3>
        </div>
        <div class="driver-status-dot" :class="order.status === 'dikirim' ? 'dot-active' : 'dot-idle'"></div>
      </div>

      <div class="driver-contacts">
        <a
          v-if="driverProfile.phone"
          :href="getWaLink(driverProfile.phone)"
          target="_blank"
          class="contact-btn contact-wa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          Chat WhatsApp
        </a>
        <a
          v-if="driverProfile.phone"
          :href="'tel:' + driverProfile.phone"
          class="contact-btn contact-call"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.28-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          Telepon
        </a>
        <p v-if="!driverProfile.phone" class="no-contact">Nomor supir tidak tersedia</p>
      </div>
    </section>

    <OrderMap v-if="order" :order-id="order.id" />

    <!-- Custom Cancel Confirm Modal -->
    <div v-if="showCancelModal" class="modal-backdrop" @click.self="showCancelModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <div class="warning-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h3>Batalkan Pesanan</h3>
        </div>
        <div class="modal-body">
          <p>Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat diurungkan dan pesanan akan ditutup.</p>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" @click="showCancelModal = false">Kembali</button>
          <button class="btn-danger" @click="confirmCancelOrder" :disabled="canceling">
            {{ canceling ? "Membatalkan..." : "Ya, Batalkan" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail {
  display: grid;
  gap: 20px;
}

/* ─── Driver Contact Card ─── */
.driver-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.2);
  color: #fff;
}

.driver-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.driver-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.driver-info {
  flex: 1;
}

.driver-label {
  margin: 0 0 3px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.driver-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.driver-status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-active {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.25);
  animation: pulse-dot 2s infinite;
}

.dot-idle {
  background: #64748b;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.25); }
  50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.1); }
}

.driver-contacts {
  display: flex;
  gap: 10px;
}

.contact-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s;
}

.contact-wa {
  background: #25D366;
  color: #fff;
}

.contact-wa:hover {
  background: #1da851;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 211, 102, 0.35);
}

.contact-call {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
}

.contact-call:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

.no-contact {
  color: #94a3b8;
  font-size: 13px;
  margin: 0;
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
}

.card-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.label {
  display: block;
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.value {
  display: block;
  margin-top: 6px;
  font-weight: 600;
}

.price-value {
  color: #16a34a;
  font-weight: 700;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}

.wa-link {
  color: #25D366;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  background: #f0fdf4;
  transition: all 0.2s;
}

.wa-link:hover {
  background: #dcfce7;
  transform: scale(1.1);
}

.proof-section {
  margin-top: 24px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 20px;
}

.proof-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.proof-img {
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

/* Reviews */
.review-section {
  margin-top: 24px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 20px;
}
.review-display {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.stars {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.review-text {
  margin: 0;
  font-style: italic;
  color: #475569;
  font-size: 14px;
}
.review-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.review-prompt {
  margin: 0;
  font-weight: 600;
  color: #1e293b;
}
.stars-input {
  display: flex;
  gap: 8px;
}
.star-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s;
}
.star-btn:hover {
  transform: scale(1.1);
}
.review-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  outline: none;
}
.review-textarea:focus {
  border-color: #0f172a;
}
.btn-primary {
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  background: #0f172a;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
}
.btn-primary:hover {
  background: #1e293b;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.success {
  color: #16a34a;
  font-weight: 600;
  margin: 0;
  font-size: 14px;
}
.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}
.btn-danger {
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  background: #dc2626;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-danger:hover {
  background: #b91c1c;
}
.btn-danger:disabled {
  opacity: 0.7;
  cursor: wait;
}
.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
}
.btn-outline {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.btn-outline:hover {
  background: #f8fafc;
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
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.warning-icon-wrapper {
  background: #fef2f2;
  color: #ef4444;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.modal-body p {
  margin: 0 0 24px;
  color: #475569;
  font-size: 14px;
  line-height: 1.5;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(12px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
</style>
