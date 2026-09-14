<script setup>
import { ref, computed, onMounted } from 'vue'
import Icon from '../components/Icon.vue'
import { api } from '../api.js'
import { auth, roleLabel } from '../store/auth.js'

// 角色徽章色调
const ROLE_CLS = {
  admin: 'badge--excellent',
  university: 'badge--status-serious',
  teacher: 'badge--good',
  employer: 'badge--general',
  student: 'badge--improving'
}

const users = ref([])
const roles = ref([])
const loading = ref(true)

// 弹窗表单
const showModal = ref(false)
const editingId = ref(null)
const form = ref({ username: '', name: '', password: '', roles: [] })
const formError = ref('')
const saving = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [u, r] = await Promise.all([
      api.get('/auth/users'),
      api.get('/auth/roles')
    ])
    users.value = u
    roles.value = r
  } catch (e) {
    console.error('加载用户列表失败', e)
  } finally {
    loading.value = false
  }
}

function roleName(id) {
  const found = roles.value.find((r) => r.id === id)
  return found ? found.name : roleLabel(id)
}

function openCreate() {
  editingId.value = null
  form.value = { username: '', name: '', password: '', roles: [] }
  formError.value = ''
  showModal.value = true
}

function openEdit(u) {
  editingId.value = u.id
  form.value = {
    username: u.username,
    name: u.name,
    password: '',
    roles: [...(u.roles || [])]
  }
  formError.value = ''
  showModal.value = true
}

function toggleRole(id) {
  const i = form.value.roles.indexOf(id)
  if (i >= 0) form.value.roles.splice(i, 1)
  else form.value.roles.push(id)
}

async function submit() {
  formError.value = ''
  if (!form.value.username.trim()) return (formError.value = '请输入用户名')
  if (!form.value.roles.length) return (formError.value = '请至少选择一个角色')
  if (!editingId.value && !form.value.password) return (formError.value = '请输入初始密码')

  saving.value = true
  try {
    const payload = {
      username: form.value.username.trim(),
      name: form.value.name.trim(),
      roles: form.value.roles
    }
    if (form.value.password) payload.password = form.value.password
    if (editingId.value) {
      await api.put(`/auth/users/${editingId.value}`, payload)
    } else {
      await api.post('/auth/users', payload)
    }
    showModal.value = false
    await load()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function removeUser(u) {
  if (!window.confirm(`确认删除用户「${u.name || u.username}」？此操作不可恢复。`)) return
  try {
    await api.del(`/auth/users/${u.id}`)
    await load()
  } catch (e) {
    window.alert(e.message)
  }
}

const isSelf = (u) => u.username === auth.user?.username
</script>

<template>
  <div class="page">
    <div class="page-head flex-between">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-desc">系统用户与角色分配 · 支持一用户多角色 · 共 {{ users.length }} 个账号</p>
      </div>
      <button class="btn btn--primary" @click="openCreate"><Icon name="plus" :size="16" /> 新增用户</button>
    </div>

    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>姓名</th>
            <th>角色</th>
            <th>关联教师</th>
            <th>创建时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="muted">加载中…</td>
          </tr>
          <tr v-for="u in users" :key="u.id">
            <td class="strong">
              {{ u.username }}
              <span v-if="isSelf(u)" class="me-tag">当前账号</span>
            </td>
            <td>{{ u.name }}</td>
            <td>
              <span
                v-for="r in u.roles" :key="r"
                class="badge role-tag" :class="ROLE_CLS[r] || 'badge--general'"
              >{{ roleName(r) }}</span>
            </td>
            <td class="muted">{{ u.teacher_id || '—' }}</td>
            <td class="muted">{{ u.created_at || '—' }}</td>
            <td class="actions">
              <button class="btn btn--ghost btn--sm" @click="openEdit(u)">编辑</button>
              <button class="btn btn--ghost btn--sm danger" :disabled="isSelf(u)" @click="removeUser(u)">
                <Icon name="logout" :size="13" /> 删除
              </button>
            </td>
          </tr>
          <tr v-if="!loading && !users.length">
            <td colspan="6" class="muted">暂无用户</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal">
        <div class="modal__head">
          <div class="modal__title">{{ editingId ? '编辑用户' : '新增用户' }}</div>
          <button class="modal__close" @click="showModal = false"><Icon name="chevron" :size="16" style="transform: rotate(180deg)" /></button>
        </div>

        <div class="modal__body">
          <div class="field">
            <label class="field__label">用户名 <i class="req">*</i></label>
            <input v-model="form.username" class="field__input" placeholder="登录账号，如 zhangsan" />
          </div>
          <div class="field">
            <label class="field__label">姓名</label>
            <input v-model="form.name" class="field__input" placeholder="显示姓名，如 张三" />
          </div>
          <div class="field">
            <label class="field__label">{{ editingId ? '重置密码' : '密码' }} <i v-if="!editingId" class="req">*</i></label>
            <input v-model="form.password" type="password" class="field__input" :placeholder="editingId ? '留空则不修改' : '初始登录密码'" />
          </div>
          <div class="field">
            <label class="field__label">角色 <i class="req">*</i></label>
            <div class="role-checks">
              <div
                v-for="r in roles" :key="r.id"
                class="role-check" :class="{ 'is-on': form.roles.includes(r.id) }"
                @click="toggleRole(r.id)"
              >
                <span class="role-check__box">
                  <Icon v-if="form.roles.includes(r.id)" name="check" :size="14" />
                </span>
                <span class="role-check__body">
                  <span class="role-check__name">{{ r.name }}</span>
                  <span class="role-check__desc">{{ r.description }}</span>
                </span>
              </div>
            </div>
          </div>
          <p v-if="formError" class="modal__error"><Icon name="alert" :size="14" /> {{ formError }}</p>
        </div>

        <div class="modal__foot">
          <button class="btn" @click="showModal = false">取消</button>
          <button class="btn btn--primary" :disabled="saving" @click="submit">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.me-tag {
  font-size: 11px; color: var(--brand-red); background: var(--brand-red-soft);
  padding: 1px 6px; border-radius: 5px; margin-left: 6px; font-weight: 500;
}
.role-tag { margin-right: 6px; }
.actions { white-space: nowrap; text-align: right; }
.btn--sm { padding: 4px 10px; font-size: 12px; }
.danger { color: var(--status-critical); }
.danger:hover { background: #fbe3e3; }
.danger:disabled { opacity: .4; cursor: not-allowed; }

/* —— 弹窗 —— */
.modal-mask {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(24, 26, 33, 0.4);
  display: grid; place-items: center; padding: 24px;
}
.modal {
  width: 100%; max-width: 460px;
  background: var(--surface); border-radius: 14px;
  box-shadow: 0 24px 70px rgba(31, 35, 48, 0.25);
  overflow: hidden;
}
.modal__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--hairline);
}
.modal__title { font-family: var(--font-serif); font-size: 16px; font-weight: 700; }
.modal__close { color: var(--muted); display: grid; place-items: center; padding: 4px; border-radius: 6px; }
.modal__close:hover { color: var(--ink); background: var(--paper); }
.modal__body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 13px; font-weight: 600; color: var(--ink); }
.req { font-style: normal; color: var(--brand-red); }
.field__input {
  height: 40px; border: 1px solid var(--hairline); border-radius: 8px;
  padding: 0 12px; font-size: 14px; color: var(--ink); font-family: inherit; background: #fff;
}
.field__input:focus { outline: none; border-color: var(--brand-red); box-shadow: 0 0 0 3px rgba(192, 58, 43, 0.10); }
.role-checks { display: flex; flex-direction: column; gap: 8px; }
.role-check {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 9px; cursor: pointer;
  transition: border-color .15s, background .15s;
  user-select: none;
}
.role-check:hover { border-color: var(--brand-red); }
.role-check.is-on { border-color: var(--brand-red); background: var(--brand-red-soft); }
.role-check__box {
  width: 20px; height: 20px; flex: none;
  border: 1.5px solid var(--muted); border-radius: 6px;
  display: grid; place-items: center; color: #fff;
  transition: background .15s, border-color .15s;
}
.role-check.is-on .role-check__box { background: var(--brand-red); border-color: var(--brand-red); }
.role-check__body { display: flex; flex-direction: column; }
.role-check__name { font-size: 13px; font-weight: 600; color: var(--ink); }
.role-check__desc { font-size: 12px; color: var(--muted); }
.modal__error {
  display: flex; align-items: center; gap: 6px; margin: 0;
  font-size: 13px; color: var(--status-critical);
}
.modal__foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 20px; border-top: 1px solid var(--hairline);
}
</style>
