<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  fetchAllRewardClaims,
  updateClaimStatus,
  REWARD_MILESTONES,
  type AdminRewardClaim,
  type ClaimStatus,
} from "../services/rewardService";
import CustomSelect from "../../shared/components/CustomSelect.vue";

const loading = ref(true);
const claims = ref<AdminRewardClaim[]>([]);
const filterStatus = ref<string>("all");
const processing = ref<string | null>(null);
const showDetailModal = ref(false);
const selectedClaim = ref<AdminRewardClaim | null>(null);
const adminNotes = ref("");

const statusFilterOptions = [
  { label: "Semua", value: "all" },
  { label: "Menunggu", value: "pending" },
  { label: "Disetujui", value: "approved" },
  { label: "Selesai", value: "completed" },
  { label: "Ditolak", value: "rejected" },
];

const filteredClaims = computed(() => {
  if (filterStatus.value === "all") return claims.value;
  return claims.value.filter((c) => c.status === filterStatus.value);
});

const stats = computed(() => {
  const all = claims.value;
  return {
    total: all.length,
    pending: all.filter((c) => c.status === "pending").length,
    approved: all.filter((c) => c.status === "approved").length,
    completed: all.filter((c) => c.status === "completed").length,
    rejected: all.filter((c) => c.status === "rejected").length,
  };
});

function getMilestone(id: string) {
  return REWARD_MILESTONES.find((m) => m.id === id);
}

function statusLabel(s: string) {
  if (s === "approved") return "Disetujui";
  if (s === "completed") return "Selesai";
  if (s === "rejected") return "Ditolak";
  return "Menunggu";
}

function statusClass(s: string) {
  if (s === "approved") return "st-approved";
  if (s === "completed") return "st-completed";
  if (s === "rejected") return "st-rejected";
  return "st-pending";
}

function tierLabel(id: string) {
  const m = getMilestone(id);
  return m ? m.tier.toUpperCase() : "";
}

function openDetail(claim: AdminRewardClaim) {
  selectedClaim.value = claim;
  adminNotes.value = claim.adminNotes ?? "";
  showDetailModal.value = true;
}

async function handleAction(claimId: string, status: ClaimStatus) {
  processing.value = claimId;
  try {
    await updateClaimStatus(claimId, status, adminNotes.value || undefined);
    await loadData();
    showDetailModal.value = false;
  } catch (e) {
    alert(e instanceof Error ? e.message : "Gagal update status.");
  } finally {
    processing.value = null;
  }
}

async function loadData() {
  loading.value = true;
  try {
    claims.value = await fetchAllRewardClaims();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="ar-page">
    <header class="ar-header">
      <div>
        <h2>🎁 Kelola Klaim Hadiah</h2>
        <p>Verifikasi dan kelola klaim reward dari pelanggan</p>
      </div>
      <button class="ar-refresh" @click="loadData" :disabled="loading">🔄 Refresh</button>
    </header>

    <!-- Stats -->
    <div class="ar-stats">
      <div class="stat-card" @click="filterStatus = 'all'">
        <span class="stat-num">{{ stats.total }}</span>
        <span class="stat-lbl">Total Klaim</span>
      </div>
      <div class="stat-card pending" @click="filterStatus = 'pending'">
        <span class="stat-num">{{ stats.pending }}</span>
        <span class="stat-lbl">Menunggu</span>
      </div>
      <div class="stat-card approved" @click="filterStatus = 'approved'">
        <span class="stat-num">{{ stats.approved }}</span>
        <span class="stat-lbl">Disetujui</span>
      </div>
      <div class="stat-card completed" @click="filterStatus = 'completed'">
        <span class="stat-num">{{ stats.completed }}</span>
        <span class="stat-lbl">Selesai</span>
      </div>
      <div class="stat-card rejected" @click="filterStatus = 'rejected'">
        <span class="stat-num">{{ stats.rejected }}</span>
        <span class="stat-lbl">Ditolak</span>
      </div>
    </div>

    <!-- Filter -->
    <div class="ar-filter">
      <label>Filter Status:</label>
      <CustomSelect v-model="filterStatus" :options="statusFilterOptions" />
      <span class="ar-count">{{ filteredClaims.length }} klaim</span>
    </div>

    <div v-if="loading" class="ar-loading">
      <div class="spinner"></div>
      <p>Memuat data klaim...</p>
    </div>

    <div v-else-if="filteredClaims.length === 0" class="ar-empty">
      <div class="empty-icon">📭</div>
      <p>Belum ada klaim hadiah{{ filterStatus !== 'all' ? ` dengan status "${statusLabel(filterStatus)}"` : '' }}.</p>
    </div>

    <!-- Claims Table -->
    <div v-else class="ar-table-wrap">
      <table class="ar-table">
        <thead>
          <tr>
            <th>Pelanggan</th>
            <th>Hadiah</th>
            <th>Tier</th>
            <th>Pesanan Saat Klaim</th>
            <th>Total Selesai</th>
            <th>Tanggal Klaim</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filteredClaims" :key="c.id" :class="{ 'row-pending': c.status === 'pending' }">
            <td>
              <div class="cell-customer">
                <strong>{{ c.customerName }}</strong>
                <span class="cell-phone">{{ c.customerPhone }}</span>
              </div>
            </td>
            <td>
              <span class="cell-reward">{{ getMilestone(c.milestoneId)?.emoji ?? '🎁' }} {{ c.milestoneName }}</span>
            </td>
            <td><span class="tier-badge" :class="getMilestone(c.milestoneId)?.tier ?? ''">{{ tierLabel(c.milestoneId) }}</span></td>
            <td class="text-center"><strong>{{ c.orderCountAtClaim }}</strong> tangki</td>
            <td class="text-center"><strong>{{ c.totalCompletedOrders }}</strong> tangki</td>
            <td>{{ new Date(c.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</td>
            <td><span class="status-badge" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</span></td>
            <td>
              <button class="btn-detail" @click="openDetail(c)">Detail</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-if="!loading && filteredClaims.length > 0" class="ar-cards-mobile">
      <div v-for="c in filteredClaims" :key="c.id" class="ar-card" @click="openDetail(c)">
        <div class="card-top">
          <span class="card-emoji">{{ getMilestone(c.milestoneId)?.emoji ?? '🎁' }}</span>
          <span class="status-badge" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
        </div>
        <h4>{{ c.milestoneName }}</h4>
        <p class="card-customer">{{ c.customerName }} · {{ c.customerPhone }}</p>
        <div class="card-meta">
          <span>{{ c.orderCountAtClaim }} tangki saat klaim</span>
          <span>Total: {{ c.totalCompletedOrders }}</span>
        </div>
        <div class="card-date">{{ new Date(c.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedClaim" class="modal-backdrop" @click.self="showDetailModal = false">
      <div class="modal-content">
        <button class="modal-close" @click="showDetailModal = false">&times;</button>
        <div class="modal-emoji">{{ getMilestone(selectedClaim.milestoneId)?.emoji ?? '🎁' }}</div>
        <h3>Detail Klaim Hadiah</h3>

        <div class="detail-grid">
          <div class="detail-item">
            <label>Pelanggan</label>
            <span>{{ selectedClaim.customerName }}</span>
          </div>
          <div class="detail-item">
            <label>Telepon</label>
            <span>{{ selectedClaim.customerPhone }}</span>
          </div>
          <div class="detail-item">
            <label>Hadiah</label>
            <span>{{ selectedClaim.milestoneName }}</span>
          </div>
          <div class="detail-item">
            <label>Target Milestone</label>
            <span>{{ getMilestone(selectedClaim.milestoneId)?.target ?? '-' }}x tangki</span>
          </div>
          <div class="detail-item">
            <label>Pesanan Saat Klaim</label>
            <span class="highlight">{{ selectedClaim.orderCountAtClaim }} tangki</span>
          </div>
          <div class="detail-item">
            <label>Total Pesanan Selesai</label>
            <span class="highlight">{{ selectedClaim.totalCompletedOrders }} tangki</span>
          </div>
          <div class="detail-item">
            <label>Tanggal Klaim</label>
            <span>{{ new Date(selectedClaim.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
          </div>
          <div class="detail-item">
            <label>Status</label>
            <span class="status-badge" :class="statusClass(selectedClaim.status)">{{ statusLabel(selectedClaim.status) }}</span>
          </div>
        </div>

        <!-- Verification Check -->
        <div class="verify-box" :class="selectedClaim.orderCountAtClaim >= (getMilestone(selectedClaim.milestoneId)?.target ?? 0) ? 'valid' : 'invalid'">
          <span v-if="selectedClaim.orderCountAtClaim >= (getMilestone(selectedClaim.milestoneId)?.target ?? 0)">
            ✅ <strong>Terverifikasi:</strong> Pesanan ({{ selectedClaim.orderCountAtClaim }}) ≥ Target ({{ getMilestone(selectedClaim.milestoneId)?.target ?? 0 }})
          </span>
          <span v-else>
            ⚠️ <strong>Tidak Valid:</strong> Pesanan ({{ selectedClaim.orderCountAtClaim }}) < Target ({{ getMilestone(selectedClaim.milestoneId)?.target ?? 0 }})
          </span>
        </div>

        <div class="notes-section">
          <label>Catatan Admin</label>
          <textarea v-model="adminNotes" placeholder="Tambahkan catatan (opsional)..." rows="3"></textarea>
        </div>

        <div v-if="selectedClaim.status === 'pending'" class="modal-actions">
          <button class="btn-approve" :disabled="processing !== null" @click="handleAction(selectedClaim!.id, 'approved')">
            {{ processing ? '...' : '✅ Setujui' }}
          </button>
          <button class="btn-reject" :disabled="processing !== null" @click="handleAction(selectedClaim!.id, 'rejected')">
            {{ processing ? '...' : '❌ Tolak' }}
          </button>
        </div>
        <div v-else-if="selectedClaim.status === 'approved'" class="modal-actions">
          <button class="btn-primary flex-1" :disabled="processing !== null" @click="handleAction(selectedClaim!.id, 'completed')" style="padding: 13px; font-size: 14px; border-radius: 12px; background: #4f46e5; color: #fff; border: none; font-weight: 700; cursor: pointer;">
            {{ processing ? 'Memproses...' : '📦 Tandai Selesai' }}
          </button>
          <p class="reviewed-info" v-if="selectedClaim.reviewedAt">Direview: {{ new Date(selectedClaim.reviewedAt).toLocaleDateString('id-ID') }}</p>
        </div>
        <div v-else class="modal-actions">
          <p class="reviewed-info" v-if="selectedClaim.reviewedAt">Direview: {{ new Date(selectedClaim.reviewedAt).toLocaleDateString('id-ID') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ar-page { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.ar-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.ar-header h2 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
.ar-header p { margin: 4px 0 0; color: #64748b; font-size: 14px; }
.ar-refresh { border: 1px solid #e2e8f0; background: #fff; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.ar-refresh:hover { background: #f8fafc; border-color: #cbd5e1; }
.ar-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.ar-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,0.08); }
.stat-num { font-size: 32px; font-weight: 800; color: #0f172a; }
.stat-lbl { font-size: 13px; color: #64748b; font-weight: 600; }
.stat-card.pending { border-color: #fbbf24; background: linear-gradient(135deg, #fffbeb, #fef3c7); }
.stat-card.pending .stat-num { color: #92400e; }
.stat-card.approved { border-color: #34d399; background: linear-gradient(135deg, #ecfdf5, #dcfce7); }
.stat-card.approved .stat-num { color: #16a34a; }
.stat-card.completed { border-color: #6366f1; background: linear-gradient(135deg, #eef2ff, #e0e7ff); }
.stat-card.completed .stat-num { color: #4338ca; }
.stat-card.rejected { border-color: #f87171; background: linear-gradient(135deg, #fef2f2, #fee2e2); }
.stat-card.rejected .stat-num { color: #dc2626; }

.ar-filter { display: flex; align-items: center; gap: 12px; }
.ar-filter label { font-size: 14px; font-weight: 600; color: #475569; }
.ar-filter select { padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; background: #fff; cursor: pointer; }
.ar-count { font-size: 13px; color: #94a3b8; margin-left: auto; }

.ar-loading { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 60px 0; color: #64748b; }
.spinner { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.ar-empty { text-align: center; padding: 60px 0; color: #94a3b8; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }

.ar-table-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid #e2e8f0; background: #fff; }
.ar-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.ar-table th { background: #f8fafc; padding: 14px 16px; text-align: left; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.ar-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.ar-table tr:last-child td { border-bottom: none; }
.ar-table tr:hover { background: #f8fafc; }
.ar-table tr.row-pending { background: #fffbeb; }
.ar-table tr.row-pending:hover { background: #fef3c7; }
.text-center { text-align: center; }

.cell-customer { display: flex; flex-direction: column; gap: 2px; }
.cell-customer strong { color: #0f172a; font-size: 14px; }
.cell-phone { color: #94a3b8; font-size: 12px; }
.cell-reward { font-weight: 600; }

.tier-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: #fff; }
.tier-badge.bronze { background: linear-gradient(135deg, #92400e, #b45309); }
.tier-badge.silver { background: linear-gradient(135deg, #374151, #6b7280); }
.tier-badge.gold { background: linear-gradient(135deg, #92400e, #eab308); }
.tier-badge.platinum { background: linear-gradient(135deg, #312e81, #6366f1); }
.tier-badge.diamond { background: linear-gradient(135deg, #0e7490, #06b6d4); }

.status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.st-pending { background: #fef3c7; color: #92400e; }
.st-approved { background: #dcfce7; color: #16a34a; }
.st-completed { background: #e0e7ff; color: #4338ca; }
.st-rejected { background: #fee2e2; color: #dc2626; }

.btn-detail { border: 1px solid #e2e8f0; background: #fff; padding: 7px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; color: #0f172a; transition: all 0.2s; }
.btn-detail:hover { background: #0f172a; color: #fff; }

/* Mobile cards */
.ar-cards-mobile { display: none; flex-direction: column; gap: 12px; }
.ar-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; cursor: pointer; transition: all 0.2s; }
.ar-card:hover { box-shadow: 0 8px 24px rgba(15,23,42,0.08); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-emoji { font-size: 28px; }
.ar-card h4 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #0f172a; }
.card-customer { margin: 0 0 8px; font-size: 13px; color: #64748b; }
.card-meta { display: flex; justify-content: space-between; font-size: 12px; color: #475569; font-weight: 600; }
.card-date { font-size: 12px; color: #94a3b8; margin-top: 8px; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-content { background: #fff; border-radius: 20px; width: min(520px, 92%); padding: 32px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); display: flex; flex-direction: column; align-items: center; text-align: center; max-height: 88vh; overflow-y: auto; position: relative; animation: slideUp 0.3s ease; }
.modal-close { position: absolute; top: 14px; right: 18px; background: none; border: none; font-size: 28px; color: #94a3b8; cursor: pointer; }
.modal-close:hover { color: #0f172a; }
.modal-emoji { font-size: 48px; margin-bottom: 8px; }
.modal-content h3 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 20px; }

.detail-grid { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; text-align: left; margin-bottom: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.detail-item label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.detail-item span { font-size: 14px; color: #0f172a; font-weight: 600; }
.detail-item .highlight { color: #0ea5e9; font-size: 18px; font-weight: 800; }

.verify-box { width: 100%; padding: 14px 18px; border-radius: 12px; font-size: 13px; margin-bottom: 16px; text-align: left; line-height: 1.5; }
.verify-box.valid { background: #dcfce7; border: 1px solid #86efac; color: #166534; }
.verify-box.invalid { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }

.notes-section { width: 100%; text-align: left; margin-bottom: 16px; }
.notes-section label { font-size: 13px; font-weight: 700; color: #475569; display: block; margin-bottom: 6px; }
.notes-section textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 14px; resize: vertical; font-family: inherit; box-sizing: border-box; }
.notes-section textarea:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); }

.modal-actions { display: flex; gap: 12px; width: 100%; flex-wrap: wrap; justify-content: center; }
.btn-approve { flex: 1; min-width: 140px; padding: 13px 20px; border: none; border-radius: 12px; background: #16a34a; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }
.btn-approve:hover { opacity: 0.9; }
.btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reject { flex: 1; min-width: 140px; padding: 13px 20px; border: none; border-radius: 12px; background: #dc2626; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }
.btn-reject:hover { opacity: 0.9; }
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
.reviewed-info { width: 100%; text-align: center; font-size: 12px; color: #94a3b8; margin-top: 4px; }

@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 768px) {
  .ar-stats { grid-template-columns: repeat(2, 1fr); }
  .stat-card { padding: 14px; }
  .stat-num { font-size: 24px; }
  .ar-table-wrap { display: none; }
  .ar-cards-mobile { display: flex; }
  .ar-filter { flex-wrap: wrap; }
  .detail-grid { grid-template-columns: 1fr; }
  .modal-content { padding: 24px 18px; }
}
</style>
