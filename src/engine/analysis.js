// ============================================================
// AI 辅助分析（对应文档 §4）
// 认知地图解析 / 访谈文本分析 / 多源数据融合 —— demo 版确定式计算
// ============================================================

// §4.1 认知地图 AI 解析：由节点/边自动计算五维评分参考值
export function parseConceptMap(mapData) {
  const nodes = mapData.nodes || []
  const edges = mapData.edges || []

  const depthLevels = maxDepth(nodes)
  const breadth = clamp(nodes.length / 20 * 5)
  const depth = clamp(depthLevels / 3 * 5)
  const structure = clamp(mapData.structure ?? 4)
  const crossBranch = (mapData.crossBranchEdges ?? countCrossBranch(edges))
  const connection = clamp(crossBranch / 6 * 5)
  const personalMarks = mapData.personalMarks ?? 4
  const personal = clamp(personalMarks / 5 * 5)

  const weighted = round2(
    0.20 * breadth + 0.25 * depth + 0.20 * structure +
    0.20 * connection + 0.15 * personal
  )

  return {
    breadth: round1(breadth),
    depth: round1(depth),
    structure: round1(structure),
    connection: round1(connection),
    personal: round1(personal),
    weighted,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    maxDepth: depthLevels
  }
}

// §4.2 访谈文本情感与主题分析
export function analyzeInterviewText(text) {
  const sentiment = 0.62 // demo：来自情感分析器，-1 ~ 1
  const sentimentLabel = sentiment > 0.2 ? '积极' : sentiment > -0.2 ? '中性' : '消极'

  const topics = ['国情认知', '文化认同', '叙事传播', '教学反思', '职业认同']

  const dimensions = {
    知华: countRefs(text, ['国情', '制度', '发展', '挑战']),
    友华: countRefs(text, ['喜欢', '认同', '敬佩', '友好']),
    传华: countRefs(text, ['讲述', '传播', '分享', '表达'])
  }
  const dominant = Object.keys(dimensions).reduce((a, b) =>
    dimensions[a] >= dimensions[b] ? a : b
  )

  return { sentiment, sentimentLabel, topics, dimensions, dominantDimension: dominant }
}

// §4.3 多源数据融合（问卷 / 地图 / 访谈 → 三维得分 + 置信度）
export function multiSourceFusion(questionnaire, map, interview) {
  const cognitive = round1(
    0.40 * questionnaire.cognitive + 0.30 * map.cognitive + 0.30 * interview.cognitive
  )
  const attitude = round1(
    0.50 * questionnaire.attitude + 0.25 * map.attitude + 0.25 * interview.attitude
  )
  const capability = round1(
    0.35 * questionnaire.capability + 0.35 * map.capability + 0.30 * interview.capability
  )
  const overall = round1(0.30 * cognitive + 0.30 * attitude + 0.40 * capability)

  const consistency = round2(
    1 - (range([questionnaire.total, map.total, interview.total]) / 100)
  )
  const confidence = consistency > 0.8 ? '高' : consistency > 0.6 ? '中' : '低'

  return { cognitive, attitude, capability, overall, consistency, confidence }
}

// —— 工具函数 ——
function maxDepth(nodes) {
  let max = 0
  for (const n of nodes) {
    max = Math.max(max, n.level || 0)
  }
  return max
}
function countCrossBranch(edges) {
  return (edges || []).filter((e) => e.cross).length
}
function countRefs(text, words) {
  return words.reduce((sum, w) => sum + (text.includes(w) ? 1 : 0), 0)
}
function range(arr) {
  return Math.max(...arr) - Math.min(...arr)
}
function clamp(v) {
  return Math.max(0, Math.min(5, v))
}
function round1(n) {
  return Math.round(n * 10) / 10
}
function round2(n) {
  return Math.round(n * 100) / 100
}
