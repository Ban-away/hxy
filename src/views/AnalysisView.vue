<script setup>
import { ref, computed } from 'vue'
import BaseChart from '../components/BaseChart.vue'
import Icon from '../components/Icon.vue'
import { threeParty, conceptMap, interview, surveyConclusion } from '../data/mock.js'
import { SERIES, INK, CHROME, STATUS, STATUS_LABEL, baseTextStyle, baseTooltip } from '../theme.js'
import { checkGapAlerts } from '../engine/scoring.js'
import { parseConceptMap, analyzeInterviewText, multiSourceFusion } from '../engine/analysis.js'

const tab = ref('gap')
const tabs = [
  { key: 'gap', label: '三方差距分析', icon: 'layers' },
  { key: 'map', label: '认知地图', icon: 'map' },
  { key: 'interview', label: '访谈分析', icon: 'file' },
  { key: 'survey', label: '调研结论', icon: 'book' }
]

// —— 多源数据融合（§4.3）——
const fusion = multiSourceFusion(
  { cognitive: 78, attitude: 82, capability: 74, total: 74.6 },
  { cognitive: 72, attitude: 80, capability: 66, total: 70 },
  { cognitive: 75, attitude: 78, capability: 70, total: 71 }
)

// —— 三方差距分析 ——
const gapPairs = ['单位-雇主', '单位-教师', '雇主-教师']
const gapAnalysis = computed(() =>
  threeParty.data.map((d) => {
    const unit = d.unit * 20
    const employer = d.employer * 20
    const teacher = d.teacher * 20
    return { dim: d.dim, unit, employer, teacher, ...checkGapAlerts(unit, employer, teacher) }
  })
)

const gapHeatmap = computed(() => {
  const data = []
  threeParty.data.forEach((d, row) => {
    const pairs = [
      Math.abs((d.unit - d.employer) * 20),
      Math.abs((d.unit - d.teacher) * 20),
      Math.abs((d.employer - d.teacher) * 20)
    ]
    pairs.forEach((v, col) => {
      data.push([col, row, Math.round(v * 10) / 10])
    })
  })
  return {
    textStyle: baseTextStyle(),
    tooltip: { ...baseTooltip(), formatter: (p) => `${threeParty.dimensions[p.value[1]]} · ${gapPairs[p.value[0]]}<br/>差距 <b>${p.value[2]}</b> 分` },
    grid: { left: 8, right: 20, top: 10, bottom: 60, containLabel: true },
    xAxis: { type: 'category', data: gapPairs, splitArea: { show: false }, axisLabel: { color: INK.secondary, fontSize: 12 } },
    yAxis: { type: 'category', data: threeParty.dimensions, splitArea: { show: false }, axisLabel: { color: INK.secondary, fontSize: 12 } },
    visualMap: {
      min: 0, max: 10, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
      itemWidth: 12, itemHeight: 90,
      text: ['差距大', '差距小'],
      textStyle: { color: INK.muted, fontSize: 11 },
      inRange: { color: ['#eef3fb', '#cfe0f5', '#8fb8e6', '#3a6ba5', '#1f3d63'] }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: true, color: '#1f1f1f', fontSize: 12, formatter: (p) => p.value[2] },
      itemStyle: { borderColor: CHROME.surface, borderWidth: 2 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.2)' } }
    }]
  }
})

// —— 认知地图 ——
const mapData = computed(() => {
  const nodes = [{ name: conceptMap.center, level: 0 }]
  const edges = []
  conceptMap.branches.forEach((b) => {
    nodes.push({ name: b.name, level: 1 })
    edges.push({ from: conceptMap.center, to: b.name })
    b.nodes.forEach((n) => {
      nodes.push({ name: n, level: 2 })
      edges.push({ from: b.name, to: n })
    })
  })
  return {
    nodes,
    edges,
    crossBranchEdges: conceptMap.crossBranchEdges,
    personalMarks: conceptMap.personalMarks,
    structure: conceptMap.structure
  }
})
const mapScores = computed(() => parseConceptMap(mapData.value))
const branchColors = [SERIES[0], SERIES[2], SERIES[4], SERIES[1]]

// —— 访谈分析 ——
const interviewResult = computed(() => analyzeInterviewText(interview.text))
const sentimentMeter = computed(() => {
  const s = interviewResult.value.sentiment // -1 ~ 1
  const pct = (s + 1) / 2 * 100
  return { pct, label: interviewResult.value.sentimentLabel }
})

// —— 调研结论 ——
const priorityStars = (u) => '★'.repeat(Math.floor(u)) + (u % 1 ? '½' : '')
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">分析中心</h1>
      <p class="page-desc">AI 辅助分析 · 三方差距 · 认知地图 · 访谈文本 · 调研结论</p>
    </div>

    <!-- 多源数据融合 -->
    <div class="card fusion">
      <div class="fusion__head">
        <Icon name="layers" :size="20" class="muted" />
        <span class="card-title">多源数据融合</span>
        <span class="fusion__conf">置信度：<b>{{ fusion.confidence }}</b>（一致性 {{ fusion.consistency }}）</span>
      </div>
      <div class="fusion__grid">
        <div class="fusion__cell">
          <span class="fusion__k">认知水平</span>
          <span class="fusion__v" style="color: var(--c1)">{{ fusion.cognitive }}</span>
        </div>
        <div class="fusion__cell">
          <span class="fusion__k">情感态度</span>
          <span class="fusion__v" style="color: var(--c3)">{{ fusion.attitude }}</span>
        </div>
        <div class="fusion__cell">
          <span class="fusion__k">传播能力</span>
          <span class="fusion__v" style="color: var(--c2)">{{ fusion.capability }}</span>
        </div>
        <div class="fusion__cell fusion__cell--total">
          <span class="fusion__k">融合综合分</span>
          <span class="fusion__v">{{ fusion.overall }}</span>
        </div>
      </div>
      <div class="fusion__weights muted small">权重：问卷 40% / 地图 30% / 访谈 30%（分维度配置）</div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="t in tabs" :key="t.key"
        class="tab" :class="{ 'is-active': tab === t.key }"
        @click="tab = t.key"
      >
        <Icon :name="t.icon" :size="16" /> {{ t.label }}
      </button>
    </div>

    <!-- 三方差距 -->
    <div v-if="tab === 'gap'" class="grid two-col">
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">三方差距热力图</div><div class="card-subtitle">两两差距（分，5 点量表 ×20）· 阈值 10 分触发预警</div></div>
        </div>
        <BaseChart :option="gapHeatmap" :height="330" />
      </div>
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">差距预警清单</div><div class="card-subtitle">规则 4 · 加权综合差距</div></div>
        </div>
        <table class="table">
          <thead>
            <tr><th>维度</th><th class="num">加权差距</th><th>状态</th><th>建议</th></tr>
          </thead>
          <tbody>
            <tr v-for="g in gapAnalysis" :key="g.dim">
              <td class="strong">{{ g.dim }}</td>
              <td class="num strong">{{ g.gap }} 分</td>
              <td>
                <span class="badge" :class="`badge--status-${g.level === 'low' ? 'good' : g.level === 'medium' ? 'warning' : 'critical'}`">
                  {{ g.status }}
                </span>
              </td>
              <td class="muted">{{ g.action || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 认知地图 -->
    <div v-if="tab === 'map'" class="grid map-grid">
      <div class="card map-card">
        <div class="card-header">
          <div><div class="card-title">认知地图</div><div class="card-subtitle">教师「{{ conceptMap.teacher }}」· 中心概念「{{ conceptMap.center }}」</div></div>
        </div>
        <div class="mindmap">
          <div class="mindmap__center">中华文化</div>
          <div class="mindmap__line"></div>
          <div class="mindmap__branches">
            <div v-for="(b, i) in conceptMap.branches" :key="b.name" class="mindmap__branch">
              <div class="mindmap__branch-head" :style="{ borderColor: branchColors[i], color: branchColors[i] }">
                {{ b.name }}
                <span v-if="b.cross" class="mindmap__cross">跨分支</span>
              </div>
              <div class="mindmap__nodes">
                <span v-for="n in b.nodes" :key="n" class="mindmap__node">{{ n }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">五维评分</div><div class="card-subtitle">AI 解析自动计算（1–5）</div></div>
        </div>
        <div class="map-scores">
          <div v-for="s in [
            {k:'广度', v: mapScores.breadth}, {k:'深度', v: mapScores.depth},
            {k:'结构', v: mapScores.structure}, {k:'联结', v: mapScores.connection},
            {k:'个人化', v: mapScores.personal}
          ]" :key="s.k" class="map-scores__row">
            <span class="map-scores__k">{{ s.k }}</span>
            <div class="map-scores__track"><div class="map-scores__fill" :style="{ width: (s.v/5*100)+'%', background: SERIES[0] }"></div></div>
            <span class="map-scores__v">{{ s.v }}</span>
          </div>
          <div class="map-scores__total">
            <span>加权总分</span>
            <b>{{ mapScores.weighted }}</b>
            <span class="muted small">（0.20·广度 + 0.25·深度 + 0.20·结构 + 0.20·联结 + 0.15·个人化）</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 访谈分析 -->
    <div v-if="tab === 'interview'" class="grid two-col">
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">文本情感与主题分析</div><div class="card-subtitle">教师「{{ interview.teacher }}」访谈片段</div></div>
        </div>
        <blockquote class="quote">{{ interview.text }}</blockquote>
        <div class="sentiment">
          <div class="flex-between">
            <span class="sentiment__label">情感倾向</span>
            <span class="badge" :class="sentimentMeter.pct > 60 ? 'badge--good' : sentimentMeter.pct > 40 ? 'badge--general' : 'badge--improving'">
              {{ sentimentMeter.label }}
            </span>
          </div>
          <div class="sentiment__track">
            <div class="sentiment__fill" :style="{ left: sentimentMeter.pct + '%' }"></div>
          </div>
          <div class="sentiment__axis"><span>消极</span><span>中性</span><span>积极</span></div>
        </div>
        <div class="topics">
          <span class="topics__label">主题提取</span>
          <span v-for="tp in interviewResult.topics" :key="tp" class="topic-chip">{{ tp }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><div class="card-title">关键维度识别</div><div class="card-subtitle">知华 · 友华 · 传华 关键词频次</div></div>
        </div>
        <div class="dim-count">
          <div v-for="(v, k) in interviewResult.dimensions" :key="k" class="dim-count__row">
            <span class="dim-count__k">{{ k }}</span>
            <div class="dim-count__track"><div class="dim-count__fill" :style="{ width: (v/Math.max(...Object.values(interviewResult.dimensions))*100)+'%' }"></div></div>
            <span class="dim-count__v">{{ v }}</span>
          </div>
        </div>
        <div class="dominant">
          主导维度：<b>{{ interviewResult.dominantDimension }}</b>
        </div>
      </div>
    </div>

    <!-- 调研结论 -->
    <div v-if="tab === 'survey'" class="grid two-col">
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">核心发现</div><div class="card-subtitle">有效样本 {{ surveyConclusion.sample.total }} 份（高校 {{ surveyConclusion.sample.universities }} 所 · 用人单位 {{ surveyConclusion.sample.employers }} 家 · 教师 {{ surveyConclusion.sample.teachers }} 人）</div></div>
        </div>
        <ul class="findings">
          <li v-for="f in surveyConclusion.findings" :key="f.text" class="finding">
            <span class="finding__dot" :style="{ background: STATUS[f.level] }"></span>
            <div class="finding__body">
              <div class="finding__text">{{ f.text }}</div>
              <div class="finding__gap">{{ f.gap }}</div>
            </div>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="card-header">
          <div><div class="card-title">优先级排序（数据驱动）</div><div class="card-subtitle">按紧急度</div></div>
        </div>
        <ol class="priority">
          <li v-for="(p, i) in surveyConclusion.priorities" :key="p.text" class="priority__item">
            <span class="priority__idx">{{ i + 1 }}</span>
            <span class="priority__text">{{ p.text }}</span>
            <span class="priority__stars">{{ priorityStars(p.urgency) }}</span>
          </li>
        </ol>
        <div class="expected">
          <div class="expected__title">预期改进效果（1 年内）</div>
          <ul>
            <li v-for="e in surveyConclusion.expected" :key="e"><Icon name="check" :size="14" class="good" /> {{ e }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fusion { margin-bottom: var(--s4); }
.fusion__head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.fusion__conf { margin-left: auto; font-size: 13px; color: var(--ink-2); }
.fusion__conf b { color: var(--ink); }
.fusion__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.fusion__cell {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px; border-radius: var(--radius-md); background: var(--paper);
}
.fusion__cell--total { background: var(--brand-red-soft); }
.fusion__k { font-size: 12px; color: var(--muted); }
.fusion__v { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
.fusion__cell--total .fusion__v { color: var(--brand-red); }
.fusion__weights { margin-top: 12px; }

.tabs { display: flex; gap: 4px; margin-bottom: var(--s4); border-bottom: 1px solid var(--hairline); }
.tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 16px; font-size: 13px; font-weight: 500; color: var(--ink-2);
  border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .15s;
}
.tab:hover { color: var(--ink); }
.tab.is-active { color: var(--brand-red); border-bottom-color: var(--brand-red); }

.two-col { grid-template-columns: 1fr 1fr; }
.map-grid { grid-template-columns: 1.4fr 1fr; }

/* 认知地图 */
.mindmap { display: flex; align-items: center; gap: 20px; padding: 10px 0; }
.mindmap__center {
  flex: none; padding: 22px 18px; border-radius: 12px;
  background: var(--brand-red); color: #fff;
  font-family: var(--font-serif); font-size: 17px; font-weight: 700;
  box-shadow: 0 4px 16px rgba(192,58,43,.3);
}
.mindmap__line { width: 22px; height: 2px; background: var(--baseline); flex: none; }
.mindmap__branches { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.mindmap__branch { border: 1px solid var(--hairline); border-radius: 10px; padding: 12px; background: var(--surface); }
.mindmap__branch-head {
  font-size: 13px; font-weight: 600; border-left: 3px solid;
  padding-left: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
}
.mindmap__cross { font-size: 10px; color: var(--brand-gold); background: var(--brand-gold-soft); padding: 1px 6px; border-radius: 4px; }
.mindmap__nodes { display: flex; flex-wrap: wrap; gap: 6px; }
.mindmap__node { font-size: 12px; color: var(--ink-2); background: var(--paper); padding: 3px 9px; border-radius: 6px; }

.map-scores { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.map-scores__row { display: flex; align-items: center; gap: 12px; }
.map-scores__k { width: 52px; font-size: 13px; color: var(--ink-2); flex: none; }
.map-scores__track { flex: 1; height: 10px; border-radius: 5px; background: var(--paper-deep); overflow: hidden; }
.map-scores__fill { height: 100%; border-radius: 5px; }
.map-scores__v { width: 30px; text-align: right; font-size: 14px; font-weight: 650; }
.map-scores__total { display: flex; align-items: baseline; gap: 10px; padding-top: 10px; border-top: 1px solid var(--gridline); flex-wrap: wrap; }
.map-scores__total b { font-size: 20px; color: var(--brand-red); }

/* 访谈 */
.quote {
  margin: 0 0 16px; padding: 14px 16px;
  border-left: 3px solid var(--brand-gold);
  background: var(--paper); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 13px; line-height: 1.7; color: var(--ink-2);
}
.sentiment__label { font-size: 13px; color: var(--ink-2); }
.sentiment__track { position: relative; height: 10px; border-radius: 5px; margin-top: 14px;
  background: linear-gradient(90deg, #3a6ba5 0%, #c3c2b7 50%, #c03a2b 100%); }
.sentiment__fill { position: absolute; top: -4px; width: 4px; height: 18px; background: var(--ink); border-radius: 2px; transform: translateX(-2px); }
.sentiment__axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 8px; }
.topics { margin-top: 18px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.topics__label { font-size: 12px; color: var(--muted); margin-right: 4px; }
.topic-chip { font-size: 12px; color: var(--c1); background: #eaf1fb; padding: 3px 10px; border-radius: 999px; }

.dim-count { display: flex; flex-direction: column; gap: 16px; padding-top: 4px; }
.dim-count__row { display: flex; align-items: center; gap: 12px; }
.dim-count__k { width: 40px; font-size: 14px; font-weight: 600; color: var(--ink); }
.dim-count__track { flex: 1; height: 12px; border-radius: 6px; background: var(--paper-deep); overflow: hidden; }
.dim-count__fill { height: 100%; background: var(--c3); border-radius: 6px; }
.dim-count__v { width: 24px; text-align: right; font-size: 14px; font-weight: 650; }
.dominant { margin-top: 20px; padding: 12px; background: var(--paper); border-radius: 8px; font-size: 13px; color: var(--ink-2); }
.dominant b { color: var(--brand-red); }

/* 调研结论 */
.findings { display: flex; flex-direction: column; gap: 14px; }
.finding { display: flex; gap: 12px; }
.finding__dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 6px; flex: none; }
.finding__body { flex: 1; }
.finding__text { font-size: 14px; color: var(--ink); }
.finding__gap { font-size: 12px; color: var(--brand-red); margin-top: 2px; font-weight: 500; }

.priority { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.priority__item { display: flex; align-items: center; gap: 12px; }
.priority__idx {
  width: 24px; height: 24px; border-radius: 50%; flex: none;
  background: var(--brand-red); color: #fff; font-size: 13px; font-weight: 700;
  display: grid; place-items: center;
}
.priority__text { flex: 1; font-size: 14px; color: var(--ink); }
.priority__stars { color: var(--brand-gold); font-size: 14px; letter-spacing: 1px; }
.expected { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--gridline); }
.expected__title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
.expected ul { display: flex; flex-direction: column; gap: 6px; }
.expected li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); }
.expected .good { color: #0ca30c; }

@media (max-width: 900px) {
  .two-col, .map-grid { grid-template-columns: 1fr; }
  .fusion__grid { grid-template-columns: 1fr 1fr; }
}
</style>
