// ============================================================
// 模拟数据（与评分规则引擎联动，三维得分决定总分/等级/剖面）
// ============================================================

// —— 概览 KPI ——
export const stats = {
  totalTeachers: 156,
  assessing: 23,
  completed: 98,
  pending: 35,
  alerts: 5
}

// —— 教师库（三维得分率为百分制）——
export const teachers = [
  {
    id: 'T001', name: '朴智英', nationality: '韩国', nativeLanguage: '韩语',
    teachingYears: 5, chinaExperience: 'degree', institution: '首尔大学',
    cognitive: 78, attitude: 82, capability: 74,
    radar: { 内容知识: 80, 深度理解: 76, 情感认同: 85, 叙事能力: 72, 渠道运用: 68, 反思成长: 76 },
    strengths: ['对中国历史文化有较好了解', '友华情感积极'],
    deficiencies: ['叙事能力弱'],
    employer: { 语言: 4.1, 教学: 4.0, 文化知识: 3.8, 国情知识: 3.3, 态度: 4.4, 主动性: 4.0, 叙事: 3.2 },
    normDelta: { 认知: +8, 情感: +7, 能力: -4 }
  },
  {
    id: 'T002', name: '阮氏梅', nationality: '越南', nativeLanguage: '越南语',
    teachingYears: 3, chinaExperience: 'short_term', institution: '河内国家大学',
    cognitive: 50, attitude: 70, capability: 70,
    radar: { 内容知识: 48, 深度理解: 52, 情感认同: 74, 叙事能力: 68, 渠道运用: 70, 反思成长: 66 },
    strengths: ['态度端正，学习主动'],
    deficiencies: ['国情知识不足'],
    employer: { 语言: 3.8, 教学: 3.6, 文化知识: 3.0, 国情知识: 2.4, 态度: 4.0, 主动性: 3.9, 叙事: 3.4 },
    normDelta: { 认知: -20, 情感: -5, 能力: -2 }
  },
  {
    id: 'T003', name: '田中惠美', nationality: '日本', nativeLanguage: '日语',
    teachingYears: 7, chinaExperience: 'exchange', institution: '早稻田大学',
    cognitive: 72, attitude: 52, capability: 72,
    radar: { 内容知识: 74, 深度理解: 70, 情感认同: 48, 叙事能力: 70, 渠道运用: 72, 反思成长: 74 },
    strengths: ['语言功底扎实', '教学经验丰富'],
    deficiencies: ['情感投入不足'],
    employer: { 语言: 4.4, 教学: 4.2, 文化知识: 3.7, 国情知识: 3.5, 态度: 3.0, 主动性: 3.1, 叙事: 3.5 },
    normDelta: { 认知: +2, 情感: -23, 能力: 0 }
  },
  {
    id: 'T004', name: '卡洛斯', nationality: '西班牙', nativeLanguage: '西班牙语',
    teachingYears: 4, chinaExperience: 'none', institution: '马德里自治大学',
    cognitive: 74, attitude: 74, capability: 54,
    radar: { 内容知识: 76, 深度理解: 72, 情感认同: 78, 叙事能力: 50, 渠道运用: 52, 反思成长: 58 },
    strengths: ['文化理解深入', '表达热情高'],
    deficiencies: ['叙事能力弱', '渠道运用弱'],
    employer: { 语言: 3.9, 教学: 3.7, 文化知识: 3.8, 国情知识: 3.4, 态度: 4.2, 主动性: 4.0, 叙事: 2.6 },
    normDelta: { 认知: +4, 情感: -1, 能力: -18 }
  },
  {
    id: 'T005', name: '阿米娜', nationality: '巴基斯坦', nativeLanguage: '乌尔都语',
    teachingYears: 9, chinaExperience: 'degree', institution: '卡拉奇大学',
    cognitive: 88, attitude: 90, capability: 86,
    radar: { 内容知识: 90, 深度理解: 86, 情感认同: 92, 叙事能力: 85, 渠道运用: 82, 反思成长: 88 },
    strengths: ['全面均衡，可作为种子教师', '传播能力强'],
    deficiencies: [],
    employer: { 语言: 4.6, 教学: 4.5, 文化知识: 4.6, 国情知识: 4.4, 态度: 4.8, 主动性: 4.7, 叙事: 4.5 },
    normDelta: { 认知: +18, 情感: +15, 能力: +14 }
  },
  {
    id: 'T006', name: '苏哈娜', nationality: '印尼', nativeLanguage: '印尼语',
    teachingYears: 6, chinaExperience: 'short_term', institution: '印尼大学',
    cognitive: 82, attitude: 60, capability: 88,
    radar: { 内容知识: 84, 深度理解: 80, 情感认同: 56, 叙事能力: 88, 渠道运用: 90, 反思成长: 86 },
    strengths: ['新媒体传播能力强', '叙事有感染力'],
    deficiencies: ['情感认同波动'],
    employer: { 语言: 4.2, 教学: 4.3, 文化知识: 3.9, 国情知识: 3.8, 态度: 3.3, 主动性: 4.1, 叙事: 4.6 },
    normDelta: { 认知: +12, 情感: -15, 能力: +16 }
  },
  {
    id: 'T007', name: '艾米丽', nationality: '美国', nativeLanguage: '英语',
    teachingYears: 2, chinaExperience: 'none', institution: '加州大学',
    cognitive: 55, attitude: 80, capability: 78,
    radar: { 内容知识: 52, 深度理解: 58, 情感认同: 84, 叙事能力: 76, 渠道运用: 80, 反思成长: 74 },
    strengths: ['学习热情高', '表达能力强'],
    deficiencies: ['国情知识不足'],
    employer: { 语言: 3.6, 教学: 3.8, 文化知识: 2.8, 国情知识: 2.3, 态度: 4.3, 主动性: 4.4, 叙事: 4.0 },
    normDelta: { 认知: -15, 情感: +5, 能力: +6 }
  },
  {
    id: 'T008', name: '玛丽亚', nationality: '墨西哥', nativeLanguage: '西班牙语',
    teachingYears: 5, chinaExperience: 'exchange', institution: '墨西哥国立自治大学',
    cognitive: 76, attitude: 78, capability: 56,
    radar: { 内容知识: 78, 深度理解: 74, 情感认同: 80, 叙事能力: 54, 渠道运用: 56, 反思成长: 60 },
    strengths: ['情感投入高', '文化认同强'],
    deficiencies: ['叙事能力弱', '渠道运用弱'],
    employer: { 语言: 4.0, 教学: 3.9, 文化知识: 3.8, 国情知识: 3.6, 态度: 4.5, 主动性: 4.1, 叙事: 2.7 },
    normDelta: { 认知: +6, 情感: +3, 能力: -16 }
  },
  {
    id: 'T009', name: '阮明', nationality: '越南', nativeLanguage: '越南语',
    teachingYears: 4, chinaExperience: 'short_term', institution: '胡志明市师范大学',
    cognitive: 70, attitude: 50, capability: 74,
    radar: { 内容知识: 72, 深度理解: 68, 情感认同: 46, 叙事能力: 72, 渠道运用: 74, 反思成长: 76 },
    strengths: ['专业基础扎实'],
    deficiencies: ['情感投入不足'],
    employer: { 语言: 4.0, 教学: 3.9, 文化知识: 3.4, 国情知识: 3.2, 态度: 2.9, 主动性: 3.0, 叙事: 3.6 },
    normDelta: { 认知: 0, 情感: -25, 能力: +2 }
  },
  {
    id: 'T010', name: '达妮埃拉', nationality: '巴西', nativeLanguage: '葡萄牙语',
    teachingYears: 1, chinaExperience: 'none', institution: '圣保罗大学',
    cognitive: 48, attitude: 50, capability: 46,
    radar: { 内容知识: 50, 深度理解: 46, 情感认同: 52, 叙事能力: 44, 渠道运用: 48, 反思成长: 42 },
    strengths: ['潜力尚待开发'],
    deficiencies: ['国情知识不足', '叙事能力弱'],
    employer: { 语言: 3.2, 教学: 3.0, 文化知识: 2.6, 国情知识: 2.2, 态度: 3.5, 主动性: 3.4, 叙事: 2.5 },
    normDelta: { 认知: -22, 情感: -25, 能力: -26 }
  }
]

// —— 剖面类型分布（模拟整体分布）——
export const profileDistribution = [
  { name: '均衡型', value: 40 },
  { name: '认知短板型', value: 20 },
  { name: '情感薄弱型', value: 30 },
  { name: '能力不足型', value: 10 }
]

// —— 待处理预警 ——
export const alerts = [
  { id: 1, teacher: '张XX', code: 'T012', kind: '三方差距显著', level: 'critical', dim: '传播能力', detail: '自评与用人单位评价差距 12.4 分' },
  { id: 2, teacher: '李XX', code: 'T045', kind: '认知得分偏低', level: 'serious', dim: '国情知识', detail: '认知维度得分率 48%，低于常模 22 分' },
  { id: 3, teacher: '王XX', code: 'T078', kind: '叙事能力弱', level: 'serious', dim: '叙事能力', detail: '叙事维度 2.8/5，未达培养目标' },
  { id: 4, teacher: '赵XX', code: 'T091', kind: '数据异常', level: 'warning', dim: '量表', detail: '态度量表作答时间过短，建议复核' },
  { id: 5, teacher: '林XX', code: 'T112', kind: '进度滞后', level: 'warning', dim: '评估任务', detail: '超时未提交，已自动催答 2 次' }
]

// —— 三方对比（5 点量表，培养单位自评 / 用人单位 / 教师自评）——
export const threeParty = {
  dimensions: ['国情知识', '文化理解', '叙事传播', '情感态度', '教学能力'],
  data: [
    { dim: '国情知识', unit: 3.3, employer: 3.1, teacher: 3.2 },
    { dim: '文化理解', unit: 3.6, employer: 3.4, teacher: 3.8 },
    { dim: '叙事传播', unit: 2.9, employer: 2.6, teacher: 3.1 },
    { dim: '情感态度', unit: 3.8, employer: 3.7, teacher: 3.9 },
    { dim: '教学能力', unit: 3.5, employer: 3.3, teacher: 3.4 }
  ]
}

// —— 进步趋势（历次评估，百分制）——
export const trend = {
  quarters: ['2024Q1', '2024Q2', '2024Q3', '2024Q4', '2025Q1', '2025Q2', '2025Q3', '2025Q4', '2026Q1', '2026Q2'],
  cognitive: [62, 64, 63, 67, 69, 71, 72, 74, 75, 78],
  attitude: [70, 71, 72, 73, 74, 76, 77, 78, 80, 82],
  capability: [55, 56, 58, 60, 61, 63, 64, 66, 67, 68]
}

// —— 常模参照（区域均值）——
export const norms = {
  region: '东南亚 · 本土中文教师',
  sampleSize: 1240,
  updatedAt: '2026-01',
  cognitive: { mean: 70, std: 9.2 },
  attitude: { mean: 75, std: 8.1 },
  capability: { mean: 72, std: 9.8 },
  overall: { mean: 72.5, std: 7.9 }
}

// —— 评估任务 ——
export const assessmentTasks = [
  { id: 'A2026-01', name: '2026 年度本土中文教师综合评估', type: 'individual', status: 'ongoing', start: '2026-09-01', end: '2026-09-30', tools: ['知识测评', '态度量表', '叙事评价'], participants: 156, completed: 98, progress: 63 },
  { id: 'A2026-02', name: '东南亚区培养单位自评', type: 'unit', status: 'pending', start: '2026-10-08', end: '2026-10-31', tools: ['单位自评表'], participants: 28, completed: 0, progress: 0 },
  { id: 'A2026-03', name: '“讲好中国故事”叙事能力专题评估', type: 'combined', status: 'ongoing', start: '2026-08-15', end: '2026-09-20', tools: ['叙事评价', '认知地图'], participants: 42, completed: 31, progress: 74 },
  { id: 'A2026-04', name: '2025 年度本土中文教师综合评估', type: 'individual', status: 'completed', start: '2025-09-01', end: '2025-09-30', tools: ['知识测评', '态度量表', '叙事评价', '认知地图'], participants: 138, completed: 132, progress: 100 },
  { id: 'A2026-05', name: '非洲区本土中文教师现状调研', type: 'combined', status: 'draft', start: '2026-11-01', end: '2026-11-30', tools: ['调研问卷'], participants: 0, completed: 0, progress: 0 }
]

// —— 评估全生命周期步骤（§6.1）——
export const lifecycle = [
  { step: 1, name: '发起评估', items: ['按模板创建评估任务', '匹配参与教师名单', '分配评估工具组合', '生成评估 ID 与二维码'] },
  { step: 2, name: '数据采集', items: ['向教师推送任务通知', '实时监控完成进度', '超时自动提醒', '实时数据校验与清洗'] },
  { step: 3, name: '智能分析', items: ['知识测评自动判卷', '认知地图 AI 解析', '量表自动计分', '多源数据融合'] },
  { step: 4, name: '诊断报告', items: ['生成个体评估报告', '生成单位汇总报告', '提供智能建议', '推送给相关人员'] },
  { step: 5, name: '持续追踪', items: ['建立教师发展档案', '追踪进步趋势', '定期推送追踪问卷', '更新常模数据'] }
]

// —— 认知地图（样例）——
export const conceptMap = {
  teacher: 'T001',
  center: '中华文化',
  branches: [
    { name: '国情知识', nodes: ['政治制度', '经济发展', '社会发展', '当代挑战'], cross: true },
    { name: '历史文化', nodes: ['古代文明', '近代历程', '现代转型'] },
    { name: '价值理念', nodes: ['和合思想', '家国情怀', '人类命运共同体'] },
    { name: '当代传播', nodes: ['新媒体', '短视频', '国际传播'], cross: true }
  ],
  personalMarks: 4,
  crossBranchEdges: 5,
  structure: 4.2
}

// —— 访谈文本（样例）——
export const interview = {
  teacher: 'T001',
  text: '我来到中国后，对这里的制度和发展有了更真切的理解。我很认同中国的发展道路，也很敬佩中国人民的奋斗精神。回到韩国后，我经常在课堂上向学生讲述中国的真实情况，分享我的所见所闻。我希望能通过自己的表达，让更多韩国学生喜欢和理解中国。'
}

// —— 知识测评样例结果 ——
export const knowledgeTest = {
  teacher: 'T001',
  objective: 48,    // 客观题 15×4=60 中得 48
  subjective: 32,   // 主观题 2×20=40 中得 32
  durationSeconds: 1980,
  completedAt: '2026-09-05 10:24'
}

// —— 调研结论（§8.2）——
export const surveyConclusion = {
  sample: { total: 100, universities: 10, employers: 50, teachers: 40 },
  findings: [
    { text: '国情类课程占比仅 14.2%（目标值 ≥25%）', gap: '差距 10.8%', level: 'critical' },
    { text: '知华友华列为毕业要求仅 20%', gap: '差距显著', level: 'critical' },
    { text: '叙事传播能力三方均值仅 2.8/5', gap: '普遍短板', level: 'serious' },
    { text: '用人单位最需国情知识，但供给严重不足', gap: '供需错位', level: 'serious' }
  ],
  priorities: [
    { text: '国情类课程占比提升', urgency: 5 },
    { text: '叙事传播能力培养体系建设', urgency: 5 },
    { text: '知华友华明确列为毕业要求', urgency: 4.5 },
    { text: '培养单位师资与课程资源建设', urgency: 4.5 }
  ],
  expected: [
    '国情课占比提升至 20%+',
    '教师叙事能力自评提升至 3.5+',
    '用人单位满意度提升至 3.5+'
  ]
}

// —— 规则库（§3.2）——
export const rules = [
  { id: 'R1', name: '知识测评自动判分', desc: '客观题 15×4=60 分，主观题 2×20=40 分（AI 辅助评分）', trigger: 'IF 提交知识测评 THEN 自动判分' },
  { id: 'R2', name: '等级判定', desc: '优秀 ≥85 / 良好 ≥70 / 一般 ≥55 / 待提升 <55', trigger: 'IF overall_score 落入区间 THEN 定级' },
  { id: 'R3', name: '剖面类型识别', desc: '三维得分相对均值偏离 >10% 判定短板', trigger: 'IF 维度偏差显著 THEN 识别剖面' },
  { id: 'R4', name: '差距预警', desc: '三方加权差距 ≥10 分触发显著差距预警', trigger: 'IF weighted_gap ≥10 THEN 立即核查' },
  { id: 'R5', name: '推荐方案生成', desc: '按剖面类型 + 具体短板生成个性化建议', trigger: 'IF 完成诊断 THEN 生成推荐' }
]

// —— 指标库（§1.2 公式对应的指标体系）——
export const indicators = [
  { dim: '认知水平', weight: '0.30', sub: ['内容知识 S_content (1/3)', '深度理解 S_depth (1/3)', '感知能力 S_perception (1/3)'], color: 'var(--c1)' },
  { dim: '情感态度', weight: '0.30', sub: ['身份认同 S_identity (1/3)', '动机投入 S_motivation (1/3)', '共情能力 S_empathy (1/3)'], color: 'var(--c3)' },
  { dim: '传播能力', weight: '0.40', sub: ['叙事能力 S_narrative (1/4)', '渠道运用 S_channel (1/4)', '传播效果 S_effect (1/4)', '反思成长 S_reflection (1/4)'], color: 'var(--c2)' }
]

// —— 模板库 ——
export const templates = [
  { id: 'TP1', name: '年度综合评估模板', tools: 4, usage: 156, updated: '2026-08' },
  { id: 'TP2', name: '叙事能力专题评估模板', tools: 2, usage: 42, updated: '2026-07' },
  { id: 'TP3', name: '现状快速调研模板', tools: 1, usage: 100, updated: '2026-06' },
  { id: 'TP4', name: '人才培养单位自评模板', tools: 1, usage: 28, updated: '2026-05' }
]

// —— 部署方式（§7.1）——
export const deployment = [
  { name: 'SaaS 云平台', scene: '多机构共享使用', note: '开箱即用，按需付费，自动更新' },
  { name: '私有化部署', scene: '数据安全性要求高', note: '部署在机构内部，数据不出域' },
  { name: '混合部署', scene: '部分云端 + 部分本地', note: '核心数据本地，AI 能力云端调用' },
  { name: '轻量版（离线）', scene: '网络条件受限场景', note: '单机运行，支持基础功能，定期同步' }
]

// —— 评分等级配置 ——
export const levelConfig = {
  excellent: { label: '优秀', min: 85 },
  good: { label: '良好', min: 70 },
  general: { label: '一般', min: 55 },
  improving: { label: '待提升', min: 0 }
}
