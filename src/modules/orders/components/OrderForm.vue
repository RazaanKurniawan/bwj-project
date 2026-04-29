<script setup lang="ts">
import { ref } from "vue";
import type { Order } from "../types";
import { createOrder } from "../services/orderService";

const props = defineProps<{
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
}>();

const emit = defineEmits<{
  (event: "created", order: Order): void;
}>();

const name = ref(props.customerName ?? "");
const phone = ref(props.customerPhone ?? "");
const address = ref("");
const scheduleAt = ref("");
const volume = ref("1 galon");
const notes = ref("");
const loading = ref(false);
const errorMsg = ref("");

const resetForm = () => {
  address.value = "";
  scheduleAt.value = "";
  volume.value = "1 galon";
  notes.value = "";
};

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = "";

  const schedule = scheduleAt.value ? new Date(scheduleAt.value).toISOString() : null;

  try {
    const order = await createOrder({
      customer_id: props.customerId,
      customer_name: name.value,
      phone: phone.value,
      address: address.value,
      schedule_at: schedule,
      volume: volume.value,
      notes: notes.value || null,
      status: "menunggu",
      truck_id: null,
      assigned_driver_id: null,
      lat: null,
      lng: null,
      accuracy: null,
    });

    resetForm();
    emit("created", order);
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
        <span>Alamat</span>
        <textarea v-model="address" rows="3" required></textarea>
      </label>
      <label class="field">
        <span>Jadwal</span>
        <input v-model="scheduleAt" type="datetime-local" />
      </label>
      <label class="field">
        <span>Volume</span>
        <select v-model="volume">
          <option>1 galon</option>
          <option>2 galon</option>
          <option>3 galon</option>
          <option>5 galon</option>
        </select>
      </label>
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
</style>
