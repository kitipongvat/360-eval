import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../api';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roundInfo, setRoundInfo] = useState(null);

  useEffect(() => {
    if (user) navigate(user.isAdmin ? '/admin' : '/eval');
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [empRes, roundRes] = await Promise.all([
        api.get('/auth/employees'),
        api.get('/evaluations/round'),
      ]);
      setEmployees(empRes.data);
      setRoundInfo(roundRes.data.round);
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleLogin(e) {
    e.preventDefault();
    if (!selectedId) return setError('กรุณาเลือกชื่อของคุณ');
    if (!pin) return setError('กรุณากรอก PIN');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { employeeId: selectedId, pin });
      login(res.data.employee, res.data.token);
      navigate(res.data.employee.isAdmin ? '/admin' : '/eval');
    } catch (err) {
      const msg = err.response?.data;
      if (msg?.needsSetup) {
        navigate('/setup-pin', { state: { employeeId: selectedId } });
      } else {
        setError(msg?.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedEmp = employees.find(e => e.id === parseInt(selectedId));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📊</div>
        <h1 className="text-2xl font-bold text-blue-900">ระบบประเมิน 360°</h1>
        <p className="text-gray-500 text-sm mt-1">Peer Evaluation System</p>
      </div>

      {/* Round info banner */}
      {roundInfo ? (
        <div className="w-full max-w-md bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
          <span className="text-green-700 text-sm font-medium">
            🟢 เปิดประเมิน: {roundInfo.round_name}
          </span>
          <div className="text-green-600 text-xs mt-0.5">
            ปิดระบบ {new Date(roundInfo.close_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-center">
          <span className="text-yellow-700 text-sm">⏳ ยังไม่มีการประเมินที่เปิดอยู่</span>
        </div>
      )}

      {/* Login form */}
      <div className="w-full max-w-md card">
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Search + select name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ชื่อของคุณ
            </label>
            {!selectedId ? (
              <div>
                <input
                  type="text"
                  placeholder="🔍 ค้นหาชื่อ..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-field mb-2"
                  autoComplete="off"
                />
                <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200">
                  {filtered.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => { setSelectedId(String(emp.id)); setSearch(''); }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100
                                 border-b border-gray-100 last:border-0 text-sm transition-colors"
                    >
                      <span className="font-medium text-gray-800">{emp.name}</span>
                      {!emp.has_set_pin && (
                        <span className="ml-2 text-xs text-orange-500">(ยังไม่ได้ตั้ง PIN)</span>
                      )}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="px-4 py-3 text-gray-400 text-sm text-center">ไม่พบชื่อ</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {selectedEmp?.name?.charAt(0) || '?'}
                </div>
                <span className="font-semibold text-blue-800 flex-1">{selectedEmp?.name}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedId(''); setPin(''); setError(''); }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  เปลี่ยน
                </button>
              </div>
            )}
          </div>

          {/* PIN */}
          {selectedId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                PIN {selectedEmp?.has_set_pin ? '' : <span className="text-orange-500">(ยังไม่ได้ตั้ง PIN)</span>}
              </label>
              {selectedEmp?.has_set_pin ? (
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="กรอก PIN ของคุณ"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center text-xl tracking-widest"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/setup-pin', { state: { employeeId: selectedId } })}
                  className="btn-primary bg-orange-500 hover:bg-orange-600"
                >
                  ตั้ง PIN ครั้งแรก →
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {selectedId && selectedEmp?.has_set_pin && (
            <button type="submit" className="btn-primary" disabled={loading || !pin}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : 'เข้าสู่ระบบ →'}
            </button>
          )}
        </form>

        {/* Admin link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/setup-pin', { state: { isAdmin: true } })}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}
