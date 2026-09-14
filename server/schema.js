// ============================================================
// 数据库 Schema（参考文档 §2.1 十表 + 用户/角色/预警/设置）
// 用户支持多角色：users + roles + user_roles（多对多）
// 适配 SQLite：ENUM → TEXT + CHECK；生成列 → 应用层计算
// ============================================================

export const SCHEMA = `
-- 用户（认证）—— 多角色通过 user_roles 关联
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  teacher_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 角色（系统 5 角色）
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER DEFAULT 0
);

-- 用户-角色 多对多
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 系统设置（键值，用于可调指标系数等）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 1. 教师主表
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT,
  native_language TEXT,
  teaching_years INTEGER,
  china_experience_type TEXT,
  institution TEXT,
  assessment_status TEXT DEFAULT 'completed',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. 评估任务表
CREATE TABLE IF NOT EXISTS assessment_tasks (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  status TEXT,
  start_date TEXT,
  end_date TEXT,
  tools_used TEXT,
  participants INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  config TEXT
);

-- 问卷任务表（J1/J2/J3 问卷原文 + J4 访谈提纲，按角色分发）
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  target_roles TEXT NOT NULL,
  content TEXT NOT NULL
);

-- 问卷题目（结构化：单选 single / 多选 multiple / 填空 fill）
CREATE TABLE IF NOT EXISTS survey_questions (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT,
  required INTEGER DEFAULT 1
);

-- 用户答卷（每次提交一条，answers 为 JSON：[{questionId, value}]）
CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  answers TEXT NOT NULL,
  submitted_at TEXT DEFAULT (datetime('now'))
);

-- 3. 知识测评记录表
CREATE TABLE IF NOT EXISTS knowledge_test_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  task_id TEXT,
  objective_score REAL,
  subjective_score REAL,
  total_score REAL,
  answers TEXT,
  duration_seconds INTEGER,
  completed_at TEXT
);

-- 4. 认知地图记录表
CREATE TABLE IF NOT EXISTS concept_map_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  task_id TEXT,
  map_data TEXT,
  breadth_score REAL,
  depth_score REAL,
  structure_score REAL,
  connection_score REAL,
  personal_score REAL,
  weighted_total REAL,
  evaluators TEXT,
  created_at TEXT
);

-- 5. 态度量表记录表
CREATE TABLE IF NOT EXISTS attitude_scale_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  task_id TEXT,
  identity_score INTEGER,
  motivation_score INTEGER,
  empathy_score INTEGER,
  reflection_score INTEGER,
  total_score INTEGER,
  responses TEXT,
  completed_at TEXT
);

-- 6. 叙事能力评价记录表
CREATE TABLE IF NOT EXISTS narrative_evaluation_records (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  task_id TEXT,
  task_type TEXT,
  conversion_score REAL,
  attraction_score REAL,
  explanation_score REAL,
  audience_score REAL,
  weighted_total REAL,
  evaluators TEXT,
  created_at TEXT
);

-- 7. 综合评价结果表
CREATE TABLE IF NOT EXISTS assessment_results (
  id TEXT PRIMARY KEY,
  teacher_id TEXT,
  task_id TEXT,
  cognitive_score_rate REAL,
  attitude_score_rate REAL,
  capability_score_rate REAL,
  overall_score REAL,
  level TEXT,
  profile_type TEXT,
  diagnosis TEXT,
  recommendations TEXT,
  radar TEXT,
  report_url TEXT,
  generated_at TEXT
);

-- 8. 用人单位反馈表
CREATE TABLE IF NOT EXISTS employer_feedbacks (
  id TEXT PRIMARY KEY,
  employer_id TEXT,
  teacher_id TEXT,
  language_score REAL,
  teaching_score REAL,
  culture_knowledge_score REAL,
  china_knowledge_score REAL,
  positive_attitude_score REAL,
  initiative_score REAL,
  narrative_score REAL,
  total_score REAL,
  deficiencies TEXT,
  comments TEXT,
  collected_at TEXT
);

-- 9. 培养单位自评表
CREATE TABLE IF NOT EXISTS unit_self_assessments (
  id TEXT PRIMARY KEY,
  unit_id TEXT,
  task_id TEXT,
  scores TEXT,
  total_score INTEGER,
  score_rate REAL,
  attachments TEXT,
  submitted_at TEXT
);

-- 10. 常模参照表
CREATE TABLE IF NOT EXISTS norm_references (
  id TEXT PRIMARY KEY,
  region TEXT,
  teacher_type TEXT,
  sample_size INTEGER,
  cognitive_mean REAL,
  cognitive_std REAL,
  attitude_mean REAL,
  attitude_std REAL,
  capability_mean REAL,
  capability_std REAL,
  overall_mean REAL,
  overall_std REAL,
  updated_at TEXT
);

-- 预警表（用于「待处理预警」看板）
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_name TEXT,
  teacher_code TEXT,
  kind TEXT,
  level TEXT,
  dim TEXT,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_results_teacher ON assessment_results(teacher_id);
CREATE INDEX IF NOT EXISTS idx_results_profile ON assessment_results(profile_type);
CREATE INDEX IF NOT EXISTS idx_feedback_teacher ON employer_feedbacks(teacher_id);
`
