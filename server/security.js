// ============================================================
// 密码哈希（scrypt） + JWT（HMAC-SHA256）—— 仅用 node:crypto，零原生依赖
// ============================================================

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'

const SECRET = process.env.JWT_SECRET || 'wenhuaqiao-dev-secret-please-change'
const TOKEN_TTL_SECONDS = 12 * 60 * 60 // 12 小时

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  try {
    const candidate = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

function b64url(s) {
  return Buffer.from(s).toString('base64url')
}

// user: { username, roles: string[], teacher_id }
export function signToken(user) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({
    sub: user.username,
    roles: user.roles || [],
    teacher_id: user.teacher_id || null,
    exp: now + TOKEN_TTL_SECONDS
  }))
  const sig = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export function verifyToken(token) {
  try {
    const [header, payload, sig] = token.split('.')
    if (!header || !payload || !sig) return null
    const expected = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}
