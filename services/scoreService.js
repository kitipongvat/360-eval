const db = require('../db');

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];

/**
 * Calculate norm-referenced score (1–5) based on position between min/median/max
 */
function calcNorm(value, min, median, max) {
  if (value === null || value === undefined) return null;
  const v = parseFloat(value);
  const mn = parseFloat(min);
  const med = parseFloat(median);
  const mx = parseFloat(max);

  if (v >= mx) return 5;
  if (v > med && v < mx) return 4;
  if (Math.abs(v - med) < 0.001) return 3;
  if (v > mn && v < med) return 2;
  if (v <= mn) return 1;
  return 3; // fallback
}

/**
 * Compute median of an array of numbers
 */
function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].map(Number).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Main: compute and store all scores for a given round
 */
async function computeScores(roundId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Get all employees
    const empRes = await client.query('SELECT id, name FROM employees ORDER BY id');
    const employees = empRes.rows;

    // 2. For each employee, compute average score per question (scores received)
    const rawScores = [];
    for (const emp of employees) {
      const evalRes = await client.query(
        `SELECT q1,q2,q3,q4,q5,q6,q7,q8
         FROM evaluations
         WHERE round_id=$1 AND evaluatee_id=$2`,
        [roundId, emp.id]
      );

      if (evalRes.rows.length === 0) {
        // No evaluations received — score 0 for all
        rawScores.push({
          employee_id: emp.id,
          name: emp.name,
          q1: 0, q2: 0, q3: 0, q4: 0,
          q5: 0, q6: 0, q7: 0, q8: 0,
          overall: 0,
          count: 0,
        });
        continue;
      }

      const avgs = {};
      for (const q of QUESTIONS) {
        const vals = evalRes.rows.map(r => parseFloat(r[q])).filter(v => !isNaN(v));
        avgs[q] = vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : 0;
      }

      const overall = QUESTIONS.reduce((s, q) => s + avgs[q], 0) / QUESTIONS.length;

      rawScores.push({
        employee_id: emp.id,
        name: emp.name,
        ...avgs,
        overall: parseFloat(overall.toFixed(2)),
        count: evalRes.rows.length,
      });
    }

    // 3. Compute Min/Median/Max per question (exclude those with 0 evaluations)
    const activeScores = rawScores.filter(s => s.count > 0);

    const stats = {};
    for (const q of QUESTIONS) {
      const vals = activeScores.map(s => s[q]);
      stats[q] = {
        min: Math.min(...vals),
        max: Math.max(...vals),
        median: median(vals),
      };
    }

    // 4. Compute norm-referenced scores
    const normScores = rawScores.map(s => {
      const norms = {};
      for (const q of QUESTIONS) {
        norms[`${q}_norm`] = s.count > 0
          ? calcNorm(s[q], stats[q].min, stats[q].median, stats[q].max)
          : 1;
      }
      const normVals = Object.values(norms).filter(v => v !== null);
      const normOverall = normVals.length > 0
        ? normVals.reduce((a, b) => a + b, 0) / normVals.length
        : 0;
      return { ...s, ...norms, overall_norm: parseFloat(normOverall.toFixed(2)) };
    });

    // 5. Upsert score_results
    await client.query(`DELETE FROM score_results WHERE round_id=$1`, [roundId]);

    for (const s of normScores) {
      await client.query(
        `INSERT INTO score_results
          (round_id, employee_id,
           q1_avg,q2_avg,q3_avg,q4_avg,q5_avg,q6_avg,q7_avg,q8_avg,overall_avg,
           q1_norm,q2_norm,q3_norm,q4_norm,q5_norm,q6_norm,q7_norm,q8_norm,overall_norm)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (round_id, employee_id)
         DO UPDATE SET
           q1_avg=EXCLUDED.q1_avg, q2_avg=EXCLUDED.q2_avg,
           q3_avg=EXCLUDED.q3_avg, q4_avg=EXCLUDED.q4_avg,
           q5_avg=EXCLUDED.q5_avg, q6_avg=EXCLUDED.q6_avg,
           q7_avg=EXCLUDED.q7_avg, q8_avg=EXCLUDED.q8_avg,
           overall_avg=EXCLUDED.overall_avg,
           q1_norm=EXCLUDED.q1_norm, q2_norm=EXCLUDED.q2_norm,
           q3_norm=EXCLUDED.q3_norm, q4_norm=EXCLUDED.q4_norm,
           q5_norm=EXCLUDED.q5_norm, q6_norm=EXCLUDED.q6_norm,
           q7_norm=EXCLUDED.q7_norm, q8_norm=EXCLUDED.q8_norm,
           overall_norm=EXCLUDED.overall_norm,
           computed_at=NOW()`,
        [
          roundId, s.employee_id,
          s.q1.toFixed(2), s.q2.toFixed(2), s.q3.toFixed(2), s.q4.toFixed(2),
          s.q5.toFixed(2), s.q6.toFixed(2), s.q7.toFixed(2), s.q8.toFixed(2),
          s.overall.toFixed(2),
          s.q1_norm, s.q2_norm, s.q3_norm, s.q4_norm,
          s.q5_norm, s.q6_norm, s.q7_norm, s.q8_norm,
          s.overall_norm,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`[Scores] Computed for round ${roundId}`);
    return { rawScores, normScores, stats };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Scores] Error computing scores:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Format raw score table as plain text for LINE
 */
function formatRawTable(rawScores) {
  const header = 'ชื่อ | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | รวม\n' + '─'.repeat(60);
  const rows = rawScores.map(s => {
    const qs = ['q1','q2','q3','q4','q5','q6','q7','q8']
      .map(q => s[q] ? Number(s[q]).toFixed(1) : '-')
      .join(' | ');
    const name = s.name.length > 12 ? s.name.substring(0, 12) + '..' : s.name;
    return `${name}\n  ${qs} | ${s.overall || '-'}`;
  });
  return header + '\n' + rows.join('\n');
}

/**
 * Format norm score table as plain text for LINE
 */
function formatNormTable(normScores) {
  const header = 'ชื่อ | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | รวม\n' + '─'.repeat(60);
  const rows = normScores.map(s => {
    const qs = ['q1_norm','q2_norm','q3_norm','q4_norm','q5_norm','q6_norm','q7_norm','q8_norm']
      .map(q => s[q] || '-')
      .join(' | ');
    const name = s.name.length > 12 ? s.name.substring(0, 12) + '..' : s.name;
    return `${name}\n  ${qs} | ${s.overall_norm || '-'}`;
  });
  return header + '\n' + rows.join('\n');
}

module.exports = { computeScores, formatRawTable, formatNormTable, calcNorm, median };
