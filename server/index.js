// ============================================================
// 后端入口：Express + SQLite
// 开发：`npm run dev`（concurrently 同时启动 API + Vite）
// 生产：`npm run build` 后 `npm start`（同端口托管前端）
// ============================================================

import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDb, DB_PATH } from './db.js'
import { api } from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

const app = express()
app.use(cors())
app.use(express.json())

getDb() // 启动即建表/灌种子

app.use('/api', api)
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }))

// 生产环境：托管前端构建产物（dist/）
const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) res.status(200).send('文化桥评估系统后端运行中。前端请运行 `npm run build` 后访问。')
  })
})

app.listen(PORT, () => {
  console.log(`[server] API 已启动 → http://localhost:${PORT}/api`)
  console.log(`[server] 数据库 → ${DB_PATH}`)
})
