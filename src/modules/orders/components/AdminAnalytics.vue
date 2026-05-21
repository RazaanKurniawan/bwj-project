<script setup lang="ts">
import { computed } from "vue";
import type { Order } from "../types";
import { Bar, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const props = defineProps<{ orders: Order[] }>();

// Basic Metrics
const totalOrders = computed(() => props.orders.length);
const completedOrders = computed(() => props.orders.filter(o => o.status === 'selesai').length);
const pendingOrders = computed(() => props.orders.filter(o => o.status !== 'selesai' && o.status !== 'batal').length);
const canceledOrders = computed(() => props.orders.filter(o => o.status === 'batal').length);

const totalVolume = computed(() => {
  return props.orders
    .filter(o => o.status === 'selesai')
    .reduce((sum, o) => {
      const vol = parseInt(o.volume.replace(/\D/g, '')) || 0;
      return sum + vol;
    }, 0);
});

// Format numbers
const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

// Doughnut Chart Data (Status)
const statusChartData = computed(() => ({
  labels: ["Selesai", "Aktif/Menunggu", "Batal"],
  datasets: [{
    data: [completedOrders.value, pendingOrders.value, canceledOrders.value],
    backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
    borderWidth: 0,
    hoverOffset: 4
  }]
}));

const statusChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const }
  }
};

// Bar Chart Data (Daily Trend)
const trendChartData = computed(() => {
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0] as string;
  });

  const dailyCounts = last7Days.map(date => {
    return props.orders.filter(o => o.created_at?.startsWith(date)).length;
  });

  return {
    labels: last7Days.map(d => {
      const [y, m, day] = d!.split('-');
      return `${day}/${m}`;
    }),
    datasets: [{
      label: 'Pesanan Baru',
      data: dailyCounts,
      backgroundColor: '#3b82f6',
      borderRadius: 4
    }]
  };
});

const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 }
    }
  }
};
</script>

<template>
  <div class="analytics-container">
    <!-- Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="mc-icon bg-blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div class="mc-info">
          <p>Total Pesanan</p>
          <h3>{{ formatNumber(totalOrders) }}</h3>
        </div>
      </div>
      <div class="metric-card">
        <div class="mc-icon bg-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <div class="mc-info">
          <p>Pesanan Selesai</p>
          <h3>{{ formatNumber(completedOrders) }}</h3>
        </div>
      </div>
      <div class="metric-card">
        <div class="mc-icon bg-yellow">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="mc-info">
          <p>Sedang Diproses</p>
          <h3>{{ formatNumber(pendingOrders) }}</h3>
        </div>
      </div>
      <div class="metric-card">
        <div class="mc-icon bg-indigo">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <div class="mc-info">
          <p>Volume Terjual (L)</p>
          <h3>{{ formatNumber(totalVolume) }}</h3>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-card">
        <h3>Trend Pesanan (7 Hari Terakhir)</h3>
        <div class="chart-wrapper">
          <Bar :data="trendChartData" :options="trendChartOptions" />
        </div>
      </div>
      <div class="chart-card">
        <h3>Distribusi Status Pesanan</h3>
        <div class="chart-wrapper">
          <Doughnut :data="statusChartData" :options="statusChartOptions" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.metric-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.mc-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mc-icon svg {
  width: 28px;
  height: 28px;
}

.bg-blue { background: #dbeafe; color: #2563eb; }
.bg-green { background: #dcfce3; color: #16a34a; }
.bg-yellow { background: #fef9c3; color: #ca8a04; }
.bg-indigo { background: #e0e7ff; color: #4f46e5; }

.mc-info p {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mc-info h3 {
  margin: 4px 0 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.chart-card h3 {
  margin: 0 0 20px;
  font-size: 16px;
  color: #1e293b;
}

.chart-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}
</style>
