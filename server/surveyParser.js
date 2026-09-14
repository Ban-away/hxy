// ============================================================
// 问卷 markdown 原文 → 结构化题目解析器
// 支持题型：single（单选 ○）、multiple（多选 □）、fill（填空/开放题）
// 支持量表表格（5/6 点）拆分为多道单选题
// ============================================================

function cleanOption(s) {
  return s.trim().replace(/^[A-Z]\s*[\.、]\s*/, '').trim()
}

function splitInline(body, mark) {
  return body
    .split(mark)
    .map((s) => s.trim())
    .filter(Boolean)
}

// 从题干的“N点量表：1=标签，2=标签…”中抽取量表标签
function parseScale(prompt) {
  const m = prompt.match(/点量表[:：]\s*([^）)]+)/)
  if (!m) return null
  const parts = m[1].split(/[，,、]/).map((s) => s.trim()).filter(Boolean)
  const labels = parts.map((p) => {
    const pm = p.match(/^\d+\s*[=＝]\s*(.+)$/)
    return pm ? pm[1].trim() : p
  })
  return labels.length ? labels : null
}

function buildQuestions(cur) {
  const list = []
  const scale = parseScale(cur.prompt)

  if (cur.subs.length) {
    // 量表题：每个子项一道单选
    for (const sub of cur.subs) {
      const n = sub.scale || 5
      const opts = scale && scale.length >= n
        ? scale.slice(0, n)
        : Array.from({ length: n }, (_, i) => String(i + 1))
      list.push({ prompt: `${sub.num} ${sub.prompt}`, type: 'single', options: opts })
    }
    return list
  }

  if (cur.hasMulti || /可多选|多选/.test(cur.prompt)) {
    list.push({ prompt: cur.prompt, type: 'multiple', options: cur.options })
    return list
  }

  if (cur.hasSingle || cur.options.length || /单选/.test(cur.prompt)) {
    list.push({ prompt: cur.prompt, type: 'single', options: cur.options })
    return list
  }

  if (cur.blanks > 0 || /填空|开放题|请简述|请简要|（可选）/.test(cur.prompt)) {
    list.push({ prompt: cur.prompt, type: 'fill', options: [] })
    return list
  }

  // 默认按开放题（填空）处理
  list.push({ prompt: cur.prompt, type: 'fill', options: [] })
  return list
}

export function parseQuestions(content) {
  const lines = content.split(/\r?\n/)
  const out = []
  let cur = null
  let roleSection = '' // J4 的角色专用小节标题

  const pushCurrent = () => {
    if (!cur) return
    out.push(...buildQuestions(cur))
    cur = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // 小节标题：#### 【角色专用】 用于补充题干上下文；### 重置
    const sub = line.match(/^####\s*(.+)$/)
    if (sub) { roleSection = sub[1].trim(); continue }
    if (/^###\s*/.test(line)) { roleSection = ''; continue }

    // 题目标题：**N. 题干** [行尾]
    const head = line.match(/^\*\*(\d+(?:-\d+)?)\.\s*(.+?)\*\*(.*)$/)
    if (head) {
      pushCurrent()
      cur = {
        num: head[1],
        prompt: roleSection ? `${roleSection} · ${head[2].trim()}` : head[2].trim(),
        trailing: head[3].trim(),
        options: [],
        hasSingle: false,
        hasMulti: false,
        blanks: 0,
        subs: []
      }
      if (cur.trailing && /_/.test(cur.trailing)) {
        cur.blanks += (cur.trailing.match(/_+/g) || []).length
      }
      continue
    }

    if (!cur) continue

    // 量表表格数据行：| 6-1 | 题项 | ○ | ○ … |
    if (line.startsWith('|')) {
      if (line.includes('○') && !line.includes('题项') && !line.includes('题号') && !line.includes('---')) {
        const cells = line.split('|').map((c) => c.trim()).filter((c) => c !== '')
        if (cells.length >= 2) {
          cur.subs.push({ num: cells[0], prompt: cells[1], scale: cells.length - 2 })
        }
      }
      continue
    }

    // 选项行
    if (line.startsWith('- ') || line.startsWith('□ ') || line.startsWith('○ ')) {
      let body = line.replace(/^- /, '').trim()
      if (body.startsWith('○')) {
        cur.hasSingle = true
        for (const p of splitInline(body, '○')) {
          const opt = cleanOption(p)
          if (opt) cur.options.push(opt)
        }
      } else if (body.startsWith('□')) {
        cur.hasMulti = true
        for (const p of splitInline(body, '□')) {
          const opt = cleanOption(p)
          if (opt) cur.options.push(opt)
        }
      }
      continue
    }

    // 下划线填空
    if (/_/.test(line)) {
      cur.blanks += (line.match(/_+/g) || []).length
    }
  }
  pushCurrent()
  return out
}
