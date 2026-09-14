<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../api.js'
import { login } from '../store/auth.js'
import Icon from '../components/Icon.vue'

const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function onSubmit() {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const { token, user } = await api.post('/auth/login', {
      username: username.value,
      password: password.value
    })
    login(token, user)
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="login__panel">
      <div class="login__brand">
        <div class="login__logo">桥</div>
        <div>
          <div class="login__name">文化桥评估系统</div>
          <div class="login__tag">本土中文教师中华文化传播力影响力评估与调研数字化模型</div>
        </div>
      </div>

      <form class="login__form" @submit.prevent="onSubmit">
        <div class="field">
          <label class="field__label" for="username">用户名</label>
          <div class="field__input">
            <Icon name="user" :size="16" class="field__icon" />
            <input id="username" v-model="username" placeholder="请输入用户名" autocomplete="username" />
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="password">密码</label>
          <div class="field__input">
            <Icon name="lock" :size="16" class="field__icon" />
            <input id="password" v-model="password" type="password" placeholder="请输入密码" autocomplete="current-password" />
          </div>
        </div>

        <p v-if="error" class="login__error"><Icon name="alert" :size="14" /> {{ error }}</p>

        <button class="login__btn" type="submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登 录' }}
        </button>
      </form>

      <div class="login__hint">
        <div class="login__hint-title">演示账号</div>
        <div class="login__hint-row"><span class="login__role login__role--admin">系统管理员</span> admin / admin123</div>
        <div class="login__hint-row"><span class="login__role">在校学生</span> student / student123</div>
        <div class="login__hint-row"><span class="login__role">本土中文教师</span> teacher / teacher123</div>
        <div class="login__hint-row"><span class="login__role">用人单位负责人</span> employer / employer123</div>
        <div class="login__hint-row"><span class="login__role">培养高校负责人</span> university / university123</div>
        <div class="login__hint-row login__hint-row--multi"><span class="login__role login__role--admin">多角色示例</span> zhangsan / zhangsan123（培养高校负责人 + 系统管理员）</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(1200px 600px at 80% -10%, rgba(192, 58, 43, 0.10), transparent 60%),
    radial-gradient(900px 500px at 0% 110%, rgba(201, 162, 39, 0.10), transparent 55%),
    var(--paper);
}
.login__panel {
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(31, 35, 48, 0.08);
}
.login__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.login__logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--brand-red), #8c2b20);
  color: #fff;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex: none;
  box-shadow: 0 6px 18px rgba(192, 58, 43, 0.35);
}
.login__name {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
.login__tag {
  font-size: 12px;
  color: var(--muted);
  margin-top: 3px;
  line-height: 1.5;
}
.login__form { display: flex; flex-direction: column; gap: 16px; }
.field__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}
.field__input {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  padding: 0 12px;
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
}
.field__input:focus-within {
  border-color: var(--brand-red);
  box-shadow: 0 0 0 3px rgba(192, 58, 43, 0.10);
}
.field__icon { color: var(--muted); flex: none; }
.field__input input {
  flex: 1;
  height: 42px;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--ink);
  background: transparent;
  font-family: inherit;
}
.login__error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--status-critical);
  margin: -4px 0 0;
}
.login__btn {
  height: 44px;
  border-radius: 10px;
  background: var(--brand-ink);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  transition: background .15s, opacity .15s;
}
.login__btn:hover { background: #2a2f3e; }
.login__btn:disabled { opacity: .6; cursor: not-allowed; }
.login__hint {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--gridline);
}
.login__hint-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 8px;
}
.login__hint-row {
  font-size: 13px;
  color: var(--ink-2);
  font-family: ui-monospace, monospace;
  padding: 3px 0;
}
.login__role {
  display: inline-block;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 5px;
  background: var(--paper-deep);
  color: var(--ink-2);
  margin-right: 6px;
  font-family: inherit;
}
.login__role--admin { background: var(--brand-red-soft); color: var(--brand-red); }
.login__hint-row--multi { white-space: normal; line-height: 1.5; }
</style>
