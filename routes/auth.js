const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { generateToken } = require('../middleware/auth');

// GET /api/employees — list all employees for login dropdown
router.get('/employees', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, has_set_pin FROM employees ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/setup-pin — first time PIN setup
router.post('/setup-pin', async (req, res) => {
  const { employeeId, pin } = req.body;
  if (!employeeId || !pin || pin.length < 4) {
    return res.status(400).json({ error: 'กรุณาระบุ PIN อย่างน้อย 4 หลัก' });
  }

  try {
    const emp = await db.query('SELECT * FROM employees WHERE id=$1', [employeeId]);
    if (!emp.rows[0]) return res.status(404).json({ error: 'ไม่พบพนักงาน' });
    if (emp.rows[0].has_set_pin) {
      return res.status(400).json({ error: 'ตั้ง PIN แล้ว กรุณาใช้ PIN เดิม' });
    }

    const hash = await bcrypt.hash(pin, 10);
    await db.query(
      `UPDATE employees SET pin_hash=$1, has_set_pin=TRUE WHERE id=$2`,
      [hash, employeeId]
    );

    const token = generateToken({ id: emp.rows[0].id, name: emp.rows[0].name, isAdmin: false });
    res.json({ token, employee: { id: emp.rows[0].id, name: emp.rows[0].name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — login with PIN
router.post('/login', async (req, res) => {
  const { employeeId, pin } = req.body;
  if (!employeeId || !pin) {
    return res.status(400).json({ error: 'กรุณาระบุรหัสพนักงานและ PIN' });
  }

  try {
    const emp = await db.query('SELECT * FROM employees WHERE id=$1', [employeeId]);
    if (!emp.rows[0]) return res.status(404).json({ error: 'ไม่พบพนักงาน' });

    const employee = emp.rows[0];
    if (!employee.has_set_pin || !employee.pin_hash) {
      return res.status(400).json({ error: 'ยังไม่ได้ตั้ง PIN กรุณาตั้ง PIN ก่อน', needsSetup: true });
    }

    const valid = await bcrypt.compare(pin, employee.pin_hash);
    if (!valid) return res.status(401).json({ error: 'PIN ไม่ถูกต้อง' });

    const token = generateToken({
      id: employee.id,
      name: employee.name,
      isAdmin: employee.is_admin,
    });

    res.json({
      token,
      employee: { id: employee.id, name: employee.name, isAdmin: employee.is_admin },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-login — admin login with special PIN
router.post('/admin-login', async (req, res) => {
  const { pin } = req.body;
  const adminPin = process.env.ADMIN_PIN;

  if (!adminPin) return res.status(500).json({ error: 'Admin PIN not configured' });
  if (pin !== adminPin) return res.status(401).json({ error: 'PIN ไม่ถูกต้อง' });

  const token = generateToken({ id: 0, name: 'Admin', isAdmin: true });
  res.json({ token });
});

module.exports = router;
