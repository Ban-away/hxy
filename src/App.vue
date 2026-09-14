<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import { auth, refreshUser } from './store/auth.js'

const route = useRoute()

onMounted(() => {
  if (auth.token) refreshUser()
})
</script>

<template>
  <AppLayout v-if="route.meta.layout !== 'bare'">
    <router-view />
  </AppLayout>
  <router-view v-else />
</template>
