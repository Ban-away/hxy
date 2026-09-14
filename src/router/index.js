import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken, getStoredUser } from '../api.js'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: '登录', public: true, layout: 'bare' }
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '概览', roles: ['admin', 'teacher', 'employer', 'university'] }
  },
  {
    path: '/assessment',
    name: 'assessment',
    component: () => import('../views/AssessmentView.vue'),
    meta: { title: '评估管理' }
  },
  {
    path: '/teachers',
    name: 'teachers',
    component: () => import('../views/TeachersView.vue'),
    meta: { title: '教师库', roles: ['admin'] }
  },
  {
    path: '/teachers/:id',
    name: 'teacher-detail',
    component: () => import('../views/TeacherDetailView.vue'),
    meta: { title: '教师画像' }
  },
  {
    path: '/analysis',
    name: 'analysis',
    component: () => import('../views/AnalysisView.vue'),
    meta: { title: '分析中心' }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('../views/UsersView.vue'),
    meta: { title: '用户管理', roles: ['admin'] }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '设置', roles: ['admin'] }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 无权限访问时的默认落地页
function fallbackHome(user) {
  const roles = user?.roles || []
  const hasNonStudent = roles.some((r) => r !== 'student')
  return hasNonStudent ? '/' : '/assessment'
}

// 全局鉴权守卫：未登录跳登录页；已登录访问登录页跳回首页；角色不满足则回退
router.beforeEach((to) => {
  const authed = !!getToken()
  if (!to.meta.public && !authed) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && authed) {
    return { path: fallbackHome(getStoredUser()) }
  }
  if (authed && Array.isArray(to.meta.roles)) {
    const user = getStoredUser()
    const roles = user?.roles || []
    if (!to.meta.roles.some((r) => roles.includes(r))) {
      return { path: fallbackHome(user) }
    }
  }
})

router.afterEach((to) => {
  document.title = `${to.meta.title} · 文化桥评估系统`
})

export default router
