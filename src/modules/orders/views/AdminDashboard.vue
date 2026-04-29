<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { Order, OrderStatus } from "../types";
import { fetchAllOrders, updateOrder } from "../services/orderService";
import OrderStatusBadge from "../components/OrderStatusBadge.vue";
import { fetchDrivers } from "../../auth/services/profileService";
import type { Profile } from "../../auth/types";

const orders = ref<Order[]>([]);
const drivers = ref<Profile[]>([]);
const loading = ref(true);
const errorMsg = ref("");

const updates = reactive<Record<string, { status: OrderStatus; driverId: string | null }>>({});

const statusOptions: OrderStatus[] = ["menunggu", "diproses", "dikirim", "selesai", "batal"];

const loadData = async () => {
  loading.value = true;
  errorMsg.value = "";

  try {
    const [orderData, driverData] = await Promise.all([fetchAllOrders(), fetchDrivers()]);
    orders.value = orderData;
    drivers.value = driverData;

    orderData.forEach((order) => {
      updates[order.id] = {
        status: order.status,
        driverId: order.assigned_driver_id,
      };
    });
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal memuat data admin.";
  } finally {
    loading.value = false;
  }
};

const handleSave = async (orderId: string) => {
  const update = updates[orderId];
  if (!update) {
    return;
  }

  try {
    await updateOrder(orderId, {
      status: update.status,
      assigned_driver_id: update.driverId,
    });
    await loadData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : "Gagal update order.";
  }
};

onMounted(loadData);
</script>

<template>
  <div class="dashboard">
    <header class="section-header">
      <div>
        <h2>Dashboard Admin</h2>
        <p>Kelola pesanan, status, dan penugasan supir.</p>
      </div>
    </header>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat data admin...</p>

    <section v-else class="card">
      <div v-if="orders.length === 0" class="empty">Belum ada order.</div>
      <div v-else class="table">
        <div class="table-header">
          <span>Customer</span>
          <span>Status</span>
          <span>Supir</span>
          <span>Aksi</span>
        </div>
        <div v-for="order in orders" :key="order.id" class="table-row">
          <div>
            <strong>{{ order.customer_name }}</strong>
            <p>{{ order.address }}</p>
            <OrderStatusBadge :status="order.status" />
          </div>
          <template v-if="updates[order.id]">
            <select v-model="updates[order.id]!.status">
              <option v-for="status in statusOptions" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
            <select v-model="updates[order.id]!.driverId">
              <option :value="null">Belum ditugaskan</option>
              <option v-for="driver in drivers" :key="driver.id" :value="driver.id">
                {{ driver.name || driver.id }}
              </option>
            </select>
            <button class="btn-primary" @click="handleSave(order.id)">Simpan</button>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 20px;
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
  padding: 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.table {
  display: grid;
  gap: 12px;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 12px;
  align-items: center;
}

.table-header {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.table-row {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #f8fafc;
}

.table-row p {
  margin: 4px 0 0;
  color: #475569;
}

.table-row select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
}

.btn-primary {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  background: #0f172a;
  color: #fff;
  cursor: pointer;
}

.empty {
  color: #64748b;
}

.error {
  color: #dc2626;
}

.info {
  color: #64748b;
}
</style>
