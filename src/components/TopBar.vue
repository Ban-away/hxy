<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { auth, logout, roleLabel } from '../store/auth.js'

const route = useRoute()
const router = useRouter()
const title = computed(() => route.meta.title || '概览')

const displayName = computed(() => auth.user?.name || auth.user?.displayName || auth.user?.username || '用户')
const initial = computed(() => displayName.value.charAt(0))
// 展示多角色：优先用后端返回的角色对象名称，否则用角色 id 映射
const rolesText = computed(() => {
  const objs = auth.user?.roleObjects
  if (objs && objs.length) return objs.map((o) => o.name).join(' / ')
  return (auth.user?.roles || []).map((r) => roleLabel(r)).join(' / ')
})

const now = new Date()
const dateStr = computed(() => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

function onLogout() {
  logout()
  router.replace('/login')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <span class="topbar__crumb">文化桥评估系统</span>
      <Icon name="chevron" :size="14" class="topbar__sep" />
      <span class="topbar__title">{{ title }}</span>
    </div>
    <div class="topbar__right">
      <button class="topbar__bell" aria-label="通知">
        <Icon name="bell" :size="18" />
        <span class="topbar__dot"></span>
      </button>
      <span class="topbar__date">{{ dateStr }}</span>
      <div class="topbar__user">
        <span class="topbar__avatar">{{ initial }}</span>
        <span class="topbar__username">
          {{ displayName }}
          <em class="topbar__role">{{ rolesText }}</em>
        </span>
      </div>
      <button class="topbar__logout" title="退出登录" @click="onLogout">
        <Icon name="logout" :size="17" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-h);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(252, 252, 251, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--hairline);
  position: sticky;
  top: 0;
  z-index: 20;
}
.topbar__left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.topbar__crumb { color: var(--muted); font-size: 13px; }
.topbar__sep { color: var(--baseline); }
.topbar__title {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.topbar__right {
  display: flex;
  align-items: center;
  gap: 18px;
}
.topbar__bell {
  position: relative;
  color: var(--ink-2);
  display: grid;
  place-items: center;
  padding: 6px;
  border-radius: 8px;
}
.topbar__bell:hover { background: var(--paper); }
.topbar__dot {
  position: absolute;
  top: 5px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-red);
  border: 2px solid var(--surface);
}
.topbar__date { font-size: 13px; color: var(--muted); }
.topbar__user {
  display: flex;
  align-items: center;
  gap: 9px;
}
.topbar__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand-ink);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 14px;
  display: grid;
  place-items: center;
}
.topbar__username { font-size: 13px; color: var(--ink); font-weight: 500; }
.topbar__role {
  font-style: normal;
  font-size: 11px;
  color: var(--brand-red);
  background: var(--brand-red-soft);
  padding: 1px 7px;
  border-radius: 5px;
  margin-left: 6px;
}
.topbar__logout {
  color: var(--muted);
  display: grid;
  place-items: center;
  padding: 6px;
  border-radius: 8px;
}
.topbar__logout:hover { color: var(--brand-red); background: var(--paper); }
</style>
