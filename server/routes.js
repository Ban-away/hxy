// ============================================================
// API 路由（挂载于 /api）
// 认证 / 用户与角色管理 / 概览 / 教师 CRUD / 评估 / 分析 / 元配置 / 设置
// 运营数据（教师/结果/反馈/任务/预警/常模）全部来自 SQLite
// 支持一用户多角色：roles 数组为权威来源
// ============================================================

import { Router } from 'express'
import { getDb } from './db.js'
import { signToken, verifyPassword, hashPassword } from './security.js'
import { authRequired, roleRequired } from './auth.js'
import {
  trend, threeParty, surveyConclusion,
  rules, indicators, templates, deployment, levelConfig,
  conceptMap, interview, knowledgeTest
} from '../src/data/mock.js'
import {
  computeOverall, determineLevel, identifyProfile, generateRecommendations
} from '../src/engine/scoring.js'

export const api = Router()

const db = () => getDb()

// ============ 通用工具 ============

function safeJson(s) {
  try { return s ? JSON.parse(s) : null } catch { return null }
}

// 读取当前指标系数（管理员可在「设置」中调整）
function currentWeights() {
  const row = db().prepare("SELECT value FROM settings WHERE key = 'weights'").get()
  const w = safeJson(row && row.value)
  if (w && typeof w.cognitive === 'number' && typeof w.attitude === 'number' && typeof w.capability === 'number') {
    return { cognitive: w.cognitive, attitude: w.attitude, capability: w.capability }
  }
  return { cognitive: 0.3, attitude: 0.3, capability: 0.4 }
}

// 依据当前系数，实时重算综合分与等级（系数调整即时生效）
function derive(cognitive, attitude, capability) {
  const w = currentWeights()
  const overall = computeOverall(cognitive, attitude, capability, w)
  const level = determineLevel(overall).level
  return { overall, level, weights: w }
}

function getUserRoles(userId) {
  return db().prepare(
    `SELECT r.id, r.name, r.description, r.is_system
     FROM roles r JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ? ORDER BY r.id`
  ).all(userId)
}

function userDTO(u) {
  const roleRows = getUserRoles(u.id)
  let displayName = u.name || u.username
  if (u.teacher_id && !u.name) {
    const t = db().prepare('SELECT name FROM teachers WHERE id = ?').get(u.teacher_id)
    if (t) displayName = t.name
  }
  return {
    id: u.id,
    username: u.username,
    name: displayName,
    roles: roleRows.map(r => r.id),
    roleObjects: roleRows.map(r => ({ id: r.id, name: r.name, description: r.description, isSystem: !!r.is_system })),
    teacher_id: u.teacher_id,
    created_at: u.created_at
  }
}

// ============ DTO ============

function teacherListDTO(t, r) {
  const dto = {
    id: t.id, name: t.name, nationality: t.nationality, nativeLanguage: t.native_language,
    teachingYears: t.teaching_years, chinaExperience: t.china_experience_type,
    institution: t.institution, assessmentStatus: t.assessment_status
  }
  if (r) {
    dto.cognitive = r.cognitive_score_rate
    dto.attitude = r.attitude_score_rate
    dto.capability = r.capability_score_rate
    const d = derive(dto.cognitive, dto.attitude, dto.capability)
    dto.overall = d.overall
    dto.level = d.level
    dto.profileType = r.profile_type
    dto.radar = safeJson(r.radar) || {}
  }
  return dto
}

function teacherDetailDTO(t, r, f) {
  const dto = teacherListDTO(t, r)
  if (r) {
    const diag = safeJson(r.diagnosis) || {}
    dto.radar = safeJson(r.radar) || {}
    dto.strengths = diag.strengths || []
    dto.deficiencies = diag.deficiencies || []
    dto.normDelta = diag.normDelta || {}
    dto.recommendations = safeJson(r.recommendations) || { general: [], personalized: [] }
    dto.generatedAt = r.generated_at
  }
  if (f) {
    dto.employer = {
      语言: f.language_score, 教学: f.teaching_score, 文化知识: f.culture_knowledge_score,
      国情知识: f.china_knowledge_score, 态度: f.positive_attitude_score,
      主动性: f.initiative_score, 叙事: f.narrative_score, total: f.total_score
    }
    dto.employerComments = f.comments
  }
  return dto
}

// ============ 认证 ============

api.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' })
  const u = db().prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!u || !verifyPassword(password, u.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  const roles = getUserRoles(u.id).map(r => r.id)
  const token = signToken({ username: u.username, roles, teacher_id: u.teacher_id })
  res.json({ token, user: userDTO(u) })
})

api.get('/auth/me', authRequired, (req, res) => {
  const u = db().prepare('SELECT * FROM users WHERE username = ?').get(req.user.sub)
  if (!u) return res.status(401).json({ error: '账号不存在' })
  res.json({ user: userDTO(u) })
})

// ============ 角色 & 用户管理（管理员） ============

api.get('/auth/roles', authRequired, (req, res) => {
  const rows = db().prepare('SELECT id, name, description, is_system FROM roles ORDER BY id').all()
  res.json(rows.map(r => ({ id: r.id, name: r.name, description: r.description, isSystem: !!r.is_system })))
})

api.get('/auth/users', authRequired, roleRequired('admin'), (req, res) => {
  const rows = db().prepare('SELECT * FROM users ORDER BY id').all()
  res.json(rows.map(userDTO))
})

api.post('/auth/users', authRequired, roleRequired('admin'), (req, res) => {
  const b = req.body || {}
  if (!b.username || !b.password) return res.status(400).json({ error: '用户名和密码不能为空' })
  const exists = db().prepare('SELECT id FROM users WHERE username = ?').get(b.username)
  if (exists) return res.status(409).json({ error: '用户名已存在' })
  const roles = Array.isArray(b.roles) ? b.roles.filter(r => r) : []
  db().exec('BEGIN')
  try {
    const { lastInsertRowid } = db().prepare(
      'INSERT INTO users (username, name, password_hash, teacher_id) VALUES (?,?,?,?)'
    ).run(b.username, b.name || b.username, hashPassword(b.password), b.teacher_id || null)
    const insRole = db().prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?,?)')
    for (const r of roles) insRole.run(lastInsertRowid, r)
    db().exec('COMMIT')
    const u = db().prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid)
    res.status(201).json(userDTO(u))
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

api.put('/auth/users/:id', authRequired, roleRequired('admin'), (req, res) => {
  const u = db().prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  const b = req.body || {}
  if (b.username && b.username !== u.username) {
    const exists = db().prepare('SELECT id FROM users WHERE username = ?').get(b.username)
    if (exists) return res.status(409).json({ error: '用户名已存在' })
  }
  db().exec('BEGIN')
  try {
    if (b.password) {
      db().prepare('UPDATE users SET username = ?, name = ?, password_hash = ?, teacher_id = ? WHERE id = ?')
        .run(b.username ?? u.username, b.name ?? u.name, hashPassword(b.password), b.teacher_id ?? u.teacher_id, u.id)
    } else {
      db().prepare('UPDATE users SET username = ?, name = ?, teacher_id = ? WHERE id = ?')
        .run(b.username ?? u.username, b.name ?? u.name, b.teacher_id ?? u.teacher_id, u.id)
    }
    if (Array.isArray(b.roles)) {
      db().prepare('DELETE FROM user_roles WHERE user_id = ?').run(u.id)
      const insRole = db().prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?,?)')
      for (const r of b.roles.filter(r => r)) insRole.run(u.id, r)
    }
    db().exec('COMMIT')
    const fresh = db().prepare('SELECT * FROM users WHERE id = ?').get(u.id)
    res.json(userDTO(fresh))
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

api.delete('/auth/users/:id', authRequired, roleRequired('admin'), (req, res) => {
  const u = db().prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  if (req.user.sub === u.username) return res.status(400).json({ error: '不能删除当前登录账号' })
  db().exec('BEGIN')
  try {
    db().prepare('DELETE FROM user_roles WHERE user_id = ?').run(u.id)
    db().prepare('DELETE FROM users WHERE id = ?').run(u.id)
    db().exec('COMMIT')
    res.json({ ok: true })
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

// ============ 设置（指标系数，管理员） ============

api.get('/settings/weights', authRequired, (req, res) => {
  res.json(currentWeights())
})

api.put('/settings/weights', authRequired, roleRequired('admin'), (req, res) => {
  const b = req.body || {}
  const cognitive = Number(b.cognitive)
  const attitude = Number(b.attitude)
  const capability = Number(b.capability)
  if (![cognitive, attitude, capability].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) {
    return res.status(400).json({ error: '系数必须为 0~1 之间的数值' })
  }
  const sum = cognitive + attitude + capability
  if (sum <= 0) return res.status(400).json({ error: '系数之和必须大于 0' })
  const weights = {
    cognitive: Math.round(cognitive * 1000) / 1000,
    attitude: Math.round(attitude * 1000) / 1000,
    capability: Math.round(capability * 1000) / 1000
  }
  db().prepare("INSERT INTO settings (key, value) VALUES ('weights', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(JSON.stringify(weights))
  res.json(weights)
})

// ============ 概览仪表板 ============

api.get('/dashboard/stats', authRequired, (req, res) => {
  const one = (sql) => db().prepare(sql).get().c
  res.json({
    totalTeachers: one('SELECT COUNT(*) c FROM teachers'),
    assessing: one("SELECT COUNT(*) c FROM teachers WHERE assessment_status='assessing'"),
    completed: one("SELECT COUNT(*) c FROM teachers WHERE assessment_status='completed'"),
    pending: one("SELECT COUNT(*) c FROM teachers WHERE assessment_status='pending'"),
    alerts: one('SELECT COUNT(*) c FROM alerts')
  })
})

api.get('/dashboard/profile-distribution', authRequired, (req, res) => {
  const rows = db()
    .prepare('SELECT profile_type, COUNT(*) c FROM assessment_results GROUP BY profile_type')
    .all()
  const order = ['均衡型', '认知短板型', '情感薄弱型', '能力不足型', '混合型']
  const dist = rows
    .map(r => ({ name: r.profile_type, value: r.c }))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
  res.json(dist)
})

api.get('/dashboard/alerts', authRequired, (req, res) => {
  const rows = db().prepare('SELECT * FROM alerts ORDER BY id').all()
  res.json(rows.map(a => ({
    id: a.id, teacher: a.teacher_name, code: a.teacher_code,
    kind: a.kind, level: a.level, dim: a.dim, detail: a.detail
  })))
})

api.get('/dashboard/trend', authRequired, (req, res) => res.json(trend))
api.get('/dashboard/three-party', authRequired, (req, res) => res.json(threeParty))

api.get('/dashboard/norms', authRequired, (req, res) => {
  const n = db().prepare('SELECT * FROM norm_references LIMIT 1').get()
  if (!n) return res.status(404).json({ error: '常模未配置' })
  res.json({
    region: n.region, sampleSize: n.sample_size, updatedAt: n.updated_at,
    cognitive: { mean: n.cognitive_mean, std: n.cognitive_std },
    attitude: { mean: n.attitude_mean, std: n.attitude_std },
    capability: { mean: n.capability_mean, std: n.capability_std },
    overall: { mean: n.overall_mean, std: n.overall_std }
  })
})

// ============ 教师库 ============

const RESULT_SELECT = 'SELECT * FROM assessment_results WHERE teacher_id = ?'
const FEEDBACK_SELECT = 'SELECT * FROM employer_feedbacks WHERE teacher_id = ?'

api.get('/teachers', authRequired, (req, res) => {
  const { search = '', nationality = '', status = '', page = 1, pageSize = 20 } = req.query
  const clauses = []
  const params = []
  if (search) { clauses.push('(name LIKE ? OR id LIKE ? OR institution LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  if (nationality) { clauses.push('nationality = ?'); params.push(nationality) }
  if (status) { clauses.push('assessment_status = ?'); params.push(status) }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''
  const rows = db().prepare(`SELECT * FROM teachers ${where} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize))
  const total = db().prepare(`SELECT COUNT(*) c FROM teachers ${where}`).get(...params).c
  const items = rows.map(t => {
    const r = db().prepare(RESULT_SELECT).get(t.id)
    return teacherListDTO(t, r)
  })
  res.json({ total, page: Number(page), pageSize: Number(pageSize), items })
})

api.get('/teachers/:id', authRequired, (req, res) => {
  const t = db().prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id)
  if (!t) return res.status(404).json({ error: '教师不存在' })
  const r = db().prepare(RESULT_SELECT).get(t.id)
  const f = db().prepare(FEEDBACK_SELECT).get(t.id)
  res.json(teacherDetailDTO(t, r, f))
})

function nextTeacherId() {
  const row = db().prepare("SELECT id FROM teachers ORDER BY id DESC LIMIT 1").get()
  const n = row ? parseInt(row.id.replace(/\D/g, ''), 10) + 1 : 1
  return 'T' + String(n).padStart(3, '0')
}

// 教师写操作：系统管理员 或 培养高校负责人
api.post('/teachers', authRequired, roleRequired('admin', 'university'), (req, res) => {
  const b = req.body || {}
  if (!b.name) return res.status(400).json({ error: '姓名不能为空' })
  const id = nextTeacherId()
  const status = b.assessmentStatus || 'pending'
  db().exec('BEGIN')
  try {
    db().prepare(`INSERT INTO teachers
      (id, name, nationality, native_language, teaching_years, china_experience_type, institution, assessment_status)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, b.name, b.nationality || '', b.nativeLanguage || '', b.teachingYears || 0,
        b.chinaExperience || 'none', b.institution || '', status)

    if (typeof b.cognitive === 'number' && typeof b.attitude === 'number' && typeof b.capability === 'number') {
      const d = derive(b.cognitive, b.attitude, b.capability)
      const profile = identifyProfile(b.cognitive, b.attitude, b.capability)
      const rec = generateRecommendations(profile, b.deficiencies || [])
      const radar = b.radar || {
        内容知识: b.cognitive, 深度理解: b.cognitive, 情感认同: b.attitude,
        叙事能力: b.capability, 渠道运用: b.capability, 反思成长: Math.round((b.attitude + b.capability) / 2)
      }
      const diagnosis = JSON.stringify({ strengths: b.strengths || [], deficiencies: b.deficiencies || [], normDelta: {} })
      db().prepare(`INSERT INTO assessment_results
        (id, teacher_id, task_id, cognitive_score_rate, attitude_score_rate, capability_score_rate,
         overall_score, level, profile_type, diagnosis, recommendations, radar, generated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
        .run('R-' + id, id, null, b.cognitive, b.attitude, b.capability,
          d.overall, d.level, profile, diagnosis, JSON.stringify(rec), JSON.stringify(radar))
    }
    db().exec('COMMIT')
    res.status(201).json({ id })
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

api.put('/teachers/:id', authRequired, roleRequired('admin', 'university'), (req, res) => {
  const t = db().prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id)
  if (!t) return res.status(404).json({ error: '教师不存在' })
  const b = req.body || {}
  db().prepare(`UPDATE teachers SET
    name = ?, nationality = ?, native_language = ?, teaching_years = ?,
    china_experience_type = ?, institution = ?, assessment_status = ?
    WHERE id = ?`)
    .run(
      b.name ?? t.name, b.nationality ?? t.nationality, b.nativeLanguage ?? t.native_language,
      b.teachingYears ?? t.teaching_years, b.chinaExperience ?? t.china_experience_type,
      b.institution ?? t.institution, b.assessmentStatus ?? t.assessment_status, t.id
    )
  if (typeof b.cognitive === 'number' && typeof b.attitude === 'number' && typeof b.capability === 'number') {
    const d = derive(b.cognitive, b.attitude, b.capability)
    const profile = identifyProfile(b.cognitive, b.attitude, b.capability)
    const rec = generateRecommendations(profile, b.deficiencies || [])
    db().prepare(`UPDATE assessment_results SET
      cognitive_score_rate = ?, attitude_score_rate = ?, capability_score_rate = ?,
      overall_score = ?, level = ?, profile_type = ?, recommendations = ?
      WHERE teacher_id = ?`)
      .run(b.cognitive, b.attitude, b.capability, d.overall, d.level, profile, JSON.stringify(rec), t.id)
  }
  res.json({ id: t.id })
})

api.delete('/teachers/:id', authRequired, roleRequired('admin'), (req, res) => {
  const t = db().prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id)
  if (!t) return res.status(404).json({ error: '教师不存在' })
  db().exec('BEGIN')
  try {
    for (const tbl of ['assessment_results', 'employer_feedbacks', 'knowledge_test_records',
      'concept_map_records', 'attitude_scale_records', 'narrative_evaluation_records']) {
      db().prepare(`DELETE FROM ${tbl} WHERE teacher_id = ?`).run(t.id)
    }
    db().prepare('DELETE FROM teachers WHERE id = ?').run(t.id)
    db().exec('COMMIT')
    res.json({ ok: true })
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

// ============ 评估管理 ============

api.get('/assessment/tasks', authRequired, (req, res) => {
  const rows = db().prepare('SELECT * FROM assessment_tasks ORDER BY id').all()
  res.json(rows.map(t => ({
    id: t.id, name: t.name, type: t.type, status: t.status,
    start: t.start_date, end: t.end_date, tools: safeJson(t.tools_used) || [],
    participants: t.participants, completed: t.completed, progress: t.progress
  })))
})

// ============ 问卷（任务分发 / 作答 / 管理 / 结果查看） ============

function questionsDTO(surveyId) {
  return db().prepare('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order').all(surveyId)
    .map(q => ({ id: q.id, type: q.type, prompt: q.prompt, options: safeJson(q.options) || [], required: !!q.required }))
}

function nextSurveyCode() {
  const rows = db().prepare('SELECT code FROM surveys').all()
  const nums = rows.map(r => { const m = /(\d+)$/.exec(r.code || ''); return m ? parseInt(m[1], 10) : 0 })
  return 'J' + ((nums.length ? Math.max(...nums) : 0) + 1)
}

function questionsToMarkdown(title, questions) {
  const lines = ['## ' + title, '']
  questions.forEach((q, i) => {
    lines.push(`**${i + 1}. ${q.prompt}**`)
    if (q.type === 'fill') lines.push('____________________')
    else q.options.forEach(o => lines.push(`- ${q.type === 'multiple' ? '□' : '○'} ${o}`))
    lines.push('')
  })
  return lines.join('\n')
}

function replaceQuestions(surveyId, questions) {
  db().prepare('DELETE FROM survey_questions WHERE survey_id = ?').run(surveyId)
  const ins = db().prepare('INSERT INTO survey_questions (id, survey_id, sort_order, type, prompt, options, required) VALUES (?,?,?,?,?,?,1)')
  questions.forEach((q, i) => {
    ins.run(`${surveyId}-Q${i + 1}`, surveyId, i + 1, q.type, q.prompt, JSON.stringify(q.options || []))
  })
}

// 问卷任务：按当前用户角色分发（仅返回该用户可见的问卷）
api.get('/assessment/surveys', authRequired, (req, res) => {
  const roles = req.user?.roles || []
  const me = db().prepare('SELECT id FROM users WHERE username = ?').get(req.user.sub)
  const rows = db().prepare('SELECT * FROM surveys ORDER BY id').all()
  const items = rows
    .map(s => ({ id: s.id, code: s.code, title: s.title, description: s.description, targetRoles: safeJson(s.target_roles) || [] }))
    .filter(s => s.targetRoles.some(r => roles.includes(r)))
    .map(s => ({
      ...s,
      questionCount: db().prepare('SELECT COUNT(*) c FROM survey_questions WHERE survey_id = ?').get(s.id).c,
      submitted: me ? !!db().prepare('SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ? LIMIT 1').get(s.id, me.id) : false
    }))
  res.json(items)
})

// 问卷详情（含结构化题目 + 本人已有作答）；非目标角色 403
api.get('/assessment/surveys/:id', authRequired, (req, res) => {
  const s = db().prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id)
  if (!s) return res.status(404).json({ error: '问卷不存在' })
  const roles = req.user?.roles || []
  const targetRoles = safeJson(s.target_roles) || []
  if (!targetRoles.some(r => roles.includes(r))) return res.status(403).json({ error: '无权限查看此问卷' })

  const me = db().prepare('SELECT id FROM users WHERE username = ?').get(req.user.sub)
  const my = me ? db().prepare('SELECT * FROM survey_responses WHERE survey_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1').get(s.id, me.id) : null

  res.json({
    id: s.id, code: s.code, title: s.title, description: s.description,
    targetRoles, content: s.content,
    questions: questionsDTO(s.id),
    myResponse: my ? { answers: safeJson(my.answers) || [], submittedAt: my.submitted_at } : null
  })
})

// 提交问卷作答（同用户同问卷：更新覆盖）
api.post('/assessment/surveys/:id/responses', authRequired, (req, res) => {
  const s = db().prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id)
  if (!s) return res.status(404).json({ error: '问卷不存在' })
  const roles = req.user?.roles || []
  const targetRoles = safeJson(s.target_roles) || []
  if (!targetRoles.some(r => roles.includes(r))) return res.status(403).json({ error: '无权限填写此问卷' })

  const user = db().prepare('SELECT id FROM users WHERE username = ?').get(req.user.sub)
  if (!user) return res.status(401).json({ error: '账号不存在' })
  const answers = Array.isArray((req.body || {}).answers) ? req.body.answers : []
  if (!answers.length) return res.status(400).json({ error: '请至少作答一题' })

  const json = JSON.stringify(answers)
  const existing = db().prepare('SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ?').get(s.id, user.id)
  if (existing) {
    db().prepare('UPDATE survey_responses SET answers = ?, submitted_at = datetime(\'now\') WHERE id = ?').run(json, existing.id)
    res.json({ id: existing.id, updated: true })
  } else {
    const id = 'RSP-' + Date.now() + '-' + Math.floor(Math.random() * 10000)
    db().prepare('INSERT INTO survey_responses (id, survey_id, user_id, answers) VALUES (?,?,?,?)').run(id, s.id, user.id, json)
    res.status(201).json({ id, updated: false })
  }
})

// —— 问卷管理（仅管理员）：新建 / 编辑 / 删除 ——

api.post('/assessment/surveys', authRequired, roleRequired('admin'), (req, res) => {
  const b = req.body || {}
  if (!b.title || !b.title.trim()) return res.status(400).json({ error: '请填写问卷标题' })
  const targetRoles = Array.isArray(b.targetRoles) ? b.targetRoles.filter(r => r) : []
  const questions = Array.isArray(b.questions) ? b.questions.filter(q => q && q.prompt) : []
  const code = nextSurveyCode()
  const id = code
  const content = questionsToMarkdown(b.title.trim(), questions)

  db().exec('BEGIN')
  try {
    db().prepare('INSERT INTO surveys (id, code, title, description, target_roles, content) VALUES (?,?,?,?,?,?)')
      .run(id, code, b.title.trim(), b.description || '', JSON.stringify(targetRoles), content)
    replaceQuestions(id, questions)
    db().exec('COMMIT')
    res.status(201).json({ id, code })
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

api.put('/assessment/surveys/:id', authRequired, roleRequired('admin'), (req, res) => {
  const s = db().prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id)
  if (!s) return res.status(404).json({ error: '问卷不存在' })
  const b = req.body || {}
  const title = (b.title || s.title || '').trim()
  if (!title) return res.status(400).json({ error: '请填写问卷标题' })
  const targetRoles = Array.isArray(b.targetRoles) ? b.targetRoles.filter(r => r) : safeJson(s.target_roles) || []
  const questions = Array.isArray(b.questions) ? b.questions.filter(q => q && q.prompt) : null
  const content = questions ? questionsToMarkdown(title, questions) : s.content

  db().exec('BEGIN')
  try {
    db().prepare('UPDATE surveys SET title = ?, description = ?, target_roles = ?, content = ? WHERE id = ?')
      .run(title, b.description ?? s.description, JSON.stringify(targetRoles), content, s.id)
    if (questions) replaceQuestions(s.id, questions)
    db().exec('COMMIT')
    res.json({ id: s.id })
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

api.delete('/assessment/surveys/:id', authRequired, roleRequired('admin'), (req, res) => {
  const s = db().prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id)
  if (!s) return res.status(404).json({ error: '问卷不存在' })
  db().exec('BEGIN')
  try {
    db().prepare('DELETE FROM survey_questions WHERE survey_id = ?').run(s.id)
    db().prepare('DELETE FROM survey_responses WHERE survey_id = ?').run(s.id)
    db().prepare('DELETE FROM surveys WHERE id = ?').run(s.id)
    db().exec('COMMIT')
    res.json({ ok: true })
  } catch (e) {
    db().exec('ROLLBACK')
    res.status(500).json({ error: String(e.message) })
  }
})

// 问卷管理：列出全部问卷（含题目数，供管理员管理）
api.get('/assessment/admin/surveys', authRequired, roleRequired('admin'), (req, res) => {
  const rows = db().prepare('SELECT * FROM surveys ORDER BY id').all()
  res.json(rows.map(s => ({
    id: s.id, code: s.code, title: s.title, description: s.description,
    targetRoles: safeJson(s.target_roles) || [],
    questionCount: db().prepare('SELECT COUNT(*) c FROM survey_questions WHERE survey_id = ?').get(s.id).c
  })))
})

// 问卷管理：获取单份问卷完整内容（含题目），供编辑
api.get('/assessment/admin/surveys/:id', authRequired, roleRequired('admin'), (req, res) => {
  const s = db().prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id)
  if (!s) return res.status(404).json({ error: '问卷不存在' })
  res.json({
    id: s.id, code: s.code, title: s.title, description: s.description,
    targetRoles: safeJson(s.target_roles) || [],
    questions: questionsDTO(s.id)
  })
})

// —— 结果查看（仅管理员）：用户作答记录 ——

api.get('/assessment/responses/users', authRequired, roleRequired('admin'), (req, res) => {
  const rows = db().prepare(
    `SELECT u.id, u.username, u.name, COUNT(r.id) AS response_count, MAX(r.submitted_at) AS last_submitted
     FROM users u JOIN survey_responses r ON r.user_id = u.id
     GROUP BY u.id ORDER BY u.id`
  ).all()
  res.json(rows)
})

api.get('/assessment/responses/users/:userId', authRequired, roleRequired('admin'), (req, res) => {
  const rows = db().prepare(
    `SELECT r.id, r.survey_id, s.code, s.title, r.submitted_at
     FROM survey_responses r JOIN surveys s ON s.id = r.survey_id
     WHERE r.user_id = ? ORDER BY r.submitted_at DESC`
  ).all(req.params.userId)
  res.json(rows.map(r => ({ id: r.id, surveyId: r.survey_id, code: r.code, title: r.title, submittedAt: r.submitted_at })))
})

api.get('/assessment/responses/:responseId', authRequired, roleRequired('admin'), (req, res) => {
  const r = db().prepare(
    `SELECT r.*, s.code, s.title, s.description FROM survey_responses r JOIN surveys s ON s.id = r.survey_id WHERE r.id = ?`
  ).get(req.params.responseId)
  if (!r) return res.status(404).json({ error: '答卷不存在' })
  const answers = safeJson(r.answers) || []
  res.json({
    id: r.id, surveyId: r.survey_id, code: r.code, title: r.title, description: r.description,
    submittedAt: r.submitted_at, questions: questionsDTO(r.survey_id), answers
  })
})

// ============ 分析中心 ============

api.get('/analysis/concept-map/:teacherId', authRequired, (req, res) => {
  const r = db().prepare('SELECT * FROM concept_map_records WHERE teacher_id = ?').get(req.params.teacherId)
  if (!r) return res.status(404).json({ error: '无认知地图记录' })
  res.json({ map: safeJson(r.map_data), metrics: {
    breadth: r.breadth_score, depth: r.depth_score, structure: r.structure_score,
    connection: r.connection_score, personal: r.personal_score, weighted: r.weighted_total
  } })
})

api.get('/analysis/knowledge-test/:teacherId', authRequired, (req, res) => {
  const r = db().prepare('SELECT * FROM knowledge_test_records WHERE teacher_id = ?').get(req.params.teacherId)
  if (!r) return res.status(404).json({ error: '无知识测评记录' })
  res.json({
    objective: r.objective_score, subjective: r.subjective_score,
    total: r.total_score, durationSeconds: r.duration_seconds, completedAt: r.completed_at
  })
})

api.get('/analysis/interview/:teacherId', authRequired, (req, res) => {
  if (req.params.teacherId === 'T001') return res.json(interview)
  res.json({ teacher: req.params.teacherId, text: '' })
})

api.get('/analysis/survey-conclusion', authRequired, (req, res) => res.json(surveyConclusion))
api.get('/analysis/three-party', authRequired, (req, res) => res.json(threeParty))

// ============ 元配置（指标/规则/模板/等级） ============

api.get('/meta/indicators', authRequired, (req, res) => res.json(indicators))
api.get('/meta/rules', authRequired, (req, res) => res.json(rules))
api.get('/meta/templates', authRequired, (req, res) => res.json(templates))
api.get('/meta/deployment', authRequired, (req, res) => res.json(deployment))
api.get('/meta/level-config', authRequired, (req, res) => res.json(levelConfig))

// 保留默认导出便于外部引用
export default api
