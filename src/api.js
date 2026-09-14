// ============================================================
// API 封装：统一携带 Bearer Token、401 自动跳登录
// 开发环境由 Vite 代理 /api → http://localhost:3000
// ============================================================

const TOKEN_KEY = 'whq_token'
const USER_KEY = 'whq_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}

export function persistAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, { ...options, headers })
  } catch {
    throw new Error('无法连接服务器，请确认后端已启动（npm run dev）')
  }

  if (res.status === 401) {
    clearAuth()
    if (!location.hash.includes('/login')) location.hash = '#/login'
    throw new Error('未登录或登录已过期')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' })
}
