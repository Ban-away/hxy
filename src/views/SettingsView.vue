<script setup>
import { ref, computed, onMounted } from 'vue'
import Icon from '../components/Icon.vue'
import { indicators, rules, norms, templates } from '../data/mock.js'
import { api } from '../api.js'

const tab = ref('indicator')
const tabs = [
  { key: 'indicator', label: '指标库', icon: 'layers' },
  { key: 'rule', label: '规则库', icon: 'settings' },
  { key: 'norm', label: '常模库', icon: 'database' },
  { key: 'template', label: '模板库', icon: 'file' }
]

const normRows = [
  { dim: '认知水平', ...norms.cognitive },
  { dim: '情感态度', ...norms.attitude },
  { dim: '传播能力', ...norms.capability },
  { dim: '综合得分', ...norms.overall }
]

// —— 可调指标系数（系统管理员）——
const weights = ref({ cognitive: 0.3, attitude: 0.3, capability: 0.4 })
const savingWeights = ref(false)
const weightsMsg = ref('')
const weightsErr = ref(false)

const weightSum = computed(() =>
  (weights.value.cognitive + weights.value.attitude + weights.value.capability).toFixed(2)
)

onMounted(async () => {
  try {
    weights.value = await api.get('/settings/weights')
  } catch (e) {
    console.error('加载指标系数失败', e)
  }
})

async function saveWeights() {
  savingWeights.value = true
  weightsMsg.value = ''
  weightsErr.value = false
  try {
    weights.value = await api.put('/settings/weights', weights.value)
    weightsMsg.value = '已保存，全部教师的综合得分将按新系数重新计算'
  } catch (e) {
    weightsErr.value = true
    weightsMsg.value = e.message
  } finally {
    savingWeights.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">设置</h1>
      <p class="page-desc">评估体系配置 · 指标 / 规则 / 常模 / 模板</p>
    </div>

    <div class="tabs">
      <button
        v-for="t in tabs" :key="t.key"
        class="tab" :class="{ 'is-active': tab === t.key }"
        @click="tab = t.key"
      >
        <Icon :name="t.icon" :size="16" /> {{ t.label }}
      </button>
    </div>

    <!-- 指标库 -->
    <div v-if="tab === 'indicator'">
      <!-- 指标系数（可调整） -->
      <div class="card weights-card">
        <div class="card-header">
          <div>
            <div class="card-title">评估指标系数</div>
            <div class="card-subtitle">综合得分 S = w₁·认知 + w₂·情感 + w₃·能力，可调整</div>
          </div>
          <button class="btn btn--primary" :disabled="savingWeights" @click="saveWeights">
            <Icon name="check" :size="15" /> {{ savingWeights ? '保存中…' : '保存系数' }}
          </button>
        </div>
        <div class="weights-grid">
          <label class="weight-field">
            <span class="weight-field__label">认知水平系数（w₁）</span>
            <input type="number" step="0.01" min="0" max="1" v-model.number="weights.cognitive" />
          </label>
          <label class="weight-field">
            <span class="weight-field__label">情感态度系数（w₂）</span>
            <input type="number" step="0.01" min="0" max="1" v-model.number="weights.attitude" />
          </label>
          <label class="weight-field">
            <span class="weight-field__label">传播能力系数（w₃）</span>
            <input type="number" step="0.01" min="0" max="1" v-model.number="weights.capability" />
          </label>
        </div>
        <div class="weights-note">
          <span>系数之和：{{ weightSum }}（建议归一化为 1.00）</span>
          <span v-if="weightsMsg" class="weights-msg" :class="{ 'is-err': weightsErr }">{{ weightsMsg }}</span>
        </div>
      </div>

      <div class="grid three-col">
      <div v-for="ind in indicators" :key="ind.dim" class="card">
        <div class="card-header">
          <div>
            <div class="card-title" :style="{ color: ind.color }">{{ ind.dim }}</div>
            <div class="card-subtitle">权重 {{ ind.weight }}</div>
          </div>
          <span class="weight-badge" :style="{ background: ind.color }">{{ ind.weight }}</span>
        </div>
        <ul class="ind-list">
          <li v-for="s in ind.sub" :key="s">{{ s }}</li>
        </ul>
      </div>

      <div class="card formula">
        <div class="card-header">
          <div><div class="card-title">模型核心公式</div><div class="card-subtitle">§1.2 综合得分</div></div>
        </div>
        <div class="formula__main">S<sub>total</sub> = 0.3·S<sub>认知</sub> + 0.3·S<sub>情感</sub> + 0.4·S<sub>能力</sub></div>
        <ul class="formula__sub">
          <li>S<sub>认知</sub> = ⅓(S<sub>内容</sub> + S<sub>深度</sub> + S<sub>感知</sub>)</li>
          <li>S<sub>情感</sub> = ⅓(S<sub>认同</sub> + S<sub>动机</sub> + S<sub>共情</sub>)</li>
          <li>S<sub>能力</sub> = ¼(S<sub>叙事</sub> + S<sub>渠道</sub> + S<sub>效果</sub> + S<sub>反思</sub>)</li>
        </ul>
        <div class="formula__note">三方差距指数 G<sub>ij</sub> = ⅟ₙ Σ |X<sub>ik</sub> − X<sub>jk</sub>|，G &gt; 0.8 触发显著差距预警</div>
      </div>
      </div>
    </div>

    <!-- 规则库 -->
    <div v-if="tab === 'rule'" class="grid rule-grid">
      <div v-for="r in rules" :key="r.id" class="card rule-card">
        <div class="rule-card__head">
          <span class="rule-card__id">{{ r.id }}</span>
          <span class="rule-card__name">{{ r.name }}</span>
        </div>
        <p class="rule-card__desc">{{ r.desc }}</p>
        <div class="rule-card__trigger"><span class="rule-card__kw">触发</span>{{ r.trigger }}</div>
      </div>
    </div>

    <!-- 常模库 -->
    <div v-if="tab === 'norm'" class="card">
      <div class="card-header">
        <div>
          <div class="card-title">常模参照数据</div>
          <div class="card-subtitle">{{ norms.region }} · 样本量 {{ norms.sampleSize }} · 更新于 {{ norms.updatedAt }}</div>
        </div>
        <button class="btn"><Icon name="export" :size="15" /> 导入数据</button>
      </div>
      <table class="table">
        <thead>
          <tr><th>维度</th><th class="num">均值</th><th class="num">标准差</th><th class="num">+1σ</th><th class="num">−1σ</th></tr>
        </thead>
        <tbody>
          <tr v-for="n in normRows" :key="n.dim">
            <td class="strong">{{ n.dim }}</td>
            <td class="num strong">{{ n.mean }}</td>
            <td class="num">{{ n.std }}</td>
            <td class="num muted">{{ (n.mean + n.std).toFixed(1) }}</td>
            <td class="num muted">{{ (n.mean - n.std).toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 模板库 -->
    <div v-if="tab === 'template'" class="card">
      <div class="card-header">
        <div><div class="card-title">评估模板</div><div class="card-subtitle">开箱即用的工具组合</div></div>
        <button class="btn btn--primary"><Icon name="plus" :size="15" /> 新建模板</button>
      </div>
      <div class="grid template-grid">
        <div v-for="t in templates" :key="t.id" class="template-card">
          <div class="template-card__icon"><Icon name="file" :size="20" /></div>
          <div class="template-card__body">
            <div class="template-card__name">{{ t.name }}</div>
            <div class="template-card__meta">{{ t.tools }} 个工具 · 使用 {{ t.usage }} 次 · 更新 {{ t.updated }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tabs { display: flex; gap: 4px; margin-bottom: var(--s4); border-bottom: 1px solid var(--hairline); }
.tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 16px; font-size: 13px; font-weight: 500; color: var(--ink-2);
  border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .15s;
}
.tab:hover { color: var(--ink); }
.tab.is-active { color: var(--brand-red); border-bottom-color: var(--brand-red); }

.three-col { grid-template-columns: repeat(3, 1fr); }
.weight-badge {
  color: #fff; font-size: 13px; font-weight: 700;
  width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center;
}
.ind-list { display: flex; flex-direction: column; gap: 8px; }
.ind-list li { font-size: 13px; color: var(--ink-2); padding-left: 14px; position: relative; }
.ind-list li::before { content: ""; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--brand-gold); }

.formula { grid-column: span 2; }
.formula__main {
  font-family: var(--font-serif); font-size: 20px; font-weight: 700; color: var(--ink);
  padding: 14px 18px; background: var(--paper); border-radius: 10px; text-align: center;
}
.formula__main sub { color: var(--brand-red); font-size: 13px; }
.formula__sub { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.formula__sub li { font-size: 13px; color: var(--ink-2); }
.formula__sub sub { color: var(--muted); font-size: 11px; }
.formula__note { margin-top: 14px; font-size: 12px; color: var(--muted); padding-top: 12px; border-top: 1px solid var(--gridline); }
.formula__note sub { font-size: 10px; }

.rule-grid { grid-template-columns: repeat(2, 1fr); }
.rule-card__head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rule-card__id {
  font-size: 11px; font-weight: 700; color: #fff; background: var(--brand-ink);
  padding: 2px 8px; border-radius: 5px;
}
.rule-card__name { font-size: 14px; font-weight: 600; }
.rule-card__desc { font-size: 13px; color: var(--ink-2); margin: 0 0 12px; line-height: 1.6; }
.rule-card__trigger { font-size: 12px; color: var(--c7); background: #f0eef8; padding: 8px 12px; border-radius: 8px; font-family: ui-monospace, monospace; }
.rule-card__kw { color: var(--brand-red); font-weight: 600; margin-right: 6px; }

.template-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
.template-card { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1px solid var(--hairline); border-radius: 10px; }
.template-card__icon { color: var(--brand-red); background: var(--brand-red-soft); width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center; flex: none; }
.template-card__name { font-size: 14px; font-weight: 600; }
.template-card__meta { font-size: 12px; color: var(--muted); margin-top: 3px; }

.weights-card { margin-bottom: var(--s4); }
.weights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.weight-field {
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px 16px; background: var(--paper); border: 1px solid var(--hairline); border-radius: 10px;
}
.weight-field__label { font-size: 13px; font-weight: 600; color: var(--ink); }
.weight-field input {
  height: 40px; border: 1px solid var(--hairline); border-radius: 8px;
  padding: 0 12px; font-size: 15px; font-weight: 650; color: var(--ink);
  font-family: inherit; background: #fff;
}
.weight-field input:focus { outline: none; border-color: var(--brand-red); box-shadow: 0 0 0 3px rgba(192, 58, 43, 0.10); }
.weights-note {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-top: 14px; font-size: 12px; color: var(--muted);
}
.weights-msg { color: #08730c; font-weight: 500; }
.weights-msg.is-err { color: var(--status-critical); }

@media (max-width: 1000px) {
  .three-col, .rule-grid { grid-template-columns: 1fr 1fr; }
  .formula { grid-column: span 1; }
  .template-grid { grid-template-columns: 1fr; }
  .weights-grid { grid-template-columns: 1fr; }
}
</style>
