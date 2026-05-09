const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const scoreService = require('../services/scoreService');
const lineService = require('../services/lineService');
const cronService = require('../services/cronService');

// GET /api/admin/rounds — list all rounds
router.get('/rounds', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*,
         (SELECT COUNT(*) FROM submission_status s WHERE s.round_id=r.id AND s.is_complete=TRUE) as completed_count
       FROM eval_rounds r ORDER BY r.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/rounds — create a new round
router.post('/rounds', requireAdmin, async (req, res) => {
  const { roundName, openAt, closeAt } = req.body;
  if (!roundName || !openAt || !closeAt) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }
  try {
    const result = await db.query(
      `INSERT INTO eval_rounds (round_name, open_at, close_at, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [roundName, openAt, closeAt]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/rounds/:id/open — manually open a round
router.post('/rounds/:id/open', requireAdmin, async (req, res) => {
  try {
    await cronService.manualOpenRound(parseInt(req.params.id));
    res.json({ success: true, message: 'เปิดการประเมินแล้ว และแจ้ง LINE แล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/rounds/:id/close — manually close a round
router.post('/rounds/:id/close', requireAdmin, async (req, res) => {
  try {
    await cronService.manualCloseRound(parseInt(req.params.id));
    res.json({ success: true, message: 'ปิดการประเมินแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/results/:roundId — get computed results
router.get('/results/:roundId', requireAdmin, async (req, res) => {
  try {
    const { roundId } = req.params;

    const roundRes = await db.query('SELECT * FROM eval_rounds WHERE id=$1', [roundId]);
    const round = roundRes.rows[0];
    if (!round) return res.status(404).json({ error: 'ไม่พบรอบการประเมิน' });

    const rawRes = await db.query(
      `SELECT sr.*, e.name
       FROM score_results sr
       JOIN employees e ON e.id = sr.employee_id
       WHERE sr.round_id = $1
       ORDER BY sr.overall_avg DESC NULLS LAST`,
      [roundId]
    );

    const statusRes = await db.query(
      `SELECT ss.*, e.name
       FROM submission_status ss
       JOIN employees e ON e.id = ss.employee_id
       WHERE ss.round_id = $1
       ORDER BY e.id`,
      [roundId]
    );

    const pendingRes = await db.query(
      `SELECT e.id, e.name FROM employees e
       LEFT JOIN submission_status ss ON ss.employee_id=e.id AND ss.round_id=$1
       WHERE ss.is_complete IS NULL OR ss.is_complete=FALSE
       ORDER BY e.id`,
      [roundId]
    );

    res.json({
      round,
      results: rawRes.rows,
      submissionStatus: statusRes.rows,
      pending: pendingRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/results/:roundId/recompute — recompute scores
router.post('/results/:roundId/recompute', requireAdmin, async (req, res) => {
  try {
    await scoreService.computeScores(parseInt(req.params.roundId));
    res.json({ success: true, message: 'คำนวณคะแนนใหม่เรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/results/:roundId/publish — confirm & publish to LINE group
router.post('/results/:roundId/publish', requireAdmin, async (req, res) => {
  try {
    const { roundId } = req.params;

    // Get round
    const roundRes = await db.query('SELECT * FROM eval_rounds WHERE id=$1', [roundId]);
    const round = roundRes.rows[0];
    if (!round) return res.status(404).json({ error: 'ไม่พบรอบการประเมิน' });

    // Get results
    const rawRes = await db.query(
      `SELECT sr.*, e.name FROM score_results sr
       JOIN employees e ON e.id=sr.employee_id
       WHERE sr.round_id=$1 ORDER BY sr.overall_avg DESC NULLS LAST`,
      [roundId]
    );

    if (rawRes.rows.length === 0) {
      return res.status(400).json({ error: 'ยังไม่มีผลคะแนน กรุณาคำนวณก่อน' });
    }

    const rawText = scoreService.formatRawTable(rawRes.rows.map(r => ({
      name: r.name,
      q1: r.q1_avg, q2: r.q2_avg, q3: r.q3_avg, q4: r.q4_avg,
      q5: r.q5_avg, q6: r.q6_avg, q7: r.q7_avg, q8: r.q8_avg,
      overall: r.overall_avg,
    })));

    const normText = scoreService.formatNormTable(rawRes.rows.map(r => ({
      name: r.name,
      q1_norm: r.q1_norm, q2_norm: r.q2_norm, q3_norm: r.q3_norm, q4_norm: r.q4_norm,
      q5_norm: r.q5_norm, q6_norm: r.q6_norm, q7_norm: r.q7_norm, q8_norm: r.q8_norm,
      overall_norm: r.overall_norm,
    })));

    await lineService.notifyPublishResults(round.round_name, rawText, normText);
    await db.query(`UPDATE eval_rounds SET status='published' WHERE id=$1`, [roundId]);

    res.json({ success: true, message: 'ส่งผลเข้ากลุ่ม LINE แล้ว!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/status — overall system status
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const roundRes = await db.query(
      `SELECT * FROM eval_rounds WHERE status IN ('open','pending')
       ORDER BY id DESC LIMIT 1`
    );
    const round = roundRes.rows[0];

    if (!round) return res.json({ round: null, message: 'ไม่มีรอบที่กำลังดำเนินการ' });

    const completedRes = await db.query(
      `SELECT COUNT(*) as cnt FROM submission_status
       WHERE round_id=$1 AND is_complete=TRUE`, [round.id]
    );
    const pendingRes = await cronService.getPendingEmployees(round.id);

    res.json({
      round,
      completed: parseInt(completedRes.rows[0].cnt),
      pending: pendingRes,
      total: 21,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/history — all rounds summary
router.get('/history', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.round_name, r.open_at, r.close_at, r.status,
         COUNT(DISTINCT ss.employee_id) FILTER (WHERE ss.is_complete=TRUE) as submitted_count,
         AVG(sr.overall_avg) as group_avg
       FROM eval_rounds r
       LEFT JOIN submission_status ss ON ss.round_id=r.id
       LEFT JOIN score_results sr ON sr.round_id=r.id
       GROUP BY r.id ORDER BY r.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/yearly-avg — compute year-end averages
router.get('/yearly-avg', requireAdmin, async (req, res) => {
  const { year } = req.query;
  try {
    const result = await db.query(
      `SELECT e.id, e.name,
         ROUND(AVG(sr.q1_avg)::numeric, 2) as q1_yearly,
         ROUND(AVG(sr.q2_avg)::numeric, 2) as q2_yearly,
         ROUND(AVG(sr.q3_avg)::numeric, 2) as q3_yearly,
         ROUND(AVG(sr.q4_avg)::numeric, 2) as q4_yearly,
         ROUND(AVG(sr.q5_avg)::numeric, 2) as q5_yearly,
         ROUND(AVG(sr.q6_avg)::numeric, 2) as q6_yearly,
         ROUND(AVG(sr.q7_avg)::numeric, 2) as q7_yearly,
         ROUND(AVG(sr.q8_avg)::numeric, 2) as q8_yearly,
         ROUND(AVG(sr.overall_avg)::numeric, 2) as yearly_avg,
         ROUND(AVG(sr.overall_norm)::numeric, 2) as yearly_norm,
         COUNT(sr.round_id) as rounds_count
       FROM employees e
       LEFT JOIN score_results sr ON sr.employee_id=e.id
       LEFT JOIN eval_rounds r ON r.id=sr.round_id
       WHERE ($1::text IS NULL OR EXTRACT(YEAR FROM r.open_at)=$1::integer)
         AND r.status IN ('closed','published')
       GROUP BY e.id, e.name
       ORDER BY yearly_avg DESC NULLS LAST`,
      [year || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
