// ============================================================
// SQLite 连接（node:sqlite 内置模块，无需原生编译）
// 首次启动自动建表 + 灌入种子数据（数据文件：server/data/app.db）
// ============================================================

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SCHEMA } from './schema.js'
import { seed, seedSurveys, seedSurveyQuestions } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db')

let db = null

export function getDb() {
  if (db) return db
  mkdirSync(DATA_DIR, { recursive: true })
  db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM teachers').get()
  if (c === 0) seed(db)
  else ensureSurveyData(db)
  return db
}

// 已有数据库：补齐新增的问卷 / 题目表（幂等，不覆盖管理员编辑）
function ensureSurveyData(db) {
  const sc = db.prepare('SELECT COUNT(*) AS c FROM surveys').get().c
  if (sc === 0) seedSurveys(db)
  const qc = db.prepare('SELECT COUNT(*) AS c FROM survey_questions').get().c
  if (qc === 0) seedSurveyQuestions(db)
}
