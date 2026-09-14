// ============================================================
// 鉴权状态（响应式）：登录 / 登出，持久化到 localStorage
// 支持一用户多角色：auth.user.roles 为角色 id 数组（权威来源）
// ============================================================

import { reactive } from 'vue'
import { api, getToken, getStoredUser, persistAuth, clearAuth } from '../api.js'

export const auth = reactive({
  token: getToken(),
  user: getStoredUser()
})

export function login(token, user) {
  auth.token = token
  auth.user = user
  persistAuth(token, user)
}

export function logout() {
  auth.token = null
  auth.user = null
  clearAuth()
}

// 应用启动时刷新用户信息（角色变更即时生效，兼容旧版单角色缓存）
export async function refreshUser() {
  if (!auth.token) return
  try {
    const { user } = await api.get('/auth/me')
    auth.user = user
    persistAuth(auth.token, user)
  } catch {
    /* 401 由 api 层统一跳转登录 */
  }
}

// 系统 5 角色
export const ROLE_LABEL = {
  admin: '系统管理员',
  student: '在校学生',
  teacher: '本土中文教师',
  employer: '用人单位负责人',
  university: '培养高校负责人'
}

export function roleLabel(role) {
  return ROLE_LABEL[role] || role
}

export function hasRole(role) {
  return (auth.user?.roles || []).includes(role)
}

export function isAdmin() {
  return hasRole('admin')
}

// 用户显示名（兼容旧字段 displayName）
export function displayName() {
  return auth.user?.name || auth.user?.displayName || auth.user?.username || '用户'
}
