-- ============================================================
-- 360° Peer Evaluation System - Database Schema
-- ============================================================

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  pin_hash VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  has_set_pin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: add email and team columns if not exists
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team VARCHAR(100);

-- Evaluation rounds
CREATE TABLE IF NOT EXISTS eval_rounds (
  id SERIAL PRIMARY KEY,
  round_name VARCHAR(255) NOT NULL,
  open_at TIMESTAMP WITH TIME ZONE NOT NULL,
  close_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  -- status: pending | open | closed | published
  reminder_sent_16 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual evaluations (one row per evaluator-evaluatee pair per round)
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  round_id INTEGER REFERENCES eval_rounds(id) ON DELETE CASCADE,
  evaluator_id INTEGER REFERENCES employees(id),
  evaluatee_id INTEGER REFERENCES employees(id),
  q1 SMALLINT CHECK (q1 BETWEEN 1 AND 5),
  q2 SMALLINT CHECK (q2 BETWEEN 1 AND 5),
  q3 SMALLINT CHECK (q3 BETWEEN 1 AND 5),
  q4 SMALLINT CHECK (q4 BETWEEN 1 AND 5),
  q5 SMALLINT CHECK (q5 BETWEEN 1 AND 5),
  q6 SMALLINT CHECK (q6 BETWEEN 1 AND 5),
  q7 SMALLINT CHECK (q7 BETWEEN 1 AND 5),
  q8 SMALLINT CHECK (q8 BETWEEN 1 AND 5),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, evaluator_id, evaluatee_id),
  CHECK (evaluator_id <> evaluatee_id)
);

-- Computed score results per round
CREATE TABLE IF NOT EXISTS score_results (
  id SERIAL PRIMARY KEY,
  round_id INTEGER REFERENCES eval_rounds(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id),
  -- Raw averages (scores received from others)
  q1_avg NUMERIC(4,2), q2_avg NUMERIC(4,2), q3_avg NUMERIC(4,2), q4_avg NUMERIC(4,2),
  q5_avg NUMERIC(4,2), q6_avg NUMERIC(4,2), q7_avg NUMERIC(4,2), q8_avg NUMERIC(4,2),
  overall_avg NUMERIC(4,2),
  -- Norm-referenced scores (1-5)
  q1_norm SMALLINT, q2_norm SMALLINT, q3_norm SMALLINT, q4_norm SMALLINT,
  q5_norm SMALLINT, q6_norm SMALLINT, q7_norm SMALLINT, q8_norm SMALLINT,
  overall_norm NUMERIC(4,2),
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, employee_id)
);

-- Track who has completed their evaluations per round
CREATE TABLE IF NOT EXISTS submission_status (
  id SERIAL PRIMARY KEY,
  round_id INTEGER REFERENCES eval_rounds(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 20,
  is_complete BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(round_id, employee_id)
);

-- ============================================================
-- Seed: Employee Data
-- ============================================================
INSERT INTO employees (id, name, is_admin) VALUES
  (1,  'นายอรรถพล นาดี',            FALSE),
  (2,  'นายอรรถพล ปากันสุข',        FALSE),
  (3,  'นายวิวัฒน์ จันทร์ภิรมย์',   FALSE),
  (4,  'นางสาวนวราภรณ์ ดีศิริ',     FALSE),
  (5,  'นายสายฟ้า เฟื่องฟุ้ง',      FALSE),
  (6,  'นายอริญชย์ ปิ่นทุมา',       FALSE),
  (7,  'นายเกื้อกิจ มลิฟ้า',        FALSE),
  (8,  'นายวราแมน กุหิงวัง',        FALSE),
  (9,  'นายปัญจพล ลือชาวงษ์',       FALSE),
  (10, 'นายภาสกร ลีสอนตะ',          FALSE),
  (11, 'นายบัณฑิฆาพงษ์ เพิ่มพูน',   FALSE),
  (12, 'นายอาคม ศรีหาพล',           FALSE),
  (13, 'นายสรวิชญ์ ชื่นชูใจ',       FALSE),
  (14, 'นายธนภัทร วงษ์ศรีทา',       FALSE),
  (15, 'นางสาวฌาฏลี ยูกิ',          FALSE),
  (16, 'Miss HTET HTET LIN',        FALSE),
  (17, 'นางสาวทิลาวัน กินดาวัง',    FALSE),
  (18, 'นางสาวสิรินธร น้ำใส',       FALSE),
  (19, 'นางสาวสุนันทา คุ้มคณะ',     FALSE),
  (20, 'นางสาวเพ็ญพิชชา สำราญจิตร์', FALSE),
  (21, 'นางสาวเกศราภรณ์ บุญประเสริฐ', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual ID insert
SELECT setval('employees_id_seq', 21);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evaluations_round ON evaluations(round_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(round_id, evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluatee ON evaluations(round_id, evaluatee_id);
CREATE INDEX IF NOT EXISTS idx_score_results_round ON score_results(round_id);
CREATE INDEX IF NOT EXISTS idx_submission_status_round ON submission_status(round_id);
