import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../api';

const QUESTIONS_SHORT = ['Q1\nทีม', 'Q2\nช่วย', 'Q3\nเร็ว', 'Q4\nไอเดีย', 'Q5\nส่วนรวม', 'Q6\nประสาน', 'Q7\nตอบสนอง', 'Q8\nDeadline'];

export default function Admin() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('status');
  const [status, setStatus] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [results, setResults] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // New round form
  const [newRound, setNewRound] = useState({ roundName: '', openAt: '', closeAt: '' });

  useEffect(() => { loadStatus(); loadRounds(); }, []);

  async function loadStatus() {
    try {
      const res = await api.get('/admin/status');
      setStatus(res.data);
    } catch (e) { /* ignore */ }
  }

  async function loadRounds() {
    try {
      const res = await api.get('/admin/rounds');
      setRounds(res.data);
    } catch (e) { /* ignore */ }
  }

  async function loadResults(roundId) {
    setLoading(true);
    try {
      const res = await api.get(`/admin/results/${roundId}`);
      setResults(res.data);
      setSelectedRound(roundId);
      setTab('results');
    } catch (e) {
      showMsg('ไม่สามารถโหลดผลได้');
    } finally {
      setLoading(false);
    }
  }

  async function loadYearly() {
    setLoading(true);
    try {
      const year = new Date().getFullYear() + 543; // Buddhist era - not needed, using CE
      const res = await api.get(`/admin/yearly-avg`);
      setYearlyData(res.data);
      setTab('yearly');
    } catch (e) {
      showMsg('ไม่สามารถโหลดประวัติได้');
    } finally {
      setLoading(false);
    }
  }

  async function openRound(id) {
    if (!confirm('เปิดการประเมินและแจ้ง LINE กลุ่ม?')) return;
    try {
      await api.post(`/admin/rounds/${id}/open`);
      showMsg('เปิดการประเมินแล้ว ✓');
      loadStatus(); loadRounds();
    } catch (e) {
      showMsg('เกิดข้อผิดพลาด: ' + (e.response?.data?.error || e.message), true);
    }
  }

  async function closeRound(id) {
    if (!confirm('ปิดการประเมินและคำนวณคะแนน?')) return;
    try {
      await api.post(`/admin/rounds/${id}/close`);
      showMsg('ปิดการประเมินแล้ว ✓');
      loadStatus(); loadRounds();
    } catch (e) {
      showMsg('เกิดข้อผิดพลาด', true);
    }
  }

  async function recompute() {
    try {
      await api.post(`/admin/results/${selectedRound}/recompute`);
      showMsg('คำนวณใหม่เรียบร้อย ✓');
      loadResults(selectedRound);
    } catch (e) {
      showMsg('เกิดข้อผิดพลาด', true);
    }
  }

  async function publishResults() {
    if (!confirm('ยืนยันส่งผลเข้ากลุ่ม LINE?')) return;
    try {
      await api.post(`/admin/results/${selectedRound}/publish`);
      showMsg('ส่งผลเข้ากลุ่ม LINE แล้ว! ✓');
      loadRounds();
    } catch (e) {
      showMsg(e.response?.data?.error || 'เกิดข้อผิดพลาด', true);
    }
  }

  async function createRound(e) {
    e.preventDefault();
    try {
      await api.post('/admin/rounds', newRound);
      showMsg('สร้างรอบประเมินใหม่แล้ว ✓');
      setNewRound({ roundName: '', openAt: '', closeAt: '' });
      loadRounds();
    } catch (err) {
      showMsg(err.response?.data?.error || 'เกิดข้อผิดพลาด', true);
    }
  }

  function showMsg(text, isError = false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(''), 4000);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 pt-6 pb-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Admin Dashboard</h1>
            <p className="text-gray-400 text-xs">ระบบประเมิน 360°</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="text-gray-400 hover:text-white text-sm bg-white/10 px-3 py-1 rounded-lg"
          >
            ออก
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg text-white text-sm
          ${msg.isError ? 'bg-red-500' : 'bg-green-500'}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex overflow-x-auto">
          {[
            { id: 'status', label: '📊 สถานะ' },
            { id: 'rounds', label: '📋 รอบประเมิน' },
            { id: 'results', label: '🏆 ผลคะแนน' },
            { id: 'yearly', label: '📈 ประวัติ' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* ─── Status Tab ─────────────────────────────────────────── */}
        {tab === 'status' && (
          <div>
            {status?.round ? (
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <h2 className="font-bold text-gray-800">{status.round.round_name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${status.round.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {status.round.status}
                  </span>
                </div>

                {/* Progress */}
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">ส่งแล้ว</span>
                  <span className="font-bold text-blue-600">{status.completed}/{status.total} คน</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(status.completed / status.total) * 100}%` }}
                  />
                </div>

                {status.pending.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      ⏳ ยังไม่ได้ประเมิน ({status.pending.length} คน):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {status.pending.map(p => (
                        <span key={p.id} className="bg-orange-50 border border-orange-200
                                                     text-orange-700 text-xs px-2 py-1 rounded-lg">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {status.completed === status.total && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-green-700 font-semibold">🎉 ทุกคนส่งครบแล้ว!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card text-center text-gray-500 py-8">
                <p className="text-3xl mb-2">💤</p>
                <p>ไม่มีการประเมินที่กำลังดำเนินการ</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Rounds Tab ─────────────────────────────────────────── */}
        {tab === 'rounds' && (
          <div>
            {/* Create new round */}
            <div className="card mb-4">
              <h3 className="font-bold text-gray-800 mb-3">➕ สร้างรอบใหม่</h3>
              <form onSubmit={createRound} className="space-y-3">
                <input
                  type="text"
                  placeholder="ชื่อรอบ เช่น ประเมิน ม.ค.–ก.พ. 2568"
                  value={newRound.roundName}
                  onChange={e => setNewRound(p => ({ ...p, roundName: e.target.value }))}
                  className="input-field"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">เปิด (Open At)</label>
                    <input
                      type="datetime-local"
                      value={newRound.openAt}
                      onChange={e => setNewRound(p => ({ ...p, openAt: e.target.value }))}
                      className="input-field text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ปิด (Close At)</label>
                    <input
                      type="datetime-local"
                      value={newRound.closeAt}
                      onChange={e => setNewRound(p => ({ ...p, closeAt: e.target.value }))}
                      className="input-field text-sm"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary">สร้างรอบใหม่</button>
              </form>
            </div>

            {/* Round list */}
            {rounds.map(r => (
              <div key={r.id} className="card mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800">{r.round_name}</h4>
                    <p className="text-xs text-gray-400">
                      {new Date(r.open_at).toLocaleDateString('th-TH')} –{' '}
                      {new Date(r.close_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0
                    ${{ pending:'bg-gray-100 text-gray-600', open:'bg-green-100 text-green-700',
                         closed:'bg-blue-100 text-blue-700', published:'bg-purple-100 text-purple-700' }[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  ส่งครบ: {r.completed_count || 0}/21 คน
                </p>
                <div className="flex flex-wrap gap-2">
                  {r.status === 'pending' && (
                    <button onClick={() => openRound(r.id)}
                      className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      🟢 เปิดการประเมิน
                    </button>
                  )}
                  {r.status === 'open' && (
                    <button onClick={() => closeRound(r.id)}
                      className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                      🔴 ปิดการประเมิน
                    </button>
                  )}
                  {(r.status === 'closed' || r.status === 'published') && (
                    <button onClick={() => loadResults(r.id)}
                      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                      📊 ดูผลคะแนน
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Results Tab ─────────────────────────────────────────── */}
        {tab === 'results' && (
          <div>
            {loading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              </div>
            )}

            {results && !loading && (
              <div>
                <div className="card mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">{results.round.round_name}</h3>
                    <span className="text-xs text-gray-400">
                      ส่งแล้ว {21 - results.pending.length}/21 คน
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={recompute}
                      className="text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600">
                      🔄 คำนวณใหม่
                    </button>
                    <button onClick={publishResults}
                      className={`text-sm px-3 py-1.5 rounded-lg ${
                        results.round.status === 'published'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}>
                      {results.round.status === 'published' ? '✓ ส่ง LINE อีกครั้ง' : '📲 ยืนยัน + ส่ง LINE'}
                    </button>
                  </div>
                </div>

                {/* Raw Score Table */}
                <div className="card overflow-x-auto">
                  <h4 className="font-bold text-gray-800 mb-3">📊 คะแนนดิบ</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2 font-semibold text-gray-600 sticky left-0 bg-gray-50">ชื่อ</th>
                        {['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8'].map(q => (
                          <th key={q} className="p-2 font-semibold text-gray-600 text-center">{q}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.results.map((r, i) => (
                        <tr key={r.employee_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 font-medium text-gray-800 sticky left-0 bg-inherit whitespace-nowrap">
                            {r.name}
                          </td>
                          {['q1_avg','q2_avg','q3_avg','q4_avg','q5_avg','q6_avg','q7_avg','q8_avg'].map(q => (
                            <td key={q} className="p-2 text-center text-gray-700">
                              {r[q] ? Number(r[q]).toFixed(1) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Norm Score Table */}
                <div className="card overflow-x-auto mt-3">
                  <h4 className="font-bold text-gray-800 mb-3">🎯 คะแนนอิงกลุ่ม</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2 font-semibold text-gray-600 sticky left-0 bg-gray-50">ชื่อ</th>
                        {['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8'].map(q => (
                          <th key={q} className="p-2 font-semibold text-gray-600 text-center">{q}</th>
                        ))}
                        <th className="p-2 font-bold text-green-700 text-center">รวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.results.map((r, i) => {
                        const normKeys = ['q1_norm','q2_norm','q3_norm','q4_norm','q5_norm','q6_norm','q7_norm','q8_norm'];
                        const normSum = normKeys.reduce((sum, q) => sum + (Number(r[q]) || 0), 0);
                        return (
                          <tr key={r.employee_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2 font-medium text-gray-800 sticky left-0 bg-inherit whitespace-nowrap">
                              {r.name}
                            </td>
                            {normKeys.map(q => (
                              <td key={q} className="p-2 text-center">
                                <NormBadge value={r[q]} />
                              </td>
                            ))}
                            <td className="p-2 text-center font-bold text-green-700">
                              {normSum > 0 ? normSum : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pending list */}
                {results.pending.length > 0 && (
                  <div className="card mt-3">
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                      ⚠️ ไม่ได้ส่ง ({results.pending.length} คน)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {results.pending.map(p => (
                        <span key={p.id} className="bg-red-50 border border-red-200 text-red-600 text-xs px-2 py-1 rounded-lg">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!results && !loading && (
              <div className="card text-center py-8 text-gray-500">
                <p>เลือกรอบจาก "รอบประเมิน" เพื่อดูผล</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Yearly Tab ──────────────────────────────────────────── */}
        {tab === 'yearly' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">📈 คะแนนเฉลี่ยรายปี</h3>
              <button onClick={loadYearly} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">
                {loading ? '...' : 'โหลด'}
              </button>
            </div>

            {yearlyData && yearlyData.rounds && (
              <div className="card overflow-x-auto">
                {yearlyData.rounds.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีรอบที่ปิดแล้ว</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2 sticky left-0 bg-gray-50 text-gray-600 whitespace-nowrap">ชื่อ</th>
                        {yearlyData.rounds.map(r => (
                          <th key={r.id} className="p-2 text-gray-600 text-center whitespace-nowrap">
                            {r.round_name}
                          </th>
                        ))}
                        <th className="p-2 text-blue-700 font-bold text-center whitespace-nowrap">เฉลี่ย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyData.employees.map((emp, i) => (
                        <tr key={emp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 font-medium text-gray-800 sticky left-0 bg-inherit whitespace-nowrap">
                            {emp.name}
                          </td>
                          {emp.roundScores.map(rs => (
                            <td key={rs.round_id} className="p-2 text-center text-gray-700 font-medium">
                              {rs.norm_sum !== null ? rs.norm_sum : '—'}
                            </td>
                          ))}
                          <td className="p-2 text-center font-bold text-blue-700">
                            {emp.yearly_avg !== null ? Number(emp.yearly_avg).toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {!yearlyData && !loading && (
              <div className="card text-center py-8 text-gray-500">
                <p>กด "โหลด" เพื่อดูคะแนนรวม Norm รายรอบ</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function NormBadge({ value }) {
  if (!value) return <span className="text-gray-300">—</span>;
  const colors = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${colors[value] || 'bg-gray-100'}`}>
      {value}
    </span>
  );
}
