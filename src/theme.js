// ============================================================
// 图表共享主题常量（与 tokens.css 保持一致，供 ECharts 使用）
// 分类色板已经 validate_palette.js 校验通过
// ============================================================

// 分类系列色（固定顺序）
export const SERIES = [
  '#3a6ba5', // 1 黛蓝
  '#e0692f', // 2 赭橙
  '#1ba983', // 3 竹青
  '#d19a1f', // 4 鎏金
  '#c2547e', // 5 胭脂
  '#3e7d3c', // 6 松绿
  '#6c5b9e', // 7 黛紫
  '#c03a2b'  // 8 朱砂红
]

export const INK = {
  primary: '#1f1f1f',
  secondary: '#52514e',
  muted: '#898781'
}

export const CHROME = {
  surface: '#fcfcfb',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7'
}

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b'
}

export const BRAND = {
  red: '#c03a2b',
  redDark: '#a02f22',
  gold: '#c9a227',
  jade: '#1ba983',
  ink: '#1f2330'
}

// 状态色 → 标签/徽章
export const STATUS_LABEL = {
  critical: '严重',
  serious: '警告',
  warning: '关注',
  good: '正常'
}

// ECharts 通用片段
export function baseTextStyle() {
  return { color: INK.primary, fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif' }
}

export function baseAxis() {
  return {
    axisLine: { lineStyle: { color: CHROME.baseline } },
    axisTick: { show: false },
    axisLabel: { color: INK.muted, fontSize: 12 },
    splitLine: { lineStyle: { color: CHROME.gridline, width: 1 } }
  }
}

export function baseTooltip() {
  return {
    backgroundColor: '#ffffff',
    borderColor: CHROME.gridline,
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { color: INK.primary, fontSize: 13 },
    extraCssText: 'box-shadow: 0 6px 20px rgba(31,27,20,.12); border-radius: 8px;'
  }
}

export function baseLegend() {
  return {
    textStyle: { color: INK.secondary, fontSize: 12 },
    itemWidth: 10,
    itemHeight: 10,
    icon: 'roundRect',
    itemGap: 16
  }
}
