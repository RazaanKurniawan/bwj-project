<script setup lang="ts">
import { ref } from "vue";

const ADMIN_PHONE = "6281381557944"; // 081381557944 → 62...

const isOpen = ref(false);
const message = ref("");

const toggle = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    // Auto-focus textarea after open animation
    setTimeout(() => {
      const el = document.getElementById("wa-message-input");
      el?.focus();
    }, 150);
  }
};

const sendMessage = () => {
  const text = message.value.trim();
  if (!text) return;
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/${ADMIN_PHONE}?text=${encoded}`, "_blank");
  message.value = "";
  isOpen.value = false;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};
</script>

<template>
  <div class="wa-bubble-container">
    <!-- Chat popup panel -->
    <Transition name="bubble-pop">
      <div v-if="isOpen" class="wa-panel">
        <div class="wa-panel-header">
          <div class="wa-admin-avatar">BWJ</div>
          <div class="wa-admin-info">
            <p class="wa-admin-name">Admin BWJ</p>
            <span class="wa-online-dot"></span>
            <p class="wa-admin-status">Online</p>
          </div>
          <button class="wa-close-btn" @click="isOpen = false" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="wa-panel-body">
          <div class="wa-greeting-bubble">
            <p>👋 Halo! Ada yang bisa kami bantu?</p>
            <p class="wa-greeting-sub">Kirim pesan dan kami akan segera merespons di WhatsApp.</p>
          </div>
        </div>

        <div class="wa-panel-input">
          <textarea
            id="wa-message-input"
            v-model="message"
            placeholder="Tulis pesan kamu..."
            class="wa-textarea"
            rows="3"
            @keydown="handleKeydown"
          ></textarea>
          <button
            class="wa-send-btn"
            :disabled="!message.trim()"
            @click="sendMessage"
            aria-label="Kirim ke WhatsApp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <p class="wa-hint">Tekan Enter atau klik kirim → akan diarahkan ke WhatsApp</p>
      </div>
    </Transition>

    <!-- Floating WA button -->
    <button class="wa-fab" @click="toggle" :class="{ 'wa-fab-active': isOpen }" aria-label="Hubungi Admin via WhatsApp">
      <Transition name="icon-swap" mode="out-in">
        <!-- WA icon when closed -->
        <svg v-if="!isOpen" key="wa" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <!-- X icon when open -->
        <svg v-else key="close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </Transition>
      <!-- Pulse ring (only when closed) -->
      <span v-if="!isOpen" class="wa-pulse"></span>
    </button>
  </div>
</template>

<style scoped>
.wa-bubble-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

/* ─── FAB Button ─── */
.wa-fab {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #25D366;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(37, 211, 102, 0.45);
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
  flex-shrink: 0;
}

.wa-fab:hover {
  background: #1da851;
  transform: scale(1.08);
  box-shadow: 0 8px 28px rgba(37, 211, 102, 0.55);
}

.wa-fab-active {
  background: #64748b;
  box-shadow: 0 6px 20px rgba(100, 116, 139, 0.35);
}

.wa-fab-active:hover {
  background: #475569;
  box-shadow: 0 8px 28px rgba(100, 116, 139, 0.45);
}

/* Pulse ring */
.wa-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(37, 211, 102, 0.5);
  animation: wa-pulse-ring 2s ease-out infinite;
  pointer-events: none;
}

@keyframes wa-pulse-ring {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.55); opacity: 0; }
}

/* Icon swap transition */
.icon-swap-enter-active,
.icon-swap-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.icon-swap-enter-from,
.icon-swap-leave-to { opacity: 0; transform: scale(0.7) rotate(45deg); }

/* ─── Chat Panel ─── */
.wa-panel {
  width: 300px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.2), 0 4px 12px rgba(15, 23, 42, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Panel header */
.wa-panel-header {
  background: #25D366;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.wa-admin-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.wa-admin-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wa-admin-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.wa-admin-status {
  margin: 0;
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  gap: 4px;
}

.wa-online-dot {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  display: inline-block;
  margin-right: 4px;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.wa-close-btn {
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}

.wa-close-btn:hover {
  background: rgba(255,255,255,0.28);
}

/* Panel body */
.wa-panel-body {
  padding: 16px;
  background: #f0f0f0;
}

.wa-greeting-bubble {
  background: #fff;
  border-radius: 12px 12px 12px 2px;
  padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.wa-greeting-bubble p {
  margin: 0;
  font-size: 13px;
  color: #1e293b;
  line-height: 1.5;
}

.wa-greeting-sub {
  color: #64748b !important;
  font-size: 12px !important;
  margin-top: 4px !important;
}

/* Panel input */
.wa-panel-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
}

.wa-textarea {
  flex: 1;
  resize: none;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
}

.wa-textarea:focus {
  border-color: #25D366;
}

.wa-textarea::placeholder {
  color: #94a3b8;
}

.wa-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #25D366;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, transform 0.2s;
}

.wa-send-btn:hover:not(:disabled) {
  background: #1da851;
  transform: scale(1.08);
}

.wa-send-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.wa-hint {
  margin: 0;
  padding: 6px 12px 10px;
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
  background: #fff;
}

/* ─── Panel transition ─── */
.bubble-pop-enter-active {
  animation: bubble-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.bubble-pop-leave-active {
  animation: bubble-out 0.18s ease-in forwards;
}

@keyframes bubble-in {
  from { opacity: 0; transform: translateY(16px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes bubble-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(10px) scale(0.95); }
}

/* ─── Mobile adjustment ─── */
@media (max-width: 768px) {
  .wa-bubble-container {
    bottom: 80px; /* Above bottom nav bar */
    right: 16px;
  }
  .wa-panel {
    width: calc(100vw - 32px);
    max-width: 300px;
  }
}
</style>
