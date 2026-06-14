<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "../../auth/stores/authStore";
import {
  REWARD_MILESTONES,
  syncRewardData,
  claimReward,
  getUnlockedMilestones,
  getNextMilestone,
  type CustomerRewardData,
  type RewardMilestone,
  type RewardClaim,
} from "../services/rewardService";

const authStore = useAuthStore();
const userId = computed(() => authStore.user.value?.id ?? null);

const loading = ref(true);
const rewardData = ref<CustomerRewardData>({
  accumulatedOrders: 0,
  totalCompletedOrders: 0,
  claims: [],
});

const showClaimModal = ref(false);
const showSuccessModal = ref(false);
const showDetailModal = ref(false);
const claimedRewardName = ref("");
const claiming = ref(false);
const selectedClaim = ref<RewardClaim | null>(null);

function openDetailModal(claim: RewardClaim) {
  selectedClaim.value = claim;
  showDetailModal.value = true;
}

const accumulated = computed(() => rewardData.value.accumulatedOrders);
const unlockedMilestones = computed(() => getUnlockedMilestones(accumulated.value));
const nextMilestone = computed(() => getNextMilestone(accumulated.value));
const hasUnlocked = computed(() => unlockedMilestones.value.length > 0);

const progressToNext = computed(() => {
  if (!nextMilestone.value) return 100;
  const prev = getPrevTarget(nextMilestone.value);
  const range = nextMilestone.value.target - prev;
  const current = accumulated.value - prev;
  return Math.min(100, Math.max(0, (current / range) * 100));
});

function getPrevTarget(milestone: RewardMilestone): number {
  const idx = REWARD_MILESTONES.findIndex((m) => m.id === milestone.id);
  return idx > 0 ? (REWARD_MILESTONES[idx - 1]?.target ?? 0) : 0;
}

function getMilestoneStatus(m: RewardMilestone): "locked" | "unlocked" | "claimed" {
  const isClaimed = rewardData.value.claims.some((c) => c.milestoneId === m.id);
  if (isClaimed) return "claimed";
  if (accumulated.value >= m.target) return "unlocked";
  return "locked";
}

function getClaimForMilestone(m: RewardMilestone) {
  return rewardData.value.claims.find((c) => c.milestoneId === m.id);
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved': return '✅ Disetujui';
    case 'completed': return '📦 Selesai';
    case 'rejected': return '❌ Ditolak';
    default: return '⏳ Menunggu Verifikasi';
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'approved': return 'status-approved';
    case 'completed': return 'status-completed';
    case 'rejected': return 'status-rejected';
    default: return 'status-pending';
  }
}

function getMilestoneProgress(m: RewardMilestone): number {
  if (accumulated.value >= m.target) return 100;
  return Math.min(100, (accumulated.value / m.target) * 100);
}

const defaultTierColor = { bg: "#374151", border: "#6b7280", glow: "rgba(107,114,128,0.3)" };
const tierColors: Record<string, { bg: string; border: string; glow: string }> = {
  bronze: { bg: "linear-gradient(135deg, #92400e, #b45309)", border: "#d97706", glow: "rgba(217,119,6,0.3)" },
  silver: { bg: "linear-gradient(135deg, #374151, #6b7280)", border: "#9ca3af", glow: "rgba(156,163,175,0.3)" },
  gold: { bg: "linear-gradient(135deg, #92400e, #eab308)", border: "#facc15", glow: "rgba(250,204,21,0.35)" },
  platinum: { bg: "linear-gradient(135deg, #312e81, #6366f1)", border: "#818cf8", glow: "rgba(129,140,248,0.35)" },
  diamond: { bg: "linear-gradient(135deg, #0e7490, #06b6d4)", border: "#22d3ee", glow: "rgba(34,211,238,0.4)" },
};

function getTierBg(tier: string): string {
  return (tierColors[tier] ?? defaultTierColor).bg;
}

async function handleClaim(milestone: RewardMilestone) {
  if (!userId.value || claiming.value) return;
  claiming.value = true;
  try {
    rewardData.value = await claimReward(userId.value, milestone);
    claimedRewardName.value = `${milestone.emoji} ${milestone.name}`;
    showClaimModal.value = false;
    showSuccessModal.value = true;
  } catch (e) {
    alert(e instanceof Error ? e.message : "Gagal klaim hadiah.");
  } finally {
    claiming.value = false;
  }
}

onMounted(async () => {
  await authStore.initAuth();
  if (userId.value) {
    rewardData.value = await syncRewardData(userId.value);
  }
  loading.value = false;
});
</script>

<template>
  <div class="rewards-page">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat data hadiah...</p>
    </div>

    <template v-else>
      <!-- Hero Card -->
      <div class="hero-card">
        <div class="hero-bg-pattern"></div>
        <div class="hero-content">
          <div class="hero-left">
            <span class="hero-badge">🎁 Program Hadiah</span>
            <h2 class="hero-title">Kumpulkan Pesanan,<br />Raih Hadiah Menarik!</h2>
            <p class="hero-subtitle">Setiap tangki air yang kamu pesan akan diakumulasi. Capai target dan pilih hadiahmu!</p>
          </div>
          <div class="hero-right">
            <div class="hero-counter">
              <div class="counter-ring">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" class="ring-bg" />
                  <circle cx="60" cy="60" r="52" class="ring-fill" :style="{ strokeDashoffset: 326.7 - (326.7 * progressToNext / 100) }" />
                </svg>
                <div class="counter-value">
                  <span class="counter-num">{{ accumulated }}</span>
                  <span class="counter-label">tangki</span>
                </div>
              </div>
              <div class="counter-info" v-if="nextMilestone">
                <span class="counter-target">Target: {{ nextMilestone.target }} tangki</span>
                <span class="counter-remaining">Kurang {{ nextMilestone.target - accumulated }} lagi!</span>
              </div>
              <div class="counter-info" v-else>
                <span class="counter-target">🎉 Semua tercapai!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Unlocked Banner -->
      <div v-if="hasUnlocked" class="unlock-banner" @click="showClaimModal = true">
        <div class="unlock-icon">🎉</div>
        <div class="unlock-text">
          <strong>Selamat!</strong> Kamu punya {{ unlockedMilestones.length }} hadiah yang bisa diklaim!
        </div>
        <button class="unlock-btn">Pilih Hadiah →</button>
      </div>

      <!-- Milestones Grid -->
      <h3 class="section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Milestone Hadiah
      </h3>

      <div class="milestones-grid">
        <div
          v-for="m in REWARD_MILESTONES"
          :key="m.id"
          class="milestone-card"
          :class="[getMilestoneStatus(m), m.tier]"
        >
          <div class="milestone-tier-badge" :style="{ background: getTierBg(m.tier) }">
            {{ m.tier.toUpperCase() }}
          </div>
          <div class="milestone-emoji">{{ m.emoji }}</div>
          <h4 class="milestone-name">{{ m.name }}</h4>
          <p class="milestone-desc">{{ m.description }}</p>
          <div class="milestone-target">
            <span class="target-num">{{ m.target }}x</span>
            <span class="target-label">pesanan tangki</span>
          </div>
          <div class="milestone-progress-bar">
            <div class="milestone-progress-fill" :style="{ width: getMilestoneProgress(m) + '%', background: getTierBg(m.tier) }"></div>
          </div>
          <div class="milestone-progress-text">
            {{ Math.min(accumulated, m.target) }} / {{ m.target }}
          </div>
          <div v-if="getMilestoneStatus(m) === 'unlocked'" class="milestone-unlocked-badge">✅ TERBUKA!</div>
          <div v-if="getMilestoneStatus(m) === 'claimed'" class="milestone-claimed-badge" :class="getStatusClass(getClaimForMilestone(m)?.status ?? 'pending')">
            {{ getStatusLabel(getClaimForMilestone(m)?.status ?? 'pending') }}
          </div>
          <div v-if="getMilestoneStatus(m) === 'locked'" class="milestone-locked-overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        </div>
      </div>

      <!-- Claim History -->
      <div v-if="rewardData.claims.length > 0" class="history-section">
        <h3 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          Riwayat Klaim
        </h3>
        <div class="history-list">
          <div v-for="claim in [...rewardData.claims].reverse()" :key="claim.id" class="history-item" @click="openDetailModal(claim)">
            <div class="history-icon">🏆</div>
            <div class="history-info">
              <span class="history-name">{{ claim.milestoneName }}</span>
              <span class="history-date">{{ new Date(claim.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
            </div>
            <div class="history-status" :class="getStatusClass(claim.status ?? 'pending')">
              {{ getStatusLabel(claim.status ?? 'pending') }}
            </div>
            <div class="history-count">{{ claim.orderCountAtClaim }} tangki</div>
          </div>
        </div>
      </div>

      <!-- Claim Modal -->
      <div v-if="showClaimModal" class="modal-backdrop" @click.self="showClaimModal = false">
        <div class="modal-content claim-modal">
          <button class="modal-close" @click="showClaimModal = false">&times;</button>
          <div class="modal-header-icon">🎁</div>
          <h3 class="modal-title">Pilih Hadiah Kamu!</h3>
          <p class="modal-desc">Kamu sudah mengumpulkan <strong>{{ accumulated }} tangki</strong>. Pilih satu hadiah di bawah ini. <span class="modal-warn">⚠️ Setelah klaim, akumulasi pesanan akan direset ke 0.</span></p>
          <div class="claim-options">
            <button
              v-for="m in unlockedMilestones"
              :key="m.id"
              class="claim-option"
              :class="m.tier"
              :disabled="claiming"
              @click="handleClaim(m)"
            >
              <span class="claim-emoji">{{ m.emoji }}</span>
              <span class="claim-name">{{ m.name }}</span>
              <span class="claim-target">{{ m.target }}x pesanan</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Success Modal -->
      <div v-if="showSuccessModal" class="modal-backdrop" @click.self="showSuccessModal = false">
        <div class="modal-content success-modal">
          <div class="success-confetti">🎊</div>
          <h3 class="modal-title">Hadiah Berhasil Diklaim!</h3>
          <p class="modal-desc">Kamu telah mengklaim <strong>{{ claimedRewardName }}</strong>. Silakan hubungi admin untuk mengambil hadiahmu.</p>
          <p class="modal-subdesc">Akumulasi pesananmu telah direset. Terus pesan dan raih hadiah lainnya! 💪</p>
          <button class="btn-primary" @click="showSuccessModal = false">Mantap! 🎉</button>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="showDetailModal && selectedClaim" class="modal-backdrop" @click.self="showDetailModal = false">
        <div class="modal-content detail-modal">
          <button class="modal-close" @click="showDetailModal = false">&times;</button>
          <div class="modal-header-icon">📝</div>
          <h3 class="modal-title">Detail Klaim</h3>
          
          <div class="detail-box">
            <div class="detail-row">
              <span class="detail-label">Hadiah:</span>
              <span class="detail-value"><strong>{{ selectedClaim.milestoneName }}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tanggal Klaim:</span>
              <span class="detail-value">{{ new Date(selectedClaim.claimedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value history-status" :class="getStatusClass(selectedClaim.status ?? 'pending')" style="display:inline-block; margin-top:0;">
                {{ getStatusLabel(selectedClaim.status ?? 'pending') }}
              </span>
            </div>
            <div class="detail-row" v-if="selectedClaim.reviewedAt">
              <span class="detail-label">Tgl Diulas:</span>
              <span class="detail-value">{{ new Date(selectedClaim.reviewedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
            
            <div class="detail-notes-section" v-if="selectedClaim.adminNotes">
              <h4 class="notes-title">Catatan Admin:</h4>
              <p class="notes-content">{{ selectedClaim.adminNotes }}</p>
            </div>
          </div>
          
          <button class="btn-primary" @click="showDetailModal = false" style="margin-top: 20px;">Tutup</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rewards-page {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  color: #64748b;
}
.spinner {
  width: 40px; height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Hero */
.hero-card {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0ea5e9 100%);
  border-radius: 20px;
  padding: 36px 32px;
  color: #fff;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
}
.hero-bg-pattern {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(56,189,248,0.15) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(14,165,233,0.1) 0%, transparent 50%);
  pointer-events: none;
}
.hero-content {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}
.hero-left { flex: 1; min-width: 250px; }
.hero-badge {
  display: inline-block;
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}
.hero-title {
  font-size: 26px;
  font-weight: 800;
  margin: 0 0 12px;
  line-height: 1.3;
}
.hero-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.6;
  max-width: 380px;
}

/* Counter Ring */
.hero-right { display: flex; justify-content: center; }
.hero-counter { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.counter-ring {
  position: relative;
  width: 130px; height: 130px;
}
.counter-ring svg {
  width: 100%; height: 100%;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: rgba(255,255,255,0.1);
  stroke-width: 8;
}
.ring-fill {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 326.7;
  transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
}
.counter-value {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.counter-num {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}
.counter-label {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
.counter-info { text-align: center; }
.counter-target {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}
.counter-remaining {
  display: block;
  font-size: 12px;
  color: #38bdf8;
  margin-top: 2px;
}

/* Unlock Banner */
.unlock-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #065f46, #059669);
  border: 1px solid #34d399;
  border-radius: 16px;
  padding: 18px 24px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: pulse-glow 2s ease-in-out infinite;
}
.unlock-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(5,150,105,0.3);
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.3); }
  50% { box-shadow: 0 0 20px 4px rgba(52,211,153,0.2); }
}
.unlock-icon { font-size: 28px; }
.unlock-text { flex: 1; font-size: 14px; line-height: 1.5; }
.unlock-btn {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.unlock-btn:hover { background: rgba(255,255,255,0.3); }

/* Section Title */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 8px 0 0;
}

/* Milestones Grid */
.milestones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}
.milestone-card {
  position: relative;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}
.milestone-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(15,23,42,0.1);
}
.milestone-card.unlocked {
  border-color: #34d399;
  box-shadow: 0 0 0 2px rgba(52,211,153,0.2);
}
.milestone-card.claimed {
  opacity: 0.65;
  border-color: #cbd5e1;
}
.milestone-tier-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: 6px;
}
.milestone-emoji { font-size: 42px; margin: 4px 0; }
.milestone-name { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
.milestone-desc { font-size: 12px; color: #64748b; margin: 0; line-height: 1.5; }
.milestone-target {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
}
.target-num { font-size: 22px; font-weight: 800; color: #0f172a; }
.target-label { font-size: 12px; color: #94a3b8; }
.milestone-progress-bar {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 4px;
}
.milestone-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}
.milestone-progress-text { font-size: 11px; color: #94a3b8; font-weight: 600; }
.milestone-unlocked-badge {
  margin-top: 4px;
  background: #dcfce7;
  color: #16a34a;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  animation: pop-in 0.3s ease;
}
.milestone-claimed-badge {
  margin-top: 4px;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.milestone-claimed-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}
.milestone-claimed-badge.status-approved {
  background: #dcfce7;
  color: #16a34a;
}
.milestone-claimed-badge.status-completed {
  background: #e0e7ff;
  color: #4338ca;
}
.milestone-claimed-badge.status-rejected {
  background: #fee2e2;
  color: #dc2626;
}
.milestone-locked-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  color: #cbd5e1;
}
@keyframes pop-in {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* History */
.history-section { margin-top: 8px; display: flex; flex-direction: column; gap: 14px; }
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 20px;
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
}
.history-item:hover { 
  box-shadow: 0 4px 16px rgba(15,23,42,0.06); 
  transform: translateY(-2px);
}
.history-icon { font-size: 24px; }
.history-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.history-name { font-size: 14px; font-weight: 700; color: #0f172a; }
.history-date { font-size: 12px; color: #94a3b8; }
.history-status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.history-status.status-pending {
  background: #fef3c7;
  color: #92400e;
}
.history-status.status-approved {
  background: #dcfce7;
  color: #16a34a;
}
.history-status.status-completed {
  background: #e0e7ff;
  color: #4338ca;
}
.history-status.status-rejected {
  background: #fee2e2;
  color: #dc2626;
}
.history-count {
  background: #f1f5f9;
  color: #475569;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}
.modal-content {
  background: #fff;
  border-radius: 20px;
  width: min(480px, 92%);
  padding: 32px 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: none;
  border: none;
  font-size: 28px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
}
.modal-close:hover { color: #0f172a; }
.modal-header-icon { font-size: 48px; margin-bottom: 12px; }
.modal-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
.modal-desc { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px; }
.modal-warn {
  display: block;
  margin-top: 8px;
  color: #b45309;
  font-weight: 600;
  font-size: 13px;
}
.modal-subdesc { font-size: 13px; color: #64748b; margin: 0 0 20px; }
.success-confetti { font-size: 64px; margin-bottom: 12px; }

/* Claim Options */
.claim-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
.claim-option {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 20px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}
.claim-option:hover {
  border-color: #38bdf8;
  background: #f0f9ff;
  transform: translateX(4px);
}
.claim-option:disabled { opacity: 0.5; cursor: not-allowed; }
.claim-emoji { font-size: 28px; }
.claim-name { flex: 1; font-size: 15px; font-weight: 700; color: #0f172a; }
.claim-target { font-size: 12px; color: #64748b; font-weight: 600; white-space: nowrap; }

.btn-primary {
  border: none;
  border-radius: 12px;
  background: #0f172a;
  color: #fff;
  padding: 14px 28px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }

.claim-modal { position: relative; }

.detail-box {
  width: 100%;
  text-align: left;
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
  box-sizing: border-box;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}
.detail-value {
  font-size: 14px;
  color: #0f172a;
  text-align: right;
}
.detail-notes-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #cbd5e1;
}
.notes-title {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  margin: 0 0 8px;
}
.notes-content {
  font-size: 14px;
  color: #0f172a;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  margin: 0;
  white-space: pre-wrap;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(16px) scale(0.97); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

@media (max-width: 768px) {
  .rewards-page { gap: 16px; }
  .hero-card { padding: 24px 20px; border-radius: 16px; }
  .hero-title { font-size: 20px; }
  .hero-content { flex-direction: column; text-align: center; gap: 20px; }
  .hero-subtitle { max-width: none; }
  .counter-ring { width: 110px; height: 110px; }
  .counter-num { font-size: 30px; }
  .unlock-banner { flex-direction: column; text-align: center; gap: 12px; padding: 16px 20px; }
  .milestones-grid { grid-template-columns: 1fr; }
  .modal-content { padding: 24px 20px; border-radius: 18px; }
}
</style>
