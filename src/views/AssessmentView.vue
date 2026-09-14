<script setup>
import { ref, computed, onMounted } from 'vue'
import Icon from '../components/Icon.vue'
import { api } from '../api.js'
import { auth, roleLabel, ROLE_LABEL } from '../store/auth.js'

const typeLabel = { single: '单选', multiple: '多选', fill: '填空' }

const isAdmin = computed(() => (auth.user?.roles || []).includes('admin'))
const hasNonAdminRole = computed(() => (auth.user?.roles || []).some((r) => r !== 'admin'))

// —— 问卷任务（按角色分发）——
const surveys = ref([])

// —— 问卷管理（管理员）——
const allSurveys = ref([])

// —— 结果查看（管理员）——
const resultUsers = ref([])

// —— 作答弹窗 ——
const answering = ref(null)
const answers = ref({})
const answerSaving = ref(false)
const answerError = ref('')

// —— 编辑弹窗（新建/编辑问卷）——
const editor = ref(null)
const editorSaving = ref(false)
const editorError = ref('')

// —— 结果查看弹窗 ——
const resultView = ref(null)   // { user, responses }
const resultDetail = ref(null) // 单份答卷详情

onMounted(load)

async function load() {
  try {
    const jobs = []
    if (hasNonAdminRole.value) jobs.push(api.get('/assessment/surveys').then((d) => (surveys.value = d)))
    if (isAdmin.value) {
      jobs.push(api.get('/assessment/admin/surveys').then((d) => (allSurveys.value = d)))
      jobs.push(api.get('/assessment/responses/users').then((d) => (resultUsers.value = d)))
    }
    await Promise.all(jobs)
  } catch (e) {
    console.error('加载评估数据失败', e)
  }
}

// ============ 作答 ============

async function openSurvey(id) {
  try {
    const s = await api.get(`/assessment/surveys/${id}`)
    answering.value = s
    answerError.value = ''
    answers.value = {}
    for (const q of s.questions) {
      answers.value[q.id] = q.type === 'multiple' ? [] : ''
    }
    if (s.myResponse) {
      for (const a of s.myResponse.answers) {
        answers.value[a.questionId] = a.value
      }
    }
  } catch (e) {
    window.alert(e.message)
  }
}

function closeAnswer() {
  answering.value = null
}

const answeredCount = computed(() => {
  if (!answering.value) return 0
  return answering.value.questions.filter((q) => {
    const v = answers.value[q.id]
    return v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
  }).length
})

async function submitAnswers() {
  const payload = answering.value.questions
    .map((q) => ({ questionId: q.id, value: answers.value[q.id] ?? (q.type === 'multiple' ? [] : '') }))
    .filter((a) => !(a.value === '' || a.value === null || a.value === undefined || (Array.isArray(a.value) && a.value.length === 0)))
  if (!payload.length) {
    answerError.value = '请至少完成一题后再提交'
    return
  }
  answerSaving.value = true
  answerError.value = ''
  try {
    await api.post(`/assessment/surveys/${answering.value.id}/responses`, { answers: payload })
    window.alert('提交成功')
    answering.value = null
    await load()
  } catch (e) {
    answerError.value = e.message
  } finally {
    answerSaving.value = false
  }
}

// ============ 问卷管理 ============

function blankQuestion() {
  return { type: 'single', prompt: '', optionsText: '' }
}

function openCreate() {
  editor.value = {
    isNew: true,
    id: null,
    form: { title: '', description: '', targetRoles: [], questions: [blankQuestion()] }
  }
  editorError.value = ''
}

async function openEdit(s) {
  try {
    const full = await api.get(`/assessment/admin/surveys/${s.id}`)
    editor.value = {
      isNew: false,
      id: s.id,
      form: {
        title: full.title,
        description: full.description,
        targetRoles: [...full.targetRoles],
        questions: full.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          optionsText: (q.options || []).join('\n')
        }))
      }
    }
    editorError.value = ''
  } catch (e) {
    window.alert(e.message)
  }
}

function closeEditor() {
  editor.value = null
}

function addQuestion() {
  editor.value.form.questions.push(blankQuestion())
}

function removeQuestion(i) {
  editor.value.form.questions.splice(i, 1)
}

async function saveEditor() {
  const f = editor.value.form
  if (!f.title.trim()) {
    editorError.value = '请填写问卷标题'
    return
  }
  const payload = {
    title: f.title.trim(),
    description: f.description.trim(),
    targetRoles: f.targetRoles,
    questions: f.questions
      .filter((q) => q.prompt.trim())
      .map((q) => ({
        type: q.type,
        prompt: q.prompt.trim(),
        options: q.type === 'fill' ? [] : q.optionsText.split('\n').map((o) => o.trim()).filter(Boolean)
      }))
  }
  editorSaving.value = true
  editorError.value = ''
  try {
    if (editor.value.isNew) await api.post('/assessment/surveys', payload)
    else await api.put(`/assessment/surveys/${editor.value.id}`, payload)
    editor.value = null
    await load()
  } catch (e) {
    editorError.value = e.message
  } finally {
    editorSaving.value = false
  }
}

async function removeSurvey(s) {
  if (!window.confirm(`确认删除问卷「${s.title}」？其所有作答记录也将一并删除。`)) return
  try {
    await api.del(`/assessment/surveys/${s.id}`)
    await load()
  } catch (e) {
    window.alert(e.message)
  }
}

// ============ 结果查看 ============

async function openUserResponses(u) {
  try {
    const responses = await api.get(`/assessment/responses/users/${u.id}`)
    resultView.value = { user: u, responses }
    resultDetail.value = null
  } catch (e) {
    window.alert(e.message)
  }
}

async function openResponseDetail(r) {
  try {
    resultDetail.value = await api.get(`/assessment/responses/${r.id}`)
  } catch (e) {
    window.alert(e.message)
  }
}

function backToResponses() {
  resultDetail.value = null
}

function closeResults() {
  resultView.value = null
  resultDetail.value = null
}

const resultAnswers = computed(() => {
  const m = {}
  if (resultDetail.value) {
    for (const a of resultDetail.value.answers || []) m[a.questionId] = a.value
  }
  return m
})

function isSelected(q, opt) {
  return resultAnswers.value[q.id] === opt
}
function isChecked(q, opt) {
  return (resultAnswers.value[q.id] || []).includes(opt)
}
function fillValue(q) {
  return resultAnswers.value[q.id] || ''
}
</script>

<template>
  <div class="page">
    <div class="page-head flex-between">
      <div>
        <h1 class="page-title">评估管理</h1>
        <p class="page-desc">问卷任务分发 · 问卷管理 · 作答结果查看</p>
      </div>
      <button v-if="isAdmin" class="btn btn--primary" @click="openCreate">
        <Icon name="plus" :size="16" /> 新建问卷
      </button>
    </div>

    <!-- 问卷任务（按角色分发；纯管理员不展示） -->
    <div v-if="hasNonAdminRole" class="card">
      <div class="card-header">
        <div>
          <div class="card-title">问卷任务</div>
          <div class="card-subtitle">按角色分发给您的问卷与访谈提纲 · 共 {{ surveys.length }} 份</div>
        </div>
      </div>

      <div v-if="surveys.length" class="survey-grid">
        <div v-for="s in surveys" :key="s.id" class="survey-card">
          <div class="survey-card__top">
            <span class="survey-card__code">{{ s.code }}</span>
            <span v-if="s.submitted" class="submitted-tag"><Icon name="check" :size="12" /> 已提交</span>
          </div>
          <div class="survey-card__title">{{ s.title }}</div>
          <div class="survey-card__desc">{{ s.description }}</div>
          <div class="survey-card__meta">
            <span>{{ s.targetRoles.map(roleLabel).join(' / ') }}</span>
            <span>{{ s.questionCount }} 题</span>
          </div>
          <button class="btn btn--primary btn--sm survey-card__btn" @click="openSurvey(s.id)">
            <Icon name="file" :size="15" /> {{ s.submitted ? '查看 / 重新作答' : '进入问卷' }}
          </button>
        </div>
      </div>
      <div v-else class="empty muted">暂无分发给您的问卷任务</div>
    </div>

    <!-- 问卷管理（管理员） -->
    <div v-if="isAdmin" class="card mt-4">
      <div class="card-header">
        <div>
          <div class="card-title">问卷管理</div>
          <div class="card-subtitle">编辑问卷内容或删除问卷 · 共 {{ allSurveys.length }} 份</div>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>编号</th>
            <th>问卷标题</th>
            <th>目标角色</th>
            <th class="num">题目数</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in allSurveys" :key="s.id">
            <td class="strong">{{ s.code }}</td>
            <td class="strong">{{ s.title }}</td>
            <td>
              <span v-for="r in s.targetRoles" :key="r" class="role-tag">{{ roleLabel(r) }}</span>
              <span v-if="!s.targetRoles.length" class="muted">未指定</span>
            </td>
            <td class="num muted">{{ s.questionCount }}</td>
            <td class="actions">
              <button class="btn btn--ghost btn--sm" @click="openEdit(s)"><Icon name="edit" :size="13" /> 编辑</button>
              <button class="btn btn--ghost btn--sm danger" @click="removeSurvey(s)"><Icon name="trash" :size="13" /> 删除</button>
            </td>
          </tr>
          <tr v-if="!allSurveys.length">
            <td colspan="5" class="muted">暂无问卷</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 结果查看（管理员） -->
    <div v-if="isAdmin" class="card mt-4">
      <div class="card-header">
        <div>
          <div class="card-title">结果查看</div>
          <div class="card-subtitle">查看每个用户的答题记录 · 共 {{ resultUsers.length }} 位已作答用户</div>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>用户</th>
            <th>用户名</th>
            <th class="num">已答问卷数</th>
            <th>最近提交</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in resultUsers" :key="u.id">
            <td class="strong">{{ u.name || u.username }}</td>
            <td class="muted">{{ u.username }}</td>
            <td class="num">{{ u.response_count }}</td>
            <td class="muted">{{ u.last_submitted }}</td>
            <td class="actions">
              <button class="btn btn--ghost btn--sm" @click="openUserResponses(u)"><Icon name="eye" :size="13" /> 查看答卷</button>
            </td>
          </tr>
          <tr v-if="!resultUsers.length">
            <td colspan="5" class="muted">暂无作答记录</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 作答弹窗 -->
    <div v-if="answering" class="modal-mask" @click.self="closeAnswer">
      <div class="modal modal--lg">
        <div class="modal__head">
          <div>
            <div class="modal__title">{{ answering.code }} · {{ answering.title }}</div>
            <div class="modal__subtitle">{{ answering.description }} · 已答 {{ answeredCount }} / {{ answering.questions.length }} 题</div>
          </div>
          <button class="modal__close" @click="closeAnswer"><Icon name="chevron" :size="16" style="transform: rotate(180deg)" /></button>
        </div>

        <div class="modal__body">
          <div v-if="!answering.questions.length" class="muted">该问卷暂无题目</div>

          <div v-for="(q, i) in answering.questions" :key="q.id" class="q-item">
            <div class="q-prompt">
              <span class="q-index">{{ i + 1 }}</span>
              <span class="q-text">{{ q.prompt }}</span>
              <span class="q-type">{{ typeLabel[q.type] }}</span>
            </div>

            <!-- 单选 -->
            <div v-if="q.type === 'single'" class="q-opts">
              <label v-for="opt in q.options" :key="opt" class="opt" :class="{ 'is-on': answers[q.id] === opt }">
                <input type="radio" :name="q.id" :value="opt" v-model="answers[q.id]" />
                <span class="opt__mark">○</span>
                <span class="opt__text">{{ opt }}</span>
              </label>
            </div>

            <!-- 多选 -->
            <div v-else-if="q.type === 'multiple'" class="q-opts">
              <label v-for="opt in q.options" :key="opt" class="opt" :class="{ 'is-on': (answers[q.id] || []).includes(opt) }">
                <input type="checkbox" :value="opt" v-model="answers[q.id]" />
                <span class="opt__mark">□</span>
                <span class="opt__text">{{ opt }}</span>
              </label>
            </div>

            <!-- 填空 / 开放 -->
            <div v-else class="q-fill">
              <textarea v-model="answers[q.id]" rows="3" placeholder="请在此填写您的回答…"></textarea>
            </div>
          </div>

          <p v-if="answerError" class="form-error"><Icon name="alert" :size="14" /> {{ answerError }}</p>
        </div>

        <div class="modal__foot">
          <button class="btn" @click="closeAnswer">取消</button>
          <button class="btn btn--primary" :disabled="answerSaving" @click="submitAnswers">
            <Icon name="check" :size="15" /> {{ answerSaving ? '提交中…' : '提交答卷' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗（新建 / 编辑问卷） -->
    <div v-if="editor" class="modal-mask" @click.self="closeEditor">
      <div class="modal modal--lg">
        <div class="modal__head">
          <div class="modal__title">{{ editor.isNew ? '新建问卷' : '编辑问卷 · ' + editor.id }}</div>
          <button class="modal__close" @click="closeEditor"><Icon name="chevron" :size="16" style="transform: rotate(180deg)" /></button>
        </div>

        <div class="modal__body">
          <div class="field">
            <label class="field__label">问卷标题 <i class="req">*</i></label>
            <input v-model="editor.form.title" class="field__input" placeholder="如：培训效果反馈问卷（J5）" />
          </div>
          <div class="field">
            <label class="field__label">问卷说明</label>
            <input v-model="editor.form.description" class="field__input" placeholder="面向对象与填写说明" />
          </div>
          <div class="field">
            <label class="field__label">分发角色（可多选，不选则不分发给任何人）</label>
            <div class="target-checks">
              <label v-for="(name, id) in ROLE_LABEL" :key="id" class="target-check" :class="{ 'is-on': editor.form.targetRoles.includes(id) }">
                <input type="checkbox" :value="id" v-model="editor.form.targetRoles" />
                <span>{{ name }}</span>
              </label>
            </div>
          </div>

          <div class="field">
            <div class="flex-between">
              <label class="field__label" style="margin:0">题目（{{ editor.form.questions.length }}）</label>
              <button class="btn btn--ghost btn--sm" @click="addQuestion"><Icon name="plus" :size="13" /> 添加题目</button>
            </div>
            <div class="q-editors">
              <div v-for="(q, qi) in editor.form.questions" :key="qi" class="q-editor">
                <div class="q-editor__row">
                  <select v-model="q.type" class="q-editor__type">
                    <option value="single">单选</option>
                    <option value="multiple">多选</option>
                    <option value="fill">填空</option>
                  </select>
                  <input v-model="q.prompt" class="q-editor__prompt" placeholder="题目内容" />
                  <button class="q-editor__remove" @click="removeQuestion(qi)"><Icon name="trash" :size="14" /></button>
                </div>
                <textarea
                  v-if="q.type !== 'fill'"
                  v-model="q.optionsText"
                  class="q-editor__opts"
                  rows="3"
                  placeholder="选项（每行一个）"
                ></textarea>
              </div>
            </div>
          </div>

          <p v-if="editorError" class="form-error"><Icon name="alert" :size="14" /> {{ editorError }}</p>
        </div>

        <div class="modal__foot">
          <button class="btn" @click="closeEditor">取消</button>
          <button class="btn btn--primary" :disabled="editorSaving" @click="saveEditor">
            <Icon name="check" :size="15" /> {{ editorSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 结果查看弹窗 -->
    <div v-if="resultView" class="modal-mask" @click.self="closeResults">
      <div class="modal modal--lg">
        <div class="modal__head">
          <div>
            <div class="modal__title">{{ resultDetail ? resultDetail.code + ' · ' + resultDetail.title : resultView.user.name || resultView.user.username + ' 的答卷' }}</div>
            <div class="modal__subtitle">{{ resultDetail ? '提交于 ' + resultDetail.submittedAt : '共 ' + resultView.responses.length + ' 份答卷' }}</div>
          </div>
          <button class="modal__close" @click="closeResults"><Icon name="chevron" :size="16" style="transform: rotate(180deg)" /></button>
        </div>

        <div class="modal__body">
          <!-- 答卷列表 -->
          <div v-if="!resultDetail">
            <div v-if="!resultView.responses.length" class="muted">该用户暂无答卷</div>
            <div v-for="r in resultView.responses" :key="r.id" class="resp-row">
              <div>
                <span class="survey-card__code">{{ r.code }}</span>
                <span class="resp-row__title">{{ r.title }}</span>
              </div>
              <div class="resp-row__right">
                <span class="muted small">{{ r.submittedAt }}</span>
                <button class="btn btn--ghost btn--sm" @click="openResponseDetail(r)"><Icon name="eye" :size="13" /> 查看</button>
              </div>
            </div>
          </div>

          <!-- 答卷详情（完整问卷 + 答案） -->
          <div v-else>
            <button class="back-link" @click="backToResponses"><Icon name="chevron" :size="14" style="transform: rotate(90deg)" /> 返回答卷列表</button>

            <div v-for="(q, i) in resultDetail.questions" :key="q.id" class="q-item">
              <div class="q-prompt">
                <span class="q-index">{{ i + 1 }}</span>
                <span class="q-text">{{ q.prompt }}</span>
                <span class="q-type">{{ typeLabel[q.type] }}</span>
              </div>

              <div v-if="q.type === 'single'" class="q-opts read">
                <div v-for="opt in q.options" :key="opt" class="opt" :class="{ 'is-on': isSelected(q, opt) }">
                  <span class="opt__mark">○</span>
                  <span class="opt__text">{{ opt }}</span>
                </div>
              </div>

              <div v-else-if="q.type === 'multiple'" class="q-opts read">
                <div v-for="opt in q.options" :key="opt" class="opt" :class="{ 'is-on': isChecked(q, opt) }">
                  <span class="opt__mark">□</span>
                  <span class="opt__text">{{ opt }}</span>
                </div>
              </div>

              <div v-else class="q-fill read">
                <div class="fill-answer" :class="{ 'is-empty': !fillValue(q) }">{{ fillValue(q) || '（未作答）' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal__foot">
          <button class="btn" @click="closeResults">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* —— 问卷任务卡片 —— */
.survey-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.survey-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 16px; border: 1px solid var(--hairline); border-radius: var(--radius-md);
  background: var(--paper);
}
.survey-card__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.survey-card__code {
  font-size: 12px; font-weight: 700; color: #fff; background: var(--brand-ink);
  padding: 3px 9px; border-radius: 6px; letter-spacing: .5px;
}
.submitted-tag { font-size: 12px; color: #08730c; display: inline-flex; align-items: center; gap: 4px; }
.survey-card__title { font-size: 15px; font-weight: 600; color: var(--ink); }
.survey-card__desc { font-size: 12px; color: var(--ink-2); line-height: 1.6; }
.survey-card__meta { font-size: 12px; color: var(--muted); display: flex; gap: 12px; }
.survey-card__btn { align-self: flex-start; margin-top: 4px; }
.empty { padding: 20px 0; text-align: center; }

.role-tag {
  font-size: 12px; color: var(--brand-red); background: var(--brand-red-soft);
  padding: 1px 8px; border-radius: 5px; margin-right: 6px; white-space: nowrap;
}
.actions { white-space: nowrap; text-align: right; }
.btn--sm { padding: 4px 10px; font-size: 12px; }
.danger { color: var(--status-critical); }
.danger:hover { background: #fbe3e3; }

/* —— 弹窗 —— */
.modal-mask {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(24, 26, 33, 0.4);
  display: grid; place-items: center; padding: 24px;
}
.modal {
  width: 100%; max-width: 720px; max-height: 88vh;
  display: flex; flex-direction: column;
  background: var(--surface); border-radius: 14px;
  box-shadow: 0 24px 70px rgba(31, 35, 48, 0.25);
  overflow: hidden;
}
.modal--lg { max-width: 780px; }
.modal__head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 18px 20px; border-bottom: 1px solid var(--hairline);
}
.modal__title { font-family: var(--font-serif); font-size: 16px; font-weight: 700; }
.modal__subtitle { font-size: 12px; color: var(--muted); margin-top: 3px; }
.modal__close { color: var(--muted); display: grid; place-items: center; padding: 4px; border-radius: 6px; flex: none; }
.modal__close:hover { color: var(--ink); background: var(--paper); }
.modal__body { padding: 20px; overflow: auto; display: flex; flex-direction: column; gap: 18px; }
.modal__foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--hairline);
}

/* —— 题目 —— */
.q-item { display: flex; flex-direction: column; gap: 10px; }
.q-prompt { display: flex; align-items: flex-start; gap: 10px; }
.q-index {
  flex: none; width: 22px; height: 22px; border-radius: 6px;
  background: var(--brand-ink); color: #fff; font-size: 12px; font-weight: 600;
  display: grid; place-items: center; margin-top: 1px;
}
.q-text { font-size: 14px; font-weight: 600; color: var(--ink); line-height: 1.6; flex: 1; }
.q-type {
  flex: none; font-size: 11px; color: var(--brand-red); background: var(--brand-red-soft);
  padding: 1px 7px; border-radius: 5px; margin-top: 1px;
}
.q-opts { display: flex; flex-direction: column; gap: 8px; padding-left: 32px; }
.opt {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 9px 12px; border: 1px solid var(--hairline); border-radius: 8px; cursor: pointer;
  transition: border-color .15s, background .15s;
}
.opt:hover { border-color: var(--brand-red); }
.opt.is-on { border-color: var(--brand-red); background: var(--brand-red-soft); }
.opt input { display: none; }
.opt__mark { font-size: 15px; color: var(--muted); flex: none; line-height: 1.4; }
.opt.is-on .opt__mark { color: var(--brand-red); }
.opt__text { font-size: 13px; color: var(--ink); line-height: 1.5; }
.q-opts.read .opt { cursor: default; }
.q-opts.read .opt:hover { border-color: var(--hairline); }
.q-fill { padding-left: 32px; }
.q-fill textarea {
  width: 100%; border: 1px solid var(--hairline); border-radius: 8px;
  padding: 10px 12px; font-size: 13px; color: var(--ink); font-family: inherit;
  resize: vertical; background: #fff;
}
.q-fill textarea:focus { outline: none; border-color: var(--brand-red); box-shadow: 0 0 0 3px rgba(192, 58, 43, 0.10); }
.fill-answer {
  border: 1px solid var(--hairline); border-radius: 8px; padding: 10px 12px;
  font-size: 13px; color: var(--ink); background: var(--paper); white-space: pre-wrap; line-height: 1.6;
}
.fill-answer.is-empty { color: var(--muted); }
.form-error {
  display: flex; align-items: center; gap: 6px; margin: 0;
  font-size: 13px; color: var(--status-critical);
}

/* —— 编辑表单 —— */
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 13px; font-weight: 600; color: var(--ink); }
.req { font-style: normal; color: var(--brand-red); }
.field__input {
  height: 40px; border: 1px solid var(--hairline); border-radius: 8px;
  padding: 0 12px; font-size: 14px; color: var(--ink); font-family: inherit; background: #fff;
}
.field__input:focus { outline: none; border-color: var(--brand-red); box-shadow: 0 0 0 3px rgba(192, 58, 43, 0.10); }
.target-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.target-check {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border: 1px solid var(--hairline); border-radius: 999px; cursor: pointer;
  font-size: 13px; transition: border-color .15s, background .15s;
}
.target-check:hover { border-color: var(--brand-red); }
.target-check.is-on { border-color: var(--brand-red); background: var(--brand-red-soft); color: var(--brand-red); }
.target-check input { display: none; }

.q-editors { display: flex; flex-direction: column; gap: 10px; }
.q-editor { border: 1px solid var(--hairline); border-radius: 9px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.q-editor__row { display: flex; gap: 8px; align-items: center; }
.q-editor__type {
  flex: none; width: 84px; height: 36px; border: 1px solid var(--hairline); border-radius: 7px;
  padding: 0 8px; font-size: 13px; font-family: inherit; background: #fff; color: var(--ink);
}
.q-editor__prompt {
  flex: 1; height: 36px; border: 1px solid var(--hairline); border-radius: 7px;
  padding: 0 10px; font-size: 13px; font-family: inherit; color: var(--ink); background: #fff;
}
.q-editor__prompt:focus, .q-editor__type:focus { outline: none; border-color: var(--brand-red); }
.q-editor__remove { color: var(--muted); flex: none; padding: 4px; border-radius: 6px; }
.q-editor__remove:hover { color: var(--status-critical); background: #fbe3e3; }
.q-editor__opts {
  width: 100%; border: 1px solid var(--hairline); border-radius: 7px;
  padding: 8px 10px; font-size: 13px; font-family: inherit; color: var(--ink); resize: vertical; background: #fff;
}
.q-editor__opts:focus { outline: none; border-color: var(--brand-red); }

/* —— 结果查看 —— */
.resp-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 14px; border: 1px solid var(--hairline); border-radius: 9px;
}
.resp-row__title { font-size: 14px; font-weight: 600; color: var(--ink); margin-left: 8px; }
.resp-row__right { display: flex; align-items: center; gap: 12px; }
.back-link {
  display: inline-flex; align-items: center; gap: 4px; align-self: flex-start;
  font-size: 13px; color: var(--brand-red); font-weight: 500;
}
.back-link:hover { text-decoration: underline; }

@media (max-width: 900px) {
  .survey-grid { grid-template-columns: 1fr; }
}
</style>
