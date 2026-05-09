import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api';

const QUESTIONS = [
  {
    id: 'q1',
    th: 'ทำงานเป็นทีม และเน้นเป้าหมายของทีมเป็นหลัก',
    en: 'Work as a team and focus on the team\'s goals',
    icon: '🤝',
  },
  {
    id: 'q2',
    th: 'ช่วยเหลือเพื่อนร่วมงานโดยไม่ต้องรอให้ขอ',
    en: 'Help your teammates without being asked',
    icon: '🙋',
  },
  {
    id: 'q3',
    th: 'พยายามหาวิธีทำให้งานเสร็จก่อนกำหนด',
    en: 'Try to find ways to finish your work ahead of schedule',
    icon: '⚡',
  },
  {
    id: 'q4',
    th: 'แสดงความคิดเห็นที่สามารถนำไปใช้จริงได้',
    en: 'Share ideas that can be applied in real work',
    icon: '💡',
  },
  {
    id: 'q5',
    th: 'คำนึงถึงผลประโยชน์ส่วนรวมก่อนผลประโยชน์ส่วนตัว',
    en: "Think of the team's benefit before your own",
    icon: '🌟',
  },
  {
    id: 'q6',
    th: 'ติดตามและประสานงานให้ได้ผลลัพธ์ตามที่ต้องการ',
    en: 'Follow up and coordinate effectively to get the desired result',
    icon: '🔄',
  },
  {
    id: 'q7',
    th: 'สนใจและให้ความร่วมมือทันทีเมื่อมีคนติดตามงาน',
    en: 'Respond quickly and cooperate when someone follows up on work',
    icon: '📲',
  },
  {
    id: 'q8',
    th: 'แจ้งกำหนดส่งงานแล้วทำได้ ไม่เคยเลื่อนกำหนด',
    en: 'Keep the deadline as schedule — never postpone',
    icon: '📅',
  },
];

const SCORE_LABELS = {
  1: 'ต้องปรับปรุง',
  2: 'พอใช้',
  3: 'ปานกลาง',
  4: 'ดี',
  5: 'ดีมาก',
};

const SCORE_COLORS = {
  1: 'bg-red-500 border-red-500',
  2: 'bg-orange-400 border-orange-400',
  3: 'bg-yellow-400 border-yellow-400',
  4: 'bg-blue-500 border-blue-500',
  5: 'bg-green-500 border-green-500',
};

export default function EvalForm() {
  const { id: evaluateeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { emp, round } = location.state || {};

  const [scores, setScores] = useState({ q1:'', q2:'', q3:'', q4:'', q5:'', q6:'', q7:'', q8:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!emp || !round) { navigate('/eval'); return; }
    loadExisting();
  }, []);

  async function loadExisting() {
    try {
      const res = await api.get(`/evaluations/check-submitted/${evaluateeId}`);
      if (res.data.submitted) {
        const s = res.data.scores;
        setScores({ q1:s.q1, q2:s.q2, q3:s.q3, q4:s.q4, q5:s.q5, q6:s.q6, q7:s.q7, q8:s.q8 });
      }
    } catch (e) { /* ignore */ }
    finally { setLoaded(true); }
  }

  const allAnswered = QUESTIONS.every(q => scores[q.id] !== '');
  const avgScore = allAnswered
    ? (QUESTIONS.reduce((s, q) => s + Number(scores[q.id]), 0) / QUESTIONS.length).toFixed(1)
    : null;

  async function handleSave() {
    if (!allAnswered) return setError('กรุณาให้คะแนนทุกหัวข้อ');
    setSaving(true);
    setError('');
    try {
      await api.post('/evaluations/save', {
        roundId: round.id,
        evaluateeId: parseInt(evaluateeId),
        scores: Object.fromEntries(
          Object.entries(scores).map(([k, v]) => [k, parseInt(v)])
        ),
      });
      navigate('/eval', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-4 pt-6 pb-16">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('/eval')}
            className="text-blue-200 hover:text-white text-sm mb-4 flex items-center gap-1"
          >
            ← กลับ
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
              {emp?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-blue-200 text-xs">กำลังประเมิน</p>
              <h2 className="font-bold text-lg leading-tight">{emp?.name}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10">
        {/* Score summary card */}
        <div className="card shadow-lg flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-gray-500">คะแนนเฉลี่ยที่คุณให้</p>
            <p className="text-3xl font-bold text-blue-700">{avgScore || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">ตอบแล้ว</p>
            <p className="text-lg font-bold text-gray-700">
              {QUESTIONS.filter(q => scores[q.id] !== '').length}/{QUESTIONS.length}
            </p>
          </div>
        </div>

        {/* Questions */}
        {QUESTIONS.map((q, idx) => (
          <div key={q.id} className="card">
            <div className="flex gap-2 mb-3">
              <span className="text-xl">{q.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm leading-snug">{q.th}</p>
                <p className="text-gray-400 text-xs mt-0.5 italic">{q.en}</p>
              </div>
            </div>

            {/* Score buttons */}
            <div className="flex gap-2 justify-between">
              {[1, 2, 3, 4, 5].map(val => {
                const selected = parseInt(scores[q.id]) === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScores(prev => ({ ...prev, [q.id]: val }))}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all duration-150
                      ${selected
                        ? `${SCORE_COLORS[val]} text-white scale-105 shadow-md`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
            {scores[q.id] && (
              <p className="text-center text-xs mt-2 font-medium" style={{
                color: ['','#ef4444','#f97316','#eab308','#3b82f6','#22c55e'][scores[q.id]]
              }}>
                {SCORE_LABELS[scores[q.id]]}
              </p>
            )}
          </div>
        ))}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
        <div className="max-w-md mx-auto flex gap-3">
          <button onClick={() => navigate('/eval')} className="btn-secondary flex-shrink-0 w-auto px-4">
            ← ย้อนกลับ
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !allAnswered}
            className={`btn-primary flex-1 ${!allAnswered ? 'opacity-50' : ''}`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังบันทึก...
              </span>
            ) : allAnswered ? 'บันทึก ✓' : `ยังขาด ${QUESTIONS.filter(q => !scores[q.id]).length} ข้อ`}
          </button>
        </div>
      </div>
    </div>
  );
}
