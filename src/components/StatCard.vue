<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  delta: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }, // red | jade | gold | neutral
  accent: { type: String, default: 'var(--brand-red)' }
})
</script>

<template>
  <div class="stat-card">
    <div class="stat-card__top">
      <span class="stat-card__label">{{ label }}</span>
      <span v-if="delta" class="stat-card__delta" :class="`stat-card__delta--${tone}`">{{ delta }}</span>
    </div>
    <div class="stat-card__value">{{ value }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--accent, var(--brand-red));
}
.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.stat-card__label {
  font-size: 13px;
  color: var(--muted);
}
.stat-card__delta {
  font-size: 12px;
  font-weight: 600;
}
.stat-card__delta--red { color: var(--brand-red); }
.stat-card__delta--jade { color: #08730c; }
.stat-card__delta--gold { color: #8a6d1a; }
.stat-card__delta--neutral { color: var(--muted); }
.stat-card__value {
  margin-top: 6px;
  font-size: 32px;
  font-weight: 650;
  letter-spacing: -.5px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
</style>
