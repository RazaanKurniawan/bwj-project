<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";

interface Option {
  label: string;
  value: string | number | null;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    small?: boolean;
  }>(),
  {
    placeholder: "Pilih...",
    disabled: false,
    small: false,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", val: string | number | null): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === "") {
    return null;
  }
  const found = props.options.find((o) => o.value === props.modelValue);
  return found ? found.label : null;
});

const select = (val: string | number | null) => {
  emit("update:modelValue", val);
  isOpen.value = false;
};

const toggle = () => {
  if (!props.disabled) isOpen.value = !isOpen.value;
};

const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener("mousedown", handleClickOutside));
onBeforeUnmount(() => document.removeEventListener("mousedown", handleClickOutside));
</script>

<template>
  <div
    ref="containerRef"
    class="csel-wrapper"
    :class="{ 'csel-open': isOpen, 'csel-disabled': disabled, 'csel-small': small }"
  >
    <!-- Trigger -->
    <button
      type="button"
      class="csel-trigger"
      @click="toggle"
      :disabled="disabled"
    >
      <span class="csel-value" :class="{ 'csel-placeholder': !selectedLabel }">
        {{ selectedLabel ?? placeholder }}
      </span>
      <svg
        class="csel-arrow"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition name="csel-drop">
      <div v-if="isOpen" class="csel-dropdown">
        <ul class="csel-list" role="listbox">
          <li
            v-for="opt in options"
            :key="String(opt.value)"
            class="csel-item"
            :class="{ 'csel-selected': opt.value === modelValue }"
            role="option"
            :aria-selected="opt.value === modelValue"
            @click="select(opt.value)"
          >
            <svg
              v-if="opt.value === modelValue"
              class="csel-check"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else class="csel-check-placeholder" />
            {{ opt.label }}
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.csel-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
  font-family: inherit;
  box-sizing: border-box;
}

.csel-wrapper.csel-open {
  z-index: 9999;
}

/* ─── Trigger Button ─── */
.csel-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #0f172a;
  font-family: inherit;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.15s;
  outline: none;
  user-select: none;
  box-sizing: border-box;
}

.csel-trigger:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f8fafc;
}

.csel-open .csel-trigger {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  background: #fff;
}

.csel-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: #f1f5f9;
}

.csel-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.csel-placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.csel-arrow {
  flex-shrink: 0;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.csel-open .csel-arrow {
  transform: rotate(180deg);
  color: #6366f1;
}

/* ─── Small variant ─── */
.csel-small .csel-trigger {
  padding: 7px 10px;
  font-size: 13px;
  border-radius: 8px;
}

/* ─── Dropdown Panel ─── */
.csel-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 9999;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  min-width: 140px;
}

/* ─── List ─── */
.csel-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.csel-list::-webkit-scrollbar {
  width: 4px;
}
.csel-list::-webkit-scrollbar-track {
  background: transparent;
}
.csel-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

/* ─── Item ─── */
.csel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}

.csel-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.csel-selected {
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 700;
}

.csel-selected:hover {
  background: #e0e7ff;
}

.csel-check {
  color: #4f46e5;
  flex-shrink: 0;
}

.csel-check-placeholder {
  width: 14px;
  flex-shrink: 0;
}

/* ─── Small item ─── */
.csel-small .csel-item {
  padding: 7px 10px;
  font-size: 13px;
}

/* ─── Transition ─── */
.csel-drop-enter-active,
.csel-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.csel-drop-enter-from,
.csel-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
