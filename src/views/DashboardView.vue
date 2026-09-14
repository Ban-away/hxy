<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseChart from '../components/BaseChart.vue'
import StatCard from '../components/StatCard.vue'
import Icon from '../components/Icon.vue'
import { api } from '../api.js'
import {
  SERIES, CHROME, INK, STATUS, STATUS_LABEL,
  baseTextStyle, baseAxis, baseTooltip, baseLegend
} from '../theme.js'
import { determineLevel } from '../engine/scoring.js'

const radarDims = ['内容知识', '深度理解', '情感认同', '叙事能力', '渠道运用', '反思成长']
const normRadar = { 内容知识: 70, 深度理解: 70, 情感认同: 75, 叙事能力: 72, 渠道运用: 72, 反思成长: 72 }

// —— 后端数据（SQLite）——
const stats = ref({ totalTeachers: 0, assessing: 0, completed: 0, pending: 0, alerts: 0 })
const teachers = ref([])
const profileDistribution = ref([])
const alerts = ref([])
const threeParty = ref({ dimensions: [], data: [] })
const trend = ref({ quarters: [], cognitive: [], attitude: [], capability: [] })
const norms = ref({ region: '', sampleSize: 0, updatedAt: '', cognitive: { mean: 0, std: 0 }, attitude: { mean: 0, std: 0 }, capability: { mean: 0, std: 0 }, overall: { mean: 0, std: 0 } })

onMounted(async () => {
  try {
    const [s, t, pd, al, tp, tr, nm] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/teachers?status=completed&pageSize=200'),
      api.get('/dashboard/profile-distribution'),
      api.get('/dashboard/alerts'),
      api.get('/dashboard/three-party'),
      api.get('/dashboard/trend'),
      api.get('/dashboard/norms')
    ])
    stats.value = s
    teachers.value = t.items
    profileDistribution.value = pd
    alerts.value = al
    threeParty.value = tp
    trend.value = tr
    norms.value = nm
  } catch (e) {
    console.error('加载概览数据失败', e)
  }
})

const selectedTeacherId = ref('T001')
const selectedTeacher = computed(() => teachers.value.find((t) => t.id === selectedTeacherId.value) || null)

const teacherMeta = computed(() => {
  const t = selectedTeacher.value
  if (!t) return { overall: 0, level: '待提升', levelKey: 'improving', profile: '' }
  const lv = determineLevel(t.overall)
  return { overall: t.overall, level: lv.label, levelKey: lv.level, profile: t.profileType }
})

// —— KPI ——
const kpiCards = computed(() => [
  { label: '总教师', value: stats.value.totalTeachers, delta: '+12 本季度', tone: 'jade', accent: 'var(--c1)' },
  { label: '评估中', value: stats.value.assessing, delta: '进行中', tone: 'neutral', accent: 'var(--c2)' },
  { label: '已完成', value: stats.value.completed, delta: '+8% 同比', tone: 'jade', accent: 'var(--c3)' },
  { label: '待评估', value: stats.value.pending, delta: '-5 本周', tone: 'gold', accent: 'var(--c4)' },
  { label: '预警', value: stats.value.alerts, delta: '需关注', tone: 'red', accent: 'var(--status-critical)' }
])

// —— 雷达图 ——
const radarOption = computed(() => ({
  textStyle: baseTextStyle(),
  tooltip: baseTooltip(),
  legend: { ...baseLegend(), data: ['该教师', '区域常模'], bottom: 0, left: 'center' },
  radar: {
    indicator: radarDims.map((d) => ({ name: d, max: 100 })),
    radius: '60%',
    center: ['50%', '46%'],
    axisName: { color: INK.secondary, fontSize: 12 },
    splitArea: { areaStyle: { color: ['#ffffff', '#faf9f4'] } },
    splitLine: { lineStyle: { color: CHROME.gridline } },
    axisLine: { lineStyle: { color: CHROME.baseline } }
  },
  series: [{
    type: 'radar',
    data: [
      {
        name: '该教师',
        value: radarDims.map((d) => (selectedTeacher.value ? selectedTeacher.value.radar[d] : 0)),
        areaStyle: { color: 'rgba(192, 58, 43, 0.16)' },
        lineStyle: { color: SERIES[7], width: 2 },
        itemStyle: { color: SERIES[7] },
        symbolSize: 4
      },
      {
        name: '区域常模',
        value: radarDims.map((d) => normRadar[d]),
        areaStyle: { color: 'rgba(120, 120, 115, 0.05)' },
        lineStyle: { color: '#a9a9a3', width: 2, type: 'dashed' },
        itemStyle: { color: '#a9a9a3' },
        symbol: 'none'
      }
    ]
  }]
}))

// —— 三方对比（水平分组柱状）——
const threePartyOption = computed(() => ({
  textStyle: baseTextStyle(),
  tooltip: { ...baseTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { ...baseLegend(), data: ['培养单位自评', '用人单位评价', '教师自评'], top: 0, right: 0 },
  grid: { left: 8, right: 40, top: 34, bottom: 0, containLabel: true },
  xAxis: { ...baseAxis(), type: 'value', max: 5, splitLine: { show: true, lineStyle: { color: CHROME.gridline } } },
  yAxis: {
    ...baseAxis(),
    type: 'category',
    data: threeParty.value.dimensions,
    splitLine: { show: false }
  },
  series: [
    { name: '培养单位自评', type: 'bar', barWidth: 8, itemStyle: { color: SERIES[0], borderRadius: [0, 4, 4, 0] }, data: threeParty.value.data.map((d) => d.unit) },
    { name: '用人单位评价', type: 'bar', barWidth: 8, itemStyle: { color: SERIES[1], borderRadius: [0, 4, 4, 0] }, data: threeParty.value.data.map((d) => d.employer) },
    { name: '教师自评', type: 'bar', barWidth: 8, itemStyle: { color: SERIES[2], borderRadius: [0, 4, 4, 0] }, data: threeParty.value.data.map((d) => d.teacher) }
  ]
}))

// —— 进步趋势（折线）——
const trendOption = computed(() => ({
  textStyle: baseTextStyle(),
  tooltip: { ...baseTooltip(), trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: CHROME.baseline } } },
  legend: { ...baseLegend(), data: ['认知水平', '情感态度', '传播能力'], top: 0, right: 0 },
  grid: { left: 8, right: 16, top: 34, bottom: 0, containLabel: true },
  xAxis: { ...baseAxis(), type: 'category', boundaryGap: false, data: trend.value.quarters, splitLine: { show: false } },
  yAxis: { ...baseAxis(), type: 'value', min: 40, max: 100, splitLine: { show: true, lineStyle: { color: CHROME.gridline } } },
  series: [
    { name: '认知水平', type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 2, color: SERIES[0] }, itemStyle: { color: SERIES[0], borderColor: CHROME.surface, borderWidth: 2 }, data: trend.value.cognitive },
    { name: '情感态度', type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 2, color: SERIES[2] }, itemStyle: { color: SERIES[2], borderColor: CHROME.surface, borderWidth: 2 }, data: trend.value.attitude },
    { name: '传播能力', type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 2, color: SERIES[1] }, itemStyle: { color: SERIES[1], borderColor: CHROME.surface, borderWidth: 2 }, data: trend.value.capability }
  ]
}))

// —— 常模对照 ——
const normCompareOption = computed(() => ({
  textStyle: baseTextStyle(),
  tooltip: { ...baseTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { ...baseLegend(), data: ['该教师', '区域常模'], top: 0, right: 0 },
  grid: { left: 8, right: 16, top: 34, bottom: 0, containLabel: true },
  xAxis: { ...baseAxis(), type: 'category', data: ['认知水平', '情感态度', '传播能力'], splitLine: { show: false } },
  yAxis: { ...baseAxis(), type: 'value', max: 100, splitLine: { show: true, lineStyle: { color: CHROME.gridline } } },
  series: [
    { name: '该教师', type: 'bar', barWidth: 20, itemStyle: { color: SERIES[7], borderRadius: [4, 4, 0, 0] }, data: selectedTeacher.value ? [selectedTeacher.value.cognitive, selectedTeacher.value.attitude, selectedTeacher.value.capability] : [] },
    { name: '区域常模', type: 'bar', barWidth: 20, itemStyle: { color: '#c8c8c1', borderRadius: [4, 4, 0, 0] }, data: [norms.value.cognitive.mean, norms.value.attitude.mean, norms.value.capability.mean] }
  ]
}))

// —— 数据质量看板 ——
const dataQuality = [
  { label: '数据完整率', value: 96, color: 'var(--c3)' },
  { label: '量表信度 (α)', value: 87, color: 'var(--c1)' },
  { label: '问卷回收率', value: 82, color: 'var(--c2)' },
  { label: '常模样本量', value: 1240, color: 'var(--c7)', raw: true }
]
</script>

<template>
  <div class="page">
    <div class="page-head flex-between">
      <div>
        <h1 class="page-title">概览</h1>
        <p class="page-desc">本土中文教师中华文化传播力影响力 · 评估与调研数字化模型</p>
      </div>
      <div class="flex">
        <button class="btn btn--ghost"><Icon name="export" :size="16" /> 导出报告</button>
        <button class="btn btn--primary"><Icon name="plus" :size="16" /> 发起评估</button>
      </div>
    </div>

    <!-- KPI 行 -->
    <div class="kpi-grid">
      <StatCard
        v-for="k in kpiCards"
        :key="k.label"
        :label="k.label"
        :value="k.value"
        :delta="k.delta"
        :tone="k.tone"
        :accent="k.accent"
      />
    </div>

    <!-- 第二行：雷达 / 剖面分布 / 预警 -->
    <div class="grid row-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">教师能力雷达图</div>
            <div class="card-subtitle">六维能力画像 · 对比区域常模</div>
          </div>
          <select v-model="selectedTeacherId" class="select">
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.name }}（{{ t.id }}）
            </option>
          </select>
        </div>
        <BaseChart :option="radarOption" :height="280" />
        <div class="radar-foot">
          <span class="radar-foot__score">{{ teacherMeta.overall }}</span>
          <span class="radar-foot__label">综合得分</span>
          <span class="divider"></span>
          <span class="badge" :class="`badge--${teacherMeta.levelKey}`">{{ teacherMeta.level }}</span>
          <span class="badge badge--general">{{ teacherMeta.profile }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">剖面类型分布</div>
            <div class="card-subtitle">全体教师剖面构成</div>
          </div>
        </div>
        <div class="profile-list">
          <div v-for="(p, i) in profileDistribution" :key="p.name" class="profile-row">
            <span class="profile-row__name">{{ p.name }}</span>
            <div class="profile-row__track">
              <div class="profile-row__fill" :style="{ width: p.value + '%', background: SERIES[i] }"></div>
            </div>
            <span class="profile-row__val">{{ p.value }}%</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">待处理预警</div>
            <div class="card-subtitle">共 {{ alerts.length }} 条，需人工核查</div>
          </div>
          <Icon name="alert" :size="18" class="muted" />
        </div>
        <ul class="alert-list">
          <li v-for="a in alerts" :key="a.id" class="alert-item">
            <span class="alert-item__dot" :style="{ background: STATUS[a.level] }"></span>
            <div class="alert-item__body">
              <div class="alert-item__title">
                {{ a.teacher }}（{{ a.code }}）
                <span class="badge" :class="`badge--status-${a.level}`">{{ STATUS_LABEL[a.level] }}</span>
              </div>
              <div class="alert-item__desc">{{ a.kind }} · {{ a.detail }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 第三行：三方对比 / 趋势 -->
    <div class="grid row-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">三方对比</div>
            <div class="card-subtitle">培养单位自评 · 用人单位 · 教师自评（5 点量表）</div>
          </div>
        </div>
        <BaseChart :option="threePartyOption" :height="300" />
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">进步趋势</div>
            <div class="card-subtitle">历次评估三维得分（百分制）</div>
          </div>
          <Icon name="trend" :size="18" class="muted" />
        </div>
        <BaseChart :option="trendOption" :height="300" />
      </div>
    </div>

    <!-- 第四行：常模对照 / 数据质量 -->
    <div class="grid row-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">常模对照</div>
            <div class="card-subtitle">{{ norms.region }} · 样本 {{ norms.sampleSize }}</div>
          </div>
          <select v-model="selectedTeacherId" class="select">
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}（{{ t.id }}）</option>
          </select>
        </div>
        <BaseChart :option="normCompareOption" :height="260" />
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">数据质量看板</div>
            <div class="card-subtitle">采集与统计质量监测</div>
          </div>
          <Icon name="database" :size="18" class="muted" />
        </div>
        <div class="quality-list">
          <div v-for="q in dataQuality" :key="q.label" class="quality-row">
            <div class="flex-between">
              <span class="quality-row__label">{{ q.label }}</span>
              <span class="quality-row__val">{{ q.raw ? q.value : q.value + '%' }}</span>
            </div>
            <div v-if="!q.raw" class="quality-row__track">
              <div class="quality-row__fill" :style="{ width: q.value + '%', background: q.color }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--s4);
  margin-bottom: var(--s4);
}
.row-2 { grid-template-columns: 1.35fr 1fr 1.15fr; }
.row-2:last-of-type { grid-template-columns: 1fr 1fr; }

.select {
  font-family: inherit;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  cursor: pointer;
}

/* 雷达脚注 */
.radar-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
  justify-content: center;
}
.radar-foot__score { font-size: 24px; font-weight: 700; color: var(--ink); }
.radar-foot__label { font-size: 12px; color: var(--muted); }
.divider { width: 1px; height: 18px; background: var(--gridline); }

/* 剖面分布 */
.profile-list { display: flex; flex-direction: column; gap: 16px; padding-top: 6px; }
.profile-row { display: flex; align-items: center; gap: 12px; }
.profile-row__name { width: 72px; font-size: 13px; color: var(--ink-2); flex: none; }
.profile-row__track {
  flex: 1; height: 12px; border-radius: 6px; background: var(--paper-deep); overflow: hidden;
}
.profile-row__fill { height: 100%; border-radius: 6px; transition: width .3s; }
.profile-row__val { width: 40px; text-align: right; font-size: 13px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }

/* 预警列表 */
.alert-list { display: flex; flex-direction: column; }
.alert-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--gridline); }
.alert-item:last-child { border-bottom: none; padding-bottom: 0; }
.alert-item__dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex: none; }
.alert-item__body { min-width: 0; }
.alert-item__title { font-size: 13px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.alert-item__desc { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* 数据质量 */
.quality-list { display: flex; flex-direction: column; gap: 18px; padding-top: 6px; }
.quality-row__label { font-size: 13px; color: var(--ink-2); }
.quality-row__val { font-size: 15px; font-weight: 650; color: var(--ink); font-variant-numeric: tabular-nums; }
.quality-row__track { height: 8px; border-radius: 4px; background: var(--paper-deep); margin-top: 6px; overflow: hidden; }
.quality-row__fill { height: 100%; border-radius: 4px; }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .row-2 { grid-template-columns: 1fr 1fr; }
  .row-2:last-of-type { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .row-2 { grid-template-columns: 1fr; }
}
</style>
