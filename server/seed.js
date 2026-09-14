// ============================================================
// 数据库种子数据
// 156 名教师 = 10 名示例（mock.js）+ 146 名确定性生成
// 评估状态分布：已完成 98 / 评估中 23 / 待评估 35（与 stats 一致）
// 评分结果由 src/engine/scoring.js 规则引擎实时计算后落库
// 用户/角色：5 系统角色，支持一用户多角色
// ============================================================

import {
  teachers as featured,
  assessmentTasks,
  norms,
  alerts,
  conceptMap,
  interview,
  knowledgeTest
} from '../src/data/mock.js'
import {
  computeOverall,
  determineLevel,
  identifyProfile,
  generateRecommendations
} from '../src/engine/scoring.js'
import { hashPassword } from './security.js'
import { SURVEYS } from './surveys.js'
import { parseQuestions } from './surveyParser.js'

// —— 确定性伪随机（可复现）——
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6d2b79f5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260913)

function gauss() {
  let u = 0, v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const round1 = (n) => Math.round(n * 10) / 10
const rdim = (mean, sd) => Math.round(clamp(mean + gauss() * sd, 35, 97))

const NATIONALITIES = [
  { name: '韩国', lang: '韩语', surnames: ['金', '李', '朴', '崔', '郑'], givens: ['智英', '敏浩', '秀雅', '东旭', '慧珍', '俊昊', '恩静', '相贤'] },
  { name: '越南', lang: '越南语', surnames: ['阮', '陈', '黎', '范', '黄'], givens: ['氏梅', '文强', '秋河', '明', '氏兰', '国庆', '垂玲'] },
  { name: '日本', lang: '日语', surnames: ['田中', '佐藤', '铃木', '高桥', '渡边'], givens: ['惠美', '健太', '美咲', '大辅', '绘里', '翔', '结衣'] },
  { name: '泰国', lang: '泰语', surnames: ['颂猜', '素帕', '乍伦', '威拉'], givens: ['帕拉', '娜帕', '塔纳', '甘雅', '素妮'] },
  { name: '印尼', lang: '印尼语', surnames: ['布迪', '德维', '阿里', '西蒂'], givens: ['苏哈娜', '普特拉', '拉赫马', '伊达', '尤素夫'] },
  { name: '马来西亚', lang: '马来语', surnames: ['阿兹曼', '陈', '黄', '拉希德'], givens: ['美丽', '依斯迈', '伟良', '淑仪'] },
  { name: '菲律宾', lang: '他加禄语', surnames: ['桑托斯', '克鲁兹', '雷耶斯'], givens: ['玛丽亚', '何塞', '安娜', '米格尔'] },
  { name: '美国', lang: '英语', surnames: ['Smith', 'Johnson', 'Brown', 'Davis'], givens: ['Emily', 'Michael', 'Sarah', 'David'] },
  { name: '俄罗斯', lang: '俄语', surnames: ['伊万诺娃', '彼得罗夫', '库兹涅佐娃'], givens: ['安娜', '德米特里', '叶卡捷琳娜', '谢尔盖'] },
  { name: '哈萨克斯坦', lang: '哈萨克语', surnames: ['阿利耶夫', '努尔兰'], givens: ['艾古尔', '别克', '扎娜尔', '达斯坦'] }
]
const INST_PATTERNS = ['%s国立大学', '%s师范大学', '%s外语大学', '%s大学', '%s人文学院']
const EXPERIENCES = ['none', 'short_term', 'degree', 'exchange']
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

// —— 角色（系统 5 角色）——
const ROLES = [
  { id: 'admin', name: '系统管理员', description: '拥有全部权限，管理用户与系统配置' },
  { id: 'student', name: '在校学生', description: '参与评估调研的学生用户' },
  { id: 'teacher', name: '本土中文教师', description: '被评估的本土中文教师' },
  { id: 'employer', name: '用人单位负责人', description: '提供用人反馈的用人单位代表' },
  { id: 'university', name: '培养高校负责人', description: '负责培养单位自评的高校代表' }
]

// —— 演示用户（支持一用户多角色）——
const USERS = [
  { username: 'admin', name: '系统管理员', password: 'admin123', roles: ['admin'], teacher_id: null },
  { username: 'zhangsan', name: '张三', password: 'zhangsan123', roles: ['university', 'admin'], teacher_id: null },
  { username: 'student', name: '王同学', password: 'student123', roles: ['student'], teacher_id: null },
  { username: 'teacher', name: '朴智英', password: 'teacher123', roles: ['teacher'], teacher_id: 'T001' },
  { username: 'employer', name: '李经理', password: 'employer123', roles: ['employer'], teacher_id: null },
  { username: 'university', name: '刘处长', password: 'university123', roles: ['university'], teacher_id: null }
]

// 生成教师三维得分 + 派生字段
function genScores() {
  return {
    cognitive: rdim(68, 11),
    attitude: rdim(74, 9),
    capability: rdim(66, 12)
  }
}

function genRadar(c, a, p) {
  return {
    内容知识: Math.round(clamp(c + gauss() * 3, 35, 98)),
    深度理解: Math.round(clamp(c + gauss() * 4 - 2, 35, 98)),
    情感认同: Math.round(clamp(a + gauss() * 3, 35, 98)),
    叙事能力: Math.round(clamp(p + gauss() * 4, 35, 98)),
    渠道运用: Math.round(clamp(p + gauss() * 5 - 4, 35, 98)),
    反思成长: Math.round(clamp((a + p) / 2 + gauss() * 4, 35, 98))
  }
}

function genStrengthsDeficiencies(c, a, p) {
  const strengths = []
  const deficiencies = []
  if (c >= 75) strengths.push('对中国历史文化有较好了解')
  if (a >= 75) strengths.push('友华情感积极')
  if (p >= 75) strengths.push('叙事传播能力较强')
  if (!strengths.length) strengths.push('学习主动，态度端正')
  if (c < 58) deficiencies.push('国情知识不足')
  if (a < 58) deficiencies.push('情感投入不足')
  if (p < 58) deficiencies.push('叙事能力弱')
  if (p < 50) deficiencies.push('渠道运用弱')
  return { strengths: strengths.slice(0, 2), deficiencies }
}

const five = (v) => clamp(round1(v / 20), 1, 5)

function genEmployer(c, a, p) {
  const e = {
    语言: five(p + 8),
    教学: five((c + p) / 2),
    文化知识: five(c - 6),
    国情知识: five(c - 14),
    态度: five(a),
    主动性: five(a - 5),
    叙事: five(p - 12)
  }
  const vals = Object.values(e)
  e.total = round1(vals.reduce((s, v) => s + v, 0) / vals.length)
  return e
}

function genNormDelta(c, a, p) {
  return {
    认知: Math.round(c - norms.cognitive.mean),
    情感: Math.round(a - norms.attitude.mean),
    能力: Math.round(p - norms.capability.mean)
  }
}

// 构建 156 名教师完整对象（含评分结果/反馈派生）
function buildTeachers() {
  const list = []
  for (let i = 0; i < 156; i++) {
    const idx = i + 1
    const id = 'T' + String(idx).padStart(3, '0')

    // 状态分区：T001-T098 已完成；T099-T121 评估中；T122-T156 待评估
    let status
    if (i < 98) status = 'completed'
    else if (i < 121) status = 'assessing'
    else status = 'pending'

    let t
    if (i < 10) {
      const f = featured[i]
      t = {
        id: f.id, name: f.name, nationality: f.nationality, nativeLanguage: f.nativeLanguage,
        teachingYears: f.teachingYears, chinaExperience: f.chinaExperience, institution: f.institution,
        status, cognitive: f.cognitive, attitude: f.attitude, capability: f.capability,
        radar: f.radar, strengths: f.strengths, deficiencies: f.deficiencies,
        employer: f.employer, normDelta: f.normDelta
      }
    } else {
      const nat = pick(NATIONALITIES)
      const surname = pick(nat.surnames)
      const given = pick(nat.givens)
      const pattern = pick(INST_PATTERNS)
      const s = genScores()
      const { strengths, deficiencies } = genStrengthsDeficiencies(s.cognitive, s.attitude, s.capability)
      t = {
        id, name: surname + given, nationality: nat.name, nativeLanguage: nat.lang,
        teachingYears: 1 + Math.floor(rand() * 12), chinaExperience: pick(EXPERIENCES),
        institution: pattern.replace('%s', nat.name),
        status, ...s,
        radar: genRadar(s.cognitive, s.attitude, s.capability),
        strengths, deficiencies,
        employer: genEmployer(s.cognitive, s.attitude, s.capability),
        normDelta: genNormDelta(s.cognitive, s.attitude, s.capability)
      }
    }
    list.push(t)
  }
  return list
}

export function seed(db) {
  const t0 = Date.now()
  db.exec('BEGIN')

  seedRoles(db)
  seedUsers(db)
  seedSettings(db)
  seedNorm(db)
  seedTasks(db)
  seedSurveys(db)
  seedSurveyQuestions(db)

  const teachers = buildTeachers()
  seedTeachers(db, teachers)
  seedResults(db, teachers)
  seedFeedbacks(db, teachers)
  seedAlerts(db)
  seedT001Records(db)

  db.exec('COMMIT')
  console.log(`[seed] 完成：${teachers.length} 名教师 · ${Date.now() - t0}ms`)
}

function seedRoles(db) {
  const ins = db.prepare('INSERT OR IGNORE INTO roles (id, name, description, is_system) VALUES (?,?,?,1)')
  for (const r of ROLES) ins.run(r.id, r.name, r.description)
}

function seedUsers(db) {
  const insUser = db.prepare('INSERT INTO users (username, name, password_hash, teacher_id) VALUES (?,?,?,?)')
  const insRole = db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?,?)')
  for (const u of USERS) {
    const { lastInsertRowid } = insUser.run(u.username, u.name, hashPassword(u.password), u.teacher_id)
    for (const r of u.roles) insRole.run(lastInsertRowid, r)
  }
}

function seedSettings(db) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    .run('weights', JSON.stringify({ cognitive: 0.3, attitude: 0.3, capability: 0.4 }))
}

function seedNorm(db) {
  const ins = db.prepare(`INSERT INTO norm_references
    (id, region, teacher_type, sample_size,
     cognitive_mean, cognitive_std, attitude_mean, attitude_std,
     capability_mean, capability_std, overall_mean, overall_std, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  ins.run(
    'NORM-SEA', norms.region, '本土中文教师', norms.sampleSize,
    norms.cognitive.mean, norms.cognitive.std,
    norms.attitude.mean, norms.attitude.std,
    norms.capability.mean, norms.capability.std,
    norms.overall.mean, norms.overall.std,
    norms.updatedAt
  )
}

function seedTasks(db) {
  const ins = db.prepare(`INSERT INTO assessment_tasks
    (id, name, type, status, start_date, end_date, tools_used, participants, completed, progress)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
  for (const tk of assessmentTasks) {
    ins.run(
      tk.id, tk.name, tk.type, tk.status, tk.start, tk.end,
      JSON.stringify(tk.tools), tk.participants, tk.completed, tk.progress
    )
  }
}

export function seedSurveys(db) {
  const ins = db.prepare('INSERT INTO surveys (id, code, title, description, target_roles, content) VALUES (?,?,?,?,?,?)')
  for (const s of SURVEYS) {
    ins.run(s.id, s.code, s.title, s.description, JSON.stringify(s.targetRoles), s.content)
  }
}

export function seedSurveyQuestions(db) {
  const ins = db.prepare('INSERT INTO survey_questions (id, survey_id, sort_order, type, prompt, options, required) VALUES (?,?,?,?,?,?,1)')
  for (const s of SURVEYS) {
    const questions = parseQuestions(s.content)
    questions.forEach((q, i) => {
      ins.run(`${s.id}-Q${i + 1}`, s.id, i + 1, q.type, q.prompt, JSON.stringify(q.options || []))
    })
  }
}

function seedTeachers(db, teachers) {
  const ins = db.prepare(`INSERT INTO teachers
    (id, name, nationality, native_language, teaching_years, china_experience_type, institution, assessment_status)
    VALUES (?,?,?,?,?,?,?,?)`)
  for (const t of teachers) {
    ins.run(t.id, t.name, t.nationality, t.nativeLanguage, t.teachingYears, t.chinaExperience, t.institution, t.status)
  }
}

function seedResults(db, teachers) {
  const ins = db.prepare(`INSERT INTO assessment_results
    (id, teacher_id, task_id, cognitive_score_rate, attitude_score_rate, capability_score_rate,
     overall_score, level, profile_type, diagnosis, recommendations, radar, generated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  for (const t of teachers) {
    if (t.status !== 'completed') continue
    const overall = computeOverall(t.cognitive, t.attitude, t.capability)
    const level = determineLevel(overall).level
    const profile = identifyProfile(t.cognitive, t.attitude, t.capability)
    const rec = generateRecommendations(profile, t.deficiencies)
    const diagnosis = JSON.stringify({ strengths: t.strengths, deficiencies: t.deficiencies, normDelta: t.normDelta })
    const recommendations = JSON.stringify(rec)
    const radar = JSON.stringify(t.radar)
    ins.run(
      'R-' + t.id, t.id, 'A2026-01',
      t.cognitive, t.attitude, t.capability,
      overall, level, profile, diagnosis, recommendations, radar,
      '2026-09-05 10:00'
    )
  }
}

function seedFeedbacks(db, teachers) {
  const ins = db.prepare(`INSERT INTO employer_feedbacks
    (id, employer_id, teacher_id, language_score, teaching_score, culture_knowledge_score,
     china_knowledge_score, positive_attitude_score, initiative_score, narrative_score,
     total_score, deficiencies, comments, collected_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  for (const t of teachers) {
    if (t.status !== 'completed') continue
    const e = t.employer
    ins.run(
      'F-' + t.id, 'EMP-' + t.id, t.id,
      e.语言, e.教学, e.文化知识, e.国情知识, e.态度, e.主动性, e.叙事,
      e.total || round1((e.语言 + e.教学 + e.文化知识 + e.国情知识 + e.态度 + e.主动性 + e.叙事) / 7),
      JSON.stringify(t.deficiencies),
      '用人单位综合评价（模拟）',
      '2026-09-06 14:00'
    )
  }
}

function seedAlerts(db) {
  const ins = db.prepare(
    'INSERT INTO alerts (teacher_name, teacher_code, kind, level, dim, detail) VALUES (?,?,?,?,?,?)'
  )
  for (const a of alerts) {
    ins.run(a.teacher, a.code, a.kind, a.level, a.dim, a.detail)
  }
}

function seedT001Records(db) {
  // 知识测评记录
  db.prepare(`INSERT INTO knowledge_test_records
    (id, teacher_id, task_id, objective_score, subjective_score, total_score, duration_seconds, completed_at)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run('KT-T001', 'T001', 'A2026-01', knowledgeTest.objective, knowledgeTest.subjective,
      knowledgeTest.objective + knowledgeTest.subjective, knowledgeTest.durationSeconds, knowledgeTest.completedAt)

  // 认知地图记录（从 branches 计算派生分）
  const branches = conceptMap.branches
  const breadth = round1(branches.reduce((s, b) => s + b.nodes.length, 0) / branches.length)
  const depth = 3.3
  db.prepare(`INSERT INTO concept_map_records
    (id, teacher_id, task_id, map_data, breadth_score, depth_score, structure_score, connection_score, personal_score, weighted_total, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run('CM-T001', 'T001', 'A2026-01', JSON.stringify(conceptMap),
      breadth, depth, conceptMap.structure, 4.2, conceptMap.personalMarks, 4.01, '2026-09-05 11:00')

  // 态度量表记录
  db.prepare(`INSERT INTO attitude_scale_records
    (id, teacher_id, task_id, identity_score, motivation_score, empathy_score, reflection_score, total_score, completed_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run('AT-T001', 'T001', 'A2026-01', 42, 40, 38, 36, 156, '2026-09-05 09:30')

  // 叙事能力评价记录
  db.prepare(`INSERT INTO narrative_evaluation_records
    (id, teacher_id, task_id, task_type, conversion_score, attraction_score, explanation_score, audience_score, weighted_total, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run('NE-T001', 'T001', 'A2026-01', '叙事讲述', 3.2, 3.4, 3.6, 3.0, 3.3, '2026-09-06 15:00')

  // 培养单位自评记录
  db.prepare(`INSERT INTO unit_self_assessments
    (id, unit_id, task_id, scores, total_score, score_rate, submitted_at)
    VALUES (?,?,?,?,?,?,?)`)
    .run('UA-T001', 'U001', 'A2026-02', JSON.stringify({ 课程建设: 4, 师资水平: 3, 实践资源: 3 }), 10, 66.7, '2026-09-06 16:00')
}
