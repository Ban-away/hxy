<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Icon from './Icon.vue'
import { auth } from '../store/auth.js'

const route = useRoute()

const allItems = [
  { to: '/', label: '概览', icon: 'dashboard', roles: ['admin', 'teacher', 'employer', 'university'] },
  { to: '/assessment', label: '评估管理', icon: 'assessment' },
  { to: '/teachers', label: '教师库', icon: 'teachers', roles: ['admin'] },
  { to: '/analysis', label: '分析中心', icon: 'analysis' },
  { to: '/users', label: '用户管理', icon: 'users', roles: ['admin'] },
  { to: '/settings', label: '设置', icon: 'settings', roles: ['admin'] }
]

// 按角色过滤菜单项（无 roles 约束 = 所有登录用户可见）
const items = computed(() => {
  const roles = auth.user?.roles || []
  return allItems.filter((it) => !it.roles || it.roles.some((r) => roles.includes(r)))
})

function isActive(item) {
  if (item.to === '/') return route.path === '/'
  return route.path.startsWith(item.to)
}
</script>

<template>
  <aside class="side">
    <div class="side__brand">
      <div class="side__logo">桥</div>
      <div class="side__brand-text">
        <div class="side__name">文化桥评估系统</div>
        <div class="side__tag">中华文化传播力评估</div>
      </div>
    </div>

    <nav class="side__nav">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="side__item"
        :class="{ 'is-active': isActive(item) }"
      >
        <Icon :name="item.icon" :size="18" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="side__foot">
      <div class="side__model">数字化模型 · V2.3</div>
      <div class="side__model-sub">评估规则引擎 + AI 辅助分析</div>
    </div>
  </aside>
</template>

<style scoped>
.side {
  width: var(--sidebar-w);
  flex: none;
  height: 100%;
  background: var(--brand-ink);
  color: #d8d5cc;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
}
.side__brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 2px 6px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.side__logo {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--brand-red), #8c2b20);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 14px rgba(192, 58, 43, .4);
}
.side__name {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  letter-spacing: .5px;
  white-space: nowrap;
}
.side__tag {
  font-size: 11px;
  color: #8b8d99;
  margin-top: 2px;
  white-space: nowrap;
}
.side__nav {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.side__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border-radius: 9px;
  color: #b9b8b3;
  font-size: 14px;
  transition: background .15s, color .15s;
  position: relative;
}
.side__item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
.side__item.is-active {
  color: #fff;
  background: rgba(192, 58, 43, 0.22);
}
.side__item.is-active::before {
  content: "";
  position: absolute;
  left: -14px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: var(--brand-red);
}
.side__foot {
  margin-top: auto;
  padding: 14px 8px 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.side__model {
  font-size: 12px;
  color: #c9a227;
  font-weight: 600;
}
.side__model-sub {
  font-size: 11px;
  color: #6f707a;
  margin-top: 3px;
}
</style>
