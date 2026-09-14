// ============================================================
// 评分规则引擎（对应文档 §3 规则引擎）
// 纯函数、可测试：等级判定 / 剖面识别 / 差距预警 / 推荐生成 / 综合得分
// ============================================================

// 权重配置（文档 §1.2 核心公式）
export const WEIGHTS = {
  cognitive: 0.3,
  attitude: 0.3,
  capability: 0.4
}

// 综合得分（百分制 → 百分制）；weights 可自定义（系统管理员可调整系数）
export function computeOverall(cognitive, attitude, capability, weights = WEIGHTS) {
  const w = weights || WEIGHTS
  return round1(
    w.cognitive * cognitive +
    w.attitude * attitude +
    w.capability * capability
  )
}

// 规则 2：等级判定
export function determineLevel(overallScore) {
  if (overallScore >= 85) return { level: 'excellent', label: '优秀' }
  if (overallScore >= 70) return { level: 'good', label: '良好' }
  if (overallScore >= 55) return { level: 'general', label: '一般' }
  return { level: 'improving', label: '待提升' }
}

// 规则 3：剖面类型识别（三维得分率，百分制）
export function identifyProfile(cognitive, attitude, capability) {
  const mean = (cognitive + attitude + capability) / 3
  const d = {
    cognitive: cognitive - mean,
    attitude: attitude - mean,
    capability: capability - mean
  }
  const within = (x) => Math.abs(x) < 10

  if (within(d.cognitive) && within(d.attitude) && within(d.capability)) return '均衡型'
  if (d.cognitive < -10 && within(d.attitude) && within(d.capability)) return '认知短板型'
  if (d.attitude < -10 && within(d.cognitive) && within(d.capability)) return '情感薄弱型'
  if (d.capability < -10 && within(d.cognitive) && within(d.attitude)) return '能力不足型'
  return '混合型'
}

// 规则 4：三方差距预警（三方为百分制得分）
export function checkGapAlerts(a, b, c) {
  const gaps = {
    a_b: Math.abs(a - b),
    a_c: Math.abs(a - c),
    b_c: Math.abs(b - c)
  }
  const weightedGap = round1((gaps.a_b + gaps.a_c + gaps.b_c) / 3)

  if (weightedGap < 5) return { level: 'low', status: '无显著差距', action: null, gap: weightedGap }
  if (weightedGap < 10) return { level: 'medium', status: '存在一定差距', action: '建议关注', gap: weightedGap }
  return { level: 'high', status: '显著差距', action: '立即核查', gap: weightedGap }
}

// 规则 5：推荐方案生成
const PROFILE_RECOMS = {
  认知短板型: [
    '参加中国国情与文化深度研修课程',
    '使用《理解当代中国》教材进行系统学习',
    '参加“中国话语体系”专题研讨班'
  ],
  情感薄弱型: [
    '参加沉浸式文化体验活动',
    '安排与中国民众的深度交流机会',
    '参加“走读中国”社会实践'
  ],
  能力不足型: [
    '参加跨文化叙事能力工作坊',
    '参加短视频创作与传播实训',
    '参与“讲好中国故事”竞赛平台实践'
  ],
  混合型: [
    '参加跨文化叙事能力提升工作坊',
    '使用《理解当代中国》教材进行系统学习'
  ],
  均衡型: []
}

export function generateRecommendations(profileType, deficiencies = []) {
  const general = PROFILE_RECOMS[profileType] || []
  const personalized = []
  if (deficiencies.includes('国情知识不足')) personalized.push('加强国情知识系统学习')
  if (deficiencies.includes('叙事能力弱')) personalized.push('参加叙事能力提升工作坊')
  if (deficiencies.includes('渠道运用弱')) personalized.push('参加新媒体传播实训营')
  return { general, personalized }
}

// 规则 1：知识测评自动判分（demo 版）
// 客观题 15 题 × 4 分 = 60；主观题 2 题 × 20 分 = 40
export function scoreKnowledgeTest(answers, correctAnswers) {
  let objective = 0
  for (let i = 1; i <= 15; i++) {
    if (answers[`q${i}`] === correctAnswers[i]) objective += 4
  }
  const subjective = (answers.q16 || 0) + (answers.q17 || 0)
  const total = objective + subjective
  return { objective, subjective, total, rate: total }
}

// 分数段条形（个体报告用）
export function scoreBarMeta(score) {
  return {
    level: determineLevel(score),
    // 0-100 → 百分比宽度
    width: Math.max(0, Math.min(100, score))
  }
}

function round1(n) {
  return Math.round(n * 10) / 10
}
