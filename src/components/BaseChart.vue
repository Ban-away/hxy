<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '300px' },
  autoresize: { type: Boolean, default: true }
})

const el = ref(null)
const chart = shallowRef(null)
let ro = null

function render() {
  if (!chart.value) return
  chart.value.setOption(props.option, { notMerge: true, lazyUpdate: true })
}

onMounted(() => {
  chart.value = echarts.init(el.value)
  render()
  if (props.autoresize) {
    ro = new ResizeObserver(() => chart.value && chart.value.resize())
    ro.observe(el.value)
  }
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  ro && ro.disconnect()
  chart.value && chart.value.dispose()
})
</script>

<template>
  <div ref="el" :style="{ height, width: '100%' }"></div>
</template>
