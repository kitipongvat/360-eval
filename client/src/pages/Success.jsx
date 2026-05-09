import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Success() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* Animated checkmark */}
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6
                       animate-bounce">
        <span className="text-5xl">✅</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">ส่งเรียบร้อยแล้ว!</h1>
      <p className="text-gray-500 mb-1">ขอบคุณที่ประเมินเพื่อนร่วมงานทุกคน 🙏</p>
      <p className="text-gray-400 text-sm">ผลการประเมินจะถูกประมวลผลหลังปิดระบบ</p>

      <div className="mt-8 w-full max-w-xs space-y-3">
        <div className="bg-blue-50 rounded-xl p-4 text-left text-sm text-blue-700">
          <p className="font-semibold mb-1">ขั้นตอนถัดไป:</p>
          <ul className="space-y-1 text-blue-600">
            <li>🕘 ระบบปิดเวลา 21:00 น.</li>
            <li>📊 คำนวณคะแนนอัตโนมัติ</li>
            <li>📲 ผู้ดูแลยืนยันและประกาศผลใน LINE</li>
          </ul>
        </div>

        <button
          onClick={() => { logout(); navigate('/'); }}
          className="btn-secondary"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
