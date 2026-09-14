<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseChart from '../components/BaseChart.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api.js'
import { SERIES, INK, CHROME, baseTextStyle, baseTooltip } from '../theme.js'
import { determineLevel } from '../engine/scoring.js'

const route = useRoute()
const router = useRouter()

const teacher = ref(null)
onMounted(async () => {
  try {
    teacher.value = await api.get(`/teachers/${route.params.id}`)
  } catch (e) {
    console.error('加载教师画像失败', e)
  }
})

// 综合分/等级/剖面/建议均由后端（规则引擎 + 可调系数）实时给出
const overall = computed(() => teacher.value.overall)
const level = computed(() => determineLevel(teacher.value.overall))
const profile = computed(() => teacher.value.profileType)
const recoms = computed(() => teacher.value.recommendations || { general: [], personalized: [] })

const radarDims = ['内容知识', '深度理解', '情感认同', '叙事能力', '渠道运用', '反思成长']
const normRadar = { 内容知识: 70, 深度理解: 70, 情感认同: 75, 叙事能力: 72, 渠道运用: 72, 反思成长: 72 }

const radarOption = computed(() => ({
  textStyle: baseTextStyle(),
  tooltip: baseTooltip(),
  radar: {
    indicator: radarDims.map((d) => ({ name: d, max: 100 })),
    radius: '62%',
    center: ['50%', '52%'],
    axisName: { color: INK.secondary, fontSize: 12 },
    splitArea: { areaStyle: { color: ['#ffffff', '#faf9f4'] } },
    splitLine: { lineStyle: { color: CHROME.gridline } },
    axisLine: { lineStyle: { color: CHROME.baseline } }
  },
  series: [{
    type: 'radar',
    data: [
      { name: '该教师', value: radarDims.map((d) => teacher.value.radar[d]), areaStyle: { color: 'rgba(192,58,43,.16)' }, lineStyle: { color: SERIES[7], width: 2 }, itemStyle: { color: SERIES[7] }, symbolSize: 4 },
      { name: '区域常模', value: radarDims.map((d) => normRadar[d]), areaStyle: { color: 'rgba(120,120,115,.05)' }, lineStyle: { color: '#a9a9a3', width: 2, type: 'dashed' }, itemStyle: { color: '#a9a9a3' }, symbol: 'none' }
    ]
  }]
}))

const dims = computed(() => [
  { key: '认知水平', score: teacher.value.cognitive, color: SERIES[0] },
  { key: '情感态度', score: teacher.value.attitude, color: SERIES[2] },
  { key: '传播能力', score: teacher.value.capability, color: SERIES[1] }
])

const employerItems = computed(() => {
  const e = teacher.value.employer
  return [
    { k: '语言水平', v: e.语言 },
    { k: '教学能力', v: e.教学 },
    { k: '文化知识', v: e.文化知识 },
    { k: '国情知识', v: e.国情知识 },
    { k: '积极态度', v: e.态度 },
    { k: '主动性', v: e.主动性 },
    { k: '叙事能力', v: e.叙事 }
  ]
})

const normDeltas = computed(() => {
  const d = teacher.value.normDelta
  return [
    { k: '认知水平', v: d.认知 },
    { k: '情感态度', v: d.情感 },
    { k: '传播能力', v: d.能力 }
  ]
})

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
function starLevel(i) {
  return i === 0 ? 5 : i === 1 ? 4 : 3
}
function deltaSign(v) {
  return v > 0 ? `+${v}` : `${v}`
}
</script>

<template>
  <div class="page">
    <button class="back" @click="router.push('/teachers')">
      <Icon name="arrowRight" :size="16" style="transform: rotate(180deg)" /> 返回教师库
    </button>

    <div v-if="!teacher" class="detail-empty">加载中…</div>

    <template v-if="teacher">
    <!-- 报告头 -->
    <div class="card report-head">
      <div class="report-head__left">
        <div class="report-head__name-row">
          <h1 class="report-head__name">{{ teacher.name }}</h1>
          <span v-if="teacher.id === 'T005'" class="badge badge--good">种子教师</span>
        </div>
        <div class="report-head__meta">
          <span>{{ teacher.id }}</span><i>·</i><span>{{ teacher.nationality }}</span><i>·</i>
          <span>教学 {{ teacher.teachingYears }} 年</span><i>·</i><span>{{ teacher.institution }}</span>
        </div>
        <div class="report-head__tags">
          <span class="tag">评估类型：年度评估</span>
          <span class="tag">评估时间：2026-09-05</span>
        </div>
      </div>
      <div class="report-head__score">
        <div class="hero">{{ overall }}</div>
        <div class="hero-label">综合得分</div>
        <div class="report-head__badges">
          <span class="badge" :class="`badge--${level.level}`">{{ level.label }}</span>
          <span class="badge badge--general">{{ profile }}</span>
        </div>
      </div>
    </div>

    <!-- 综合评分 + 雷达 -->
    <div class="grid two-col">
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">综合评分</div><div class="card-subtitle">三维得分率（百分制）</div></div>
        </div>
        <div class="dim-list">
          <div v-for="d in dims" :key="d.key" class="dim-row">
            <div class="flex-between">
              <span class="dim-row__key">{{ d.key }}</span>
              <span class="dim-row__score">{{ d.score }} 分</span>
            </div>
            <div class="dim-row__track">
              <div class="dim-row__fill" :style="{ width: d.score + '%', background: d.color }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><div class="card-title">能力画像</div><div class="card-subtitle">六维雷达 · 对比区域常模</div></div>
        </div>
        <BaseChart :option="radarOption" :height="260" />
      </div>
    </div>

    <!-- 智能诊断 + 发展建议 -->
    <div class="grid two-col">
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">智能诊断</div><div class="card-subtitle">规则引擎自动生成</div></div>
        </div>
        <div class="diag">
          <div class="diag__group">
            <div class="diag__label diag__label--good">优势</div>
            <ul class="diag__list">
              <li v-for="s in teacher.strengths" :key="s"><Icon name="check" :size="15" class="diag__ic good" /> {{ s }}</li>
            </ul>
          </div>
          <div class="diag__group">
            <div class="diag__label diag__label--bad">短板</div>
            <ul class="diag__list">
              <li v-for="d in teacher.deficiencies" :key="d"><Icon name="alert" :size="15" class="diag__ic bad" /> {{ d }}</li>
            </ul>
          </div>
          <div class="diag__group">
            <div class="diag__label">对比常模</div>
            <div class="diag__delta">
              <span v-for="n in normDeltas" :key="n.k" class="delta-chip" :class="{ pos: n.v > 0, neg: n.v < 0 }">
                {{ n.k }} {{ deltaSign(n.v) }} 分
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><div class="card-title">发展建议</div><div class="card-subtitle">按剖面类型 + 具体短板个性化推荐</div></div>
        </div>
        <ul class="recom">
          <li v-for="(r, i) in recoms.general" :key="r" class="recom__item">
            <span class="recom__stars">{{ stars(starLevel(i)) }}</span>
            <span class="recom__text">{{ r }}</span>
          </li>
          <li v-for="r in recoms.personalized" :key="r" class="recom__item recom__item--pers">
            <span class="recom__stars">{{ stars(4) }}</span>
            <span class="recom__text">{{ r }}</span>
          </li>
          <li v-if="!recoms.general.length && !recoms.personalized.length" class="recom__empty">
            该教师发展均衡，建议保持并深化示范引领。
          </li>
        </ul>
      </div>
    </div>

    <!-- 用人单位反馈 + 追踪规划 -->
    <div class="grid two-col">
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">用人单位反馈</div><div class="card-subtitle">7 项评价（5 点量表）</div></div>
        </div>
        <div class="employer-grid">
          <div v-for="e in employerItems" :key="e.k" class="employer-cell">
            <div class="flex-between">
              <span class="employer-cell__k">{{ e.k }}</span>
              <span class="employer-cell__v">{{ e.v }}</span>
            </div>
            <div class="employer-cell__track">
              <div class="employer-cell__fill" :style="{ width: (e.v / 5 * 100) + '%', background: SERIES[3] }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><div class="card-title">追踪规划</div><div class="card-subtitle">持续追踪 · 建立发展档案</div></div>
        </div>
        <div class="plan">
          <div class="plan__row"><span class="plan__k">下次评估</span><span class="plan__v">2027-03-05</span></div>
          <div class="plan__row"><span class="plan__k">干预周期</span><span class="plan__v">6 个月</span></div>
          <div class="plan__row"><span class="plan__k">目标提升</span><span class="plan__v">传播能力达到 75 分以上</span></div>
          <div class="plan__row"><span class="plan__k">报告版本</span><span class="plan__v">V2.3 · 2026-09-05 15:30:22</span></div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-2);
  font-size: 13px;
  margin-bottom: var(--s4);
}
.back:hover { color: var(--brand-red); }
.detail-empty { padding: 60px 0; text-align: center; color: var(--muted); font-size: 14px; }

.report-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s5); margin-bottom: var(--s4); }
.report-head__name { font-family: var(--font-serif); font-size: 26px; font-weight: 700; }
.report-head__name-row { display: flex; align-items: center; gap: 10px; }
.report-head__meta { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; margin-top: 6px; }
.report-head__meta i { font-style: normal; color: var(--baseline); }
.report-head__tags { display: flex; gap: 8px; margin-top: 10px; }
.tag { font-size: 12px; color: var(--ink-2); background: var(--paper); padding: 3px 10px; border-radius: 6px; }
.report-head__score { text-align: center; min-width: 130px; }
.hero { font-size: 46px; font-weight: 700; color: var(--brand-red); line-height: 1; font-variant-numeric: tabular-nums; }
.hero-label { font-size: 12px; color: var(--muted); margin: 4px 0 10px; }
.report-head__badges { display: flex; gap: 8px; justify-content: center; }

.two-col { grid-template-columns: 1fr 1fr; }

.dim-list { display: flex; flex-direction: column; gap: 18px; padding-top: 4px; }
.dim-row__key { font-size: 14px; color: var(--ink); font-weight: 500; }
.dim-row__score { font-size: 14px; font-weight: 650; color: var(--ink); }
.dim-row__track { height: 12px; border-radius: 6px; background: var(--paper-deep); margin-top: 8px; overflow: hidden; }
.dim-row__fill { height: 100%; border-radius: 6px; }

.diag { display: flex; flex-direction: column; gap: 16px; }
.diag__group { display: flex; flex-direction: column; gap: 8px; }
.diag__label { font-size: 12px; font-weight: 600; color: var(--muted); }
.diag__label--good { color: #08730c; }
.diag__label--bad { color: var(--brand-red); }
.diag__list { display: flex; flex-direction: column; gap: 6px; }
.diag__list li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); }
.diag__ic.good { color: #0ca30c; }
.diag__ic.bad { color: #d03b3b; }
.diag__delta { display: flex; flex-wrap: wrap; gap: 8px; }
.delta-chip { font-size: 12px; padding: 3px 10px; border-radius: 6px; font-weight: 500; }
.delta-chip.pos { color: #08730c; background: #e6f5e6; }
.delta-chip.neg { color: #a02727; background: #fbe3e3; }

.recom { display: flex; flex-direction: column; gap: 12px; padding-top: 2px; }
.recom__item { display: flex; align-items: flex-start; gap: 10px; }
.recom__item--pers { background: var(--brand-gold-soft); padding: 8px 12px; border-radius: 8px; }
.recom__stars { color: var(--brand-gold); font-size: 13px; letter-spacing: 1px; flex: none; }
.recom__text { font-size: 13px; color: var(--ink); }
.recom__empty { font-size: 13px; color: var(--muted); padding: 12px; background: var(--paper); border-radius: 8px; }

.employer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; padding-top: 4px; }
.employer-cell__k { font-size: 13px; color: var(--ink-2); }
.employer-cell__v { font-size: 14px; font-weight: 650; color: var(--ink); }
.employer-cell__track { height: 8px; border-radius: 4px; background: var(--paper-deep); margin-top: 6px; overflow: hidden; }
.employer-cell__fill { height: 100%; border-radius: 4px; }

.plan { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.plan__row { display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--gridline); }
.plan__row:last-child { border-bottom: none; padding-bottom: 0; }
.plan__k { font-size: 13px; color: var(--muted); }
.plan__v { font-size: 13px; font-weight: 600; color: var(--ink); }

@media (max-width: 900px) {
  .two-col { grid-template-columns: 1fr; }
  .report-head { flex-direction: column; align-items: flex-start; }
  .report-head__score { align-self: flex-start; text-align: left; }
  .report-head__badges { justify-content: flex-start; }
}
</style>
