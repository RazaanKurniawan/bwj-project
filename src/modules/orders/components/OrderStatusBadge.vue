<script setup lang="ts">
import type { OrderStatus } from "../types";

defineProps<{
  status: OrderStatus;
}>();
</script>

<template>
  <span class="badge" :class="`badge-${status}`">
    {{ status }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.badge-menunggu {
  background: #fde68a;
  color: #854d0e;
}

.badge-diproses {
  background: #bfdbfe;
  color: #1d4ed8;
}

.badge-dikirim {
  background: #bbf7d0;
  color: #166534;
}

.badge-selesai {
  background: #e2e8f0;
  color: #334155;
}

.badge-batal {
  background: #fecaca;
  color: #991b1b;
}
</style>
