const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const TOTAL_EMPLOYEES = 21;

// GET /api/evaluations/round — get current open round
router.get('/round', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM eval_rounds
       WHERE status = 'open'
       ORDER BY id DESC LIMIT 1`
    );
    if (!result.rows[0]) {
      return res.json({ round: null, message: 'ยังไม่มีการประเมินที่เปิดอยู่' });
    }
    res.json({ round: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/evaluations/progress — get my evaluation progress
router.get('/progress', requireAuth, async (req, res) => {
  try {
    const roundRes = await db.query(
      `SELECT * FROM eval_rounds WHERE status='open' ORDER BY id DESC LIMIT 1`
    );
    const round = roundRes.rows[0];
    if (!round) return res.json({ round: null, evaluated: [], pending: [] });

    const employeeId = req.user.id;

    // All employees except self
    const allEmps = await db.query(
      `SELECT id, name FROM employees WHERE id != $1 ORDER BY id`,
      [employeeId]
    );

    // Already evaluated
    const doneRes = await db.query(
      `SELECT evaluatee_id FROM evaluations
       WHERE round_id=$1 AND evaluator_id=$2`,
      [round.id, employeeId]
    );
    const doneIds = new Set(doneRes.rows.map(r => r.evaluatee_id));

    const evaluated = allEmps.rows.filter(e => doneIds.has(e.id));
    const pending = allEmps.rows.filter(e => !doneIds.has(e.id));

    res.json({
      round,
      evaluated,
      pending,
      total: allEmps.rows.length,
      completedCount: evaluated.length,
      isComplete: pending.length === 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/evaluations/save — save evaluation for one person
router.post('/save', requireAuth, async (req, res) => {
  const { roundId, evaluateeId, scores } = req.body;
  const evaluatorId = req.user.id;

  if (!roundId || !evaluateeId || !scores) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }
  if (evaluatorId === evaluateeId) {
    return res.status(400).json({ error: 'ไม่สามารถประเมินตนเองได้' });
  }

  const { q1, q2, q3, q4, q5, q6, q7, q8 } = scores;
  const allScores = [q1, q2, q3, q4, q5, q6, q7, q8];
  if (allScores.some(s => !s || s < 1 || s > 5)) {
    return res.status(400).json({ error: 'คะแนนต้องอยู่ระหว่าง 1-5 ทุกหัวข้อ' });
  }

  try {
    // Check round is open
    const roundRes = await db.query(
      `SELECT * FROM eval_rounds WHERE id=$1 AND status='open'`, [roundId]
    );
    if (!roundRes.rows[0]) {
      return res.status(400).json({ error: 'ระบบประเมินปิดแล้ว' });
    }

    await db.query(
      `INSERT INTO evaluations
         (round_id, evaluator_id, evaluatee_id, q1,q2,q3,q4,q5,q6,q7,q8)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (round_id, evaluator_id, evaluatee_id)
       DO UPDATE SET q1=$4,q2=$5,q3=$6,q4=$7,q5=$8,q6=$9,q7=$10,q8=$11,
                     submitted_at=NOW()`,
      [roundId, evaluatorId, evaluateeId, q1, q2, q3, q4, q5, q6, q7, q8]
    );

    // Update submission_status
    const countRes = await db.query(
      `SELECT COUNT(*) as cnt FROM evaluations
       WHERE round_id=$1 AND evaluator_id=$2`,
      [roundId, evaluatorId]
    );
    const completedCount = parseInt(countRes.rows[0].cnt);
    const isComplete = completedCount >= (TOTAL_EMPLOYEES - 1);

    await db.query(
      `INSERT INTO submission_status (round_id, employee_id, completed_count, total_count, is_complete, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (round_id, employee_id)
       DO UPDATE SET completed_count=$3, is_complete=$5,
         completed_at = CASE WHEN $5 THEN NOW() ELSE NULL END`,
      [roundId, evaluatorId, completedCount, TOTAL_EMPLOYEES - 1, isComplete,
       isComplete ? new Date() : null]
    );

    res.json({ success: true, completedCount, isComplete });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/evaluations/submit-all — final confirmation (all done)
router.post('/submit-all', requireAuth, async (req, res) => {
  const { roundId } = req.body;
  const evaluatorId = req.user.id;

  try {
    const countRes = await db.query(
      `SELECT COUNT(*) as cnt FROM evaluations
       WHERE round_id=$1 AND evaluator_id=$2`,
      [roundId, evaluatorId]
    );
    const cnt = parseInt(countRes.rows[0].cnt);

    if (cnt < TOTAL_EMPLOYEES - 1) {
      return res.status(400).json({
        error: `ยังประเมินไม่ครบ (${cnt}/${TOTAL_EMPLOYEES - 1} คน)`,
      });
    }

    await db.query(
      `INSERT INTO submission_status (round_id, employee_id, completed_count, total_count, is_complete, completed_at)
       VALUES ($1,$2,$3,$4,TRUE,NOW())
       ON CONFLICT (round_id, employee_id)
       DO UPDATE SET is_complete=TRUE, completed_at=NOW(), completed_count=$3`,
      [roundId, evaluatorId, cnt, TOTAL_EMPLOYEES - 1]
    );

    res.json({ success: true, message: 'ส่งผลการประเมินเรียบร้อยแล้ว!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/evaluations/check-submitted/:evaluateeId — check if already rated
router.get('/check-submitted/:evaluateeId', requireAuth, async (req, res) => {
  try {
    const roundRes = await db.query(
      `SELECT id FROM eval_rounds WHERE status='open' ORDER BY id DESC LIMIT 1`
    );
    const round = roundRes.rows[0];
    if (!round) return res.json({ submitted: false });

    const existing = await db.query(
      `SELECT q1,q2,q3,q4,q5,q6,q7,q8 FROM evaluations
       WHERE round_id=$1 AND evaluator_id=$2 AND evaluatee_id=$3`,
      [round.id, req.user.id, req.params.evaluateeId]
    );

    if (existing.rows[0]) {
      res.json({ submitted: true, scores: existing.rows[0] });
    } else {
      res.json({ submitted: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
