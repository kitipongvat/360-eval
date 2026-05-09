import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../api';

export default function EvalList() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchProgress(); }, []);

  async function fetchProgress() {
    try {
      const res = await api.get('/evaluations/progress');
      setProgress(res.data);
    } catch (e) {
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAll() {
    if (!progress?.isComplete) return;
    if (!confirm('ยืนยันการส่งผลการประเมินทั้งหมด? ไม่สามารถแก้ไขได้หลังจากนี้')) return;
    setSubmitting(true);
    try {
      await api.post('/evaluations/submit-all', { roundId: progress.round.id });
      navigate('/success');
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  if (!progress?.round) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">ยังไม่เปิดการประเมิน</h2>
        <p className="text-gray-500 text-sm text-center">
          ระบบจะเปิดในวันจันทร์แรกของรอบการประเมิน
        </p>
        <button onClick={logout} className="mt-6 text-sm text-gray-400 hover:text-gray-600">
          ออกจากระบบ
        </button>
      </div>
    );
  }

  const { round, evaluated, pending, total, completedCount, isComplete } = progress;
  const pct = Math.round((completedCount / total) * 100);

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-4 pt-8 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-blue-200 text-xs">สวัสดี</p>
              <h1 className="font-bold text-lg leading-tight">{user?.name}</h1>
            </div>
            <button
              onClick={logout}
              className="text-blue-300 hover:text-white text-xs bg-white/10 px-3 py-1 rounded-lg"
            >
              ออก
            </button>
          </div>
          <p className="text-blue-200 text-xs mt-2">📋 {round.round_name}</p>
          <p className="text-blue-300 text-xs">
            ปิดระบบ: {new Date(round.close_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {/* Progress card */}
        <div className="card shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-800">ความคืบหน้า</span>
            <span className={`text-sm font-bold ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
              {completedCount}/{total} คน
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span className="font-medium">{pct}%</span>
            <span>{total}</span>
          </div>

          {isComplete && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-green-700 font-semibold text-sm">✅ ประเมินครบทุกคนแล้ว!</p>
              <p className="text-green-600 text-xs mt-0.5">กรุณากด "ยืนยันส่ง" เพื่อเสร็จสิ้น</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Pending list */}
        {pending.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-orange-500">⏳</span>
              รอประเมิน ({pending.length} คน)
            </h3>
            <div className="space-y-2">
              {pending.map((emp, i) => (
                <button
                  key={emp.id}
                  onClick={() => navigate(`/eval/${emp.id}`, { state: { emp, round } })}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50
                             active:bg-blue-100 rounded-xl transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center
                                   text-orange-600 font-bold text-sm shrink-0">
                    {completedCount + i + 1}
                  </div>
                  <span className="text-gray-800 text-sm font-medium">{emp.name}</span>
                  <span className="ml-auto text-blue-500 text-xs">ประเมิน →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Completed list */}
        {evaluated.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-green-500">✅</span>
              ประเมินแล้ว ({evaluated.length} คน)
            </h3>
            <div className="space-y-2">
              {evaluated.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => navigate(`/eval/${emp.id}`, { state: { emp, round, readonly: false } })}
                  className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-xl text-left"
                >
                  <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center
                                   text-green-700 text-sm shrink-0">
                    ✓
                  </div>
                  <span className="text-gray-600 text-sm">{emp.name}</span>
                  <span className="ml-auto text-gray-400 text-xs">แก้ไข</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit button — fixed bottom */}
      {isComplete && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSubmitAll}
              disabled={submitting}
              className="btn-success"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังส่ง...
                </span>
              ) : '✅ ยืนยันส่งผลการประเมินทั้งหมด'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">กำลังโหลด...</p>
      </div>
    </div>
  );
}
