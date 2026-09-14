<script setup>
import SideNav from './SideNav.vue'
import TopBar from './TopBar.vue'
</script>

<template>
  <div class="shell">
    <SideNav />
    <div class="main">
      <TopBar />
      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100%;
  overflow: hidden;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.content {
  flex: 1;
  overflow-y: auto;
}
</style>
