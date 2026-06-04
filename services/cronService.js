const cron = require('node-cron');
const db = require('../db');
const scoreService = require('./scoreService');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─── Helper: Get active (open) round ────────────────────────────────────────
async function getActiveRound() {
  const res = await db.query(
    `SELECT * FROM eval_rounds WHERE status='open' ORDER BY id DESC LIMIT 1`
  );
  return res.rows[0] || null;
}

// ─── Helper: Count pending employees ────────────────────────────────────────
async function getPendingEmployees(roundId) {
  const res = await db.query(
    `SELECT e.id, e.name
     FROM employees e
     LEFT JOIN submission_status ss
       ON ss.employee_id = e.id AND ss.round_id = $1
     WHERE (ss.is_complete IS NULL OR ss.is_complete = FALSE)
     ORDER BY e.id`,
    [roundId]
  );
  return res.rows;
}

// ─── Helper: Count completed employees ──────────────────────────────────────
async function getCompletedCount(roundId) {
  const res = await db.query(
    `SELECT COUNT(*) as cnt FROM submission_status
     WHERE round_id=$1 AND is_complete=TRUE`,
    [roundId]
  );
  return parseInt(res.rows[0]?.cnt || 0);
}

// ─── Open round ─────────────────────────────────────────────────────────────
async function openRound(roundId) {
  await db.query(
    `UPDATE eval_rounds SET status='open' WHERE id=$1`,
    [roundId]
  );
  console.log(`[Cron] Round ${roundId} opened`);
}

// ─── Close round and compute scores ─────────────────────────────────────────
async function closeRound(round) {
  await db.query(
    `UPDATE eval_rounds SET status='closed' WHERE id=$1`,
    [round.id]
  );
  console.log(`[Cron] Round ${round.id} closed`);

  const completedCount = await getCompletedCount(round.id);
  const totalEmployees = 21;

  // Compute scores
  await scoreService.computeScores(round.id);
}

// ─── Check and remind ────────────────────────────────────────────────────────
async function checkAndRemind() {
  const round = await getActiveRound();
  if (!round) return;

  const now = new Date();
  const closeTime = new Date(round.close_at);

  // Already closed
  if (now >= closeTime) {
    await closeRound(round);
    return;
  }

  const hoursLeft = Math.round((closeTime - now) / (1000 * 60 * 60));
  const pending = await getPendingEmployees(round.id);
  const completed = await getCompletedCount(round.id);

  if (pending.length === 0) {
    // Everyone done — auto close
    await closeRound(round);
    return;
  }

  console.log(`[Cron] Reminder check: ${pending.length} pending, ${hoursLeft}h left`);
}

// ─── Cron Jobs ───────────────────────────────────────────────────────────────
function startCronJobs() {
  // Every day at 08:00 — check if there's a round to open
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] 08:00 check for rounds to open');
    const res = await db.query(
      `SELECT * FROM eval_rounds
       WHERE status='pending'
         AND DATE(open_at AT TIME ZONE 'Asia/Bangkok') = CURRENT_DATE
       LIMIT 1`
    );
    const round = res.rows[0];
    if (round) {
      await openRound(round.id);
    }
  }, { timezone: 'Asia/Bangkok' });

  // At 16:00 — first reminder (5 hours left)
  cron.schedule('0 16 * * *', async () => {
    console.log('[Cron] 16:00 first reminder check');
    await checkAndRemind();
  }, { timezone: 'Asia/Bangkok' });

  // At 17:00, 18:00, 19:00, 20:00 — hourly reminder
  cron.schedule('0 17,18,19,20 * * *', async () => {
    console.log('[Cron] Hourly reminder check');
    await checkAndRemind();
  }, { timezone: 'Asia/Bangkok' });

  // At 21:00 — close round only if close_at has passed
  cron.schedule('0 21 * * *', async () => {
    console.log('[Cron] 21:00 check close');
    const round = await getActiveRound();
    if (round) {
      const now = new Date();
      const closeTime = new Date(round.close_at);
      if (now >= closeTime) {
        console.log(`[Cron] Closing round ${round.id} — close_at reached`);
        await closeRound(round);
      } else {
        console.log(`[Cron] Round ${round.id} not yet due — close_at: ${closeTime}`);
      }
    }
  }, { timezone: 'Asia/Bangkok' });

  console.log('[Cron] All cron jobs started');
}

// ─── Manual triggers (for admin) ────────────────────────────────────────────
async function manualOpenRound(roundId) {
  await openRound(roundId);
}

async function manualCloseRound(roundId) {
  const res = await db.query('SELECT * FROM eval_rounds WHERE id=$1', [roundId]);
  const round = res.rows[0];
  if (round) await closeRound(round);
}

module.exports = {
  startCronJobs,
  manualOpenRound,
  manualCloseRound,
  checkAndRemind,
  getActiveRound,
  getPendingEmployees,
  getCompletedCount,
};
