import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../api';

export default function SetupPin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { employeeId, isAdmin } = location.state || {};

  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSetup(e) {
    e.preventDefault();
    if (pin.length < 4) return setError('PIN ต้องมีอย่างน้อย 4 หลัก');
    if (!isAdmin && pin !== confirm) return setError('PIN ไม่ตรงกัน กรุณากรอกใหม่');
    setLoading(true);
    setError('');

    try {
      if (isAdmin) {
        // Admin login with env PIN
        const res = await api.post('/auth/admin-login', { pin });
        login({ id: 0, name: 'Admin', isAdmin: true }, res.data.token);
        navigate('/admin');
      } else {
        const res = await api.post('/auth/setup-pin', { employeeId, pin });
        login(res.data.employee, res.data.token);
        navigate('/eval');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">{isAdmin ? '🔐' : '🔑'}</div>
        <h1 className="text-2xl font-bold text-blue-900">
          {isAdmin ? 'Admin Login' : 'ตั้ง PIN ครั้งแรก'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {isAdmin ? 'กรอก Admin PIN' : 'PIN จะใช้สำหรับเข้าสู่ระบบในครั้งต่อไป'}
        </p>
      </div>

      <div className="w-full max-w-sm card">
        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isAdmin ? 'Admin PIN' : 'ตั้ง PIN (4-8 หลัก)'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="กรอก PIN"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              className="input-field text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>

          {!isAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ยืนยัน PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="กรอก PIN อีกครั้ง"
                value={confirm}
                onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))}
                className="input-field text-center text-2xl tracking-widest"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : (isAdmin ? 'เข้าสู่ระบบ Admin →' : 'บันทึก PIN →')}
          </button>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">
            ← ย้อนกลับ
          </button>
        </form>
      </div>

      {!isAdmin && (
        <p className="text-xs text-gray-400 mt-4 text-center max-w-xs">
          💡 จำ PIN ไว้ให้ดี เนื่องจากใช้เข้าระบบทุกครั้ง<br />
          หากลืม PIN กรุณาติดต่อ Admin
        </p>
      )}
    </div>
  );
}
