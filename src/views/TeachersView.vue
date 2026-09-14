<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { api } from '../api.js'

const router = useRouter()
const keyword = ref('')
const levelFilter = ref('all')
const statusFilter = ref('all')

const teachers = ref([])

onMounted(async () => {
  try {
    const data = await api.get('/teachers?pageSize=200')
    teachers.value = data.items
  } catch (e) {
    console.error('加载教师库失败', e)
  }
})

const LEVEL_LABEL = { excellent: '优秀', good: '良好', general: '一般', improving: '待提升' }
const STATUS_META = {
  completed: { label: '已完成', color: '#2c6a4b' },
  assessing: { label: '评估中', color: '#c9a227' },
  pending: { label: '待评估', color: '#9a9388' }
}
const chinaExpLabel = {
  none: '无来华经历',
  short_term: '短期研修',
  degree: '学历学位',
  exchange: '交换项目'
}

const rows = computed(() => teachers.value
  .map((t) => ({ ...t, levelLabel: LEVEL_LABEL[t.level] }))
  .filter((t) => {
    const kw = keyword.value.trim().toLowerCase()
    const hitKw = !kw || t.name.toLowerCase().includes(kw) || t.id.toLowerCase().includes(kw) || (t.nationality || '').includes(kw)
    const hitLevel = levelFilter.value === 'all' || t.level === levelFilter.value
    const hitStatus = statusFilter.value === 'all' || t.assessmentStatus === statusFilter.value
    return hitKw && hitLevel && hitStatus
  })
)

function openDetail(id) {
  router.push(`/teachers/${id}`)
}
</script>

<template>
  <div class="page">
    <div class="page-head flex-between">
      <div>
        <h1 class="page-title">教师库</h1>
        <p class="page-desc">本土中文教师档案与评估结果 · 共 {{ teachers.length }} 名样本</p>
      </div>
      <button class="btn btn--primary"><Icon name="plus" :size="16" /> 新增教师</button>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="search">
          <Icon name="search" :size="16" class="muted" />
          <input v-model="keyword" class="search__input" placeholder="搜索姓名 / 编号 / 国籍…" />
        </div>
        <div class="filters">
          <span class="filters__label">等级</span>
          <button
            v-for="lv in [{v:'all',l:'全部'},{v:'excellent',l:'优秀'},{v:'good',l:'良好'},{v:'general',l:'一般'},{v:'improving',l:'待提升'}]"
            :key="lv.v"
            class="chip"
            :class="{ 'is-active': levelFilter === lv.v }"
            @click="levelFilter = lv.v"
          >{{ lv.l }}</button>
          <span class="filters__label">状态</span>
          <button
            v-for="st in [{v:'all',l:'全部'},{v:'completed',l:'已完成'},{v:'assessing',l:'评估中'},{v:'pending',l:'待评估'}]"
            :key="st.v"
            class="chip"
            :class="{ 'is-active': statusFilter === st.v }"
            @click="statusFilter = st.v"
          >{{ st.l }}</button>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>编号</th>
            <th>姓名</th>
            <th>国籍</th>
            <th>状态</th>
            <th>教学年限</th>
            <th>来华经历</th>
            <th>培养院校</th>
            <th class="num">认知</th>
            <th class="num">情感</th>
            <th class="num">能力</th>
            <th class="num">综合</th>
            <th>等级</th>
            <th>剖面</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id" @click="openDetail(t.id)" class="clickable">
            <td class="strong">{{ t.id }}</td>
            <td class="strong">{{ t.name }}</td>
            <td>{{ t.nationality }}</td>
            <td>
              <span class="status">
                <i :style="{ background: STATUS_META[t.assessmentStatus]?.color }"></i>{{ STATUS_META[t.assessmentStatus]?.label }}
              </span>
            </td>
            <td>{{ t.teachingYears }} 年</td>
            <td>{{ chinaExpLabel[t.chinaExperience] }}</td>
            <td class="muted">{{ t.institution }}</td>
            <td class="num">{{ t.cognitive ?? '—' }}</td>
            <td class="num">{{ t.attitude ?? '—' }}</td>
            <td class="num">{{ t.capability ?? '—' }}</td>
            <td class="num strong">{{ t.overall ?? '—' }}</td>
            <td><span v-if="t.level" class="badge" :class="`badge--${t.level}`">{{ t.levelLabel }}</span><span v-else class="muted">—</span></td>
            <td><span class="profile-tag">{{ t.profileType || '—' }}</span></td>
            <td><button class="btn btn--ghost btn--sm" @click.stop="openDetail(t.id)">画像 <Icon name="arrowRight" :size="14" /></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s4);
  margin-bottom: var(--s4);
  flex-wrap: wrap;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  padding: 7px 12px;
  width: 260px;
  background: var(--surface);
}
.search__input {
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  flex: 1;
  background: transparent;
  color: var(--ink);
}
.filters { display: flex; gap: 6px; align-items: center; }
.filters__label { font-size: 12px; color: var(--muted); margin: 0 2px 0 10px; }
.status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-2); white-space: nowrap; }
.status i { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--ink-2);
  border: 1px solid var(--hairline);
  background: var(--surface);
  transition: all .15s;
}
.chip:hover { border-color: var(--brand-red); color: var(--brand-red); }
.chip.is-active { background: var(--brand-red); border-color: var(--brand-red); color: #fff; }

.clickable { cursor: pointer; }
.profile-tag { font-size: 12px; color: var(--ink-2); }
.btn--sm { padding: 4px 10px; font-size: 12px; }
</style>
