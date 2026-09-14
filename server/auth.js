// ============================================================
// 鉴权中间件：Bearer Token → req.user；角色控制（RBAC，支持多角色）
// ============================================================

import { verifyToken } from './security.js'

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = token ? verifyToken(token) : null
  if (!payload) return res.status(401).json({ error: '未登录或登录已过期' })
  req.user = payload
  next()
}

// 拥有 roles 中任一角色即可通过
export function roleRequired(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || []
    if (!roles.some((r) => userRoles.includes(r))) {
      return res.status(403).json({ error: '无权限执行此操作' })
    }
    next()
  }
}
