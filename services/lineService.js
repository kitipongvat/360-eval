const axios = require('axios');
const QRCode = require('qrcode');

const LINE_API = 'https://api.line.me/v2/bot/message';
const GROUP_ID = process.env.LINE_GROUP_ID || 'C90e76bf018150c361e4558f2b260b683';
const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };
}

// Send message to group
async function sendGroupMessage(messages) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.log('[LINE] Token not set — skipping group message');
    return;
  }
  try {
    const payload = Array.isArray(messages) ? messages : [messages];
    await axios.post(`${LINE_API}/push`, {
      to: GROUP_ID,
      messages: payload,
    }, { headers: getHeaders() });
    console.log('[LINE] Group message sent');
  } catch (err) {
    console.error('[LINE] Group message error:', err.response?.data || err.message);
  }
}

// Send message to admin privately
async function sendAdminMessage(messages) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !ADMIN_USER_ID) {
    console.log('[LINE] Token or Admin ID not set — skipping admin message');
    return;
  }
  try {
    const payload = Array.isArray(messages) ? messages : [messages];
    await axios.post(`${LINE_API}/push`, {
      to: ADMIN_USER_ID,
      messages: payload,
    }, { headers: getHeaders() });
    console.log('[LINE] Admin message sent');
  } catch (err) {
    console.error('[LINE] Admin message error:', err.response?.data || err.message);
  }
}

// Generate QR code as base64 image
async function generateQRCode(url) {
  try {
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
    return qrDataURL;
  } catch (err) {
    console.error('[QR] Error generating QR code:', err.message);
    return null;
  }
}

// ─── Notification Templates ───────────────────────────────────────────────────

// 1) Open evaluation — notify admin only
async function notifyEvalOpen(roundName, appUrl) {
  const link = `${appUrl}/`;
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const msg = {
    type: 'text',
    text:
      `🔔 [แจ้ง Admin] เปิดการประเมินแล้ว\n` +
      `📋 รอบ: ${roundName}\n` +
      `📅 ${today}\n` +
      `⏰ 08:00 – 21:00 น.\n\n` +
      `👉 ลิงก์สำหรับแจ้งในกลุ่ม:\n${link}`,
  };

  await sendAdminMessage(msg);
}

// 2) Reminder — notify admin only with pending list
async function notifyReminder(pendingNames, hoursLeft) {
  if (!pendingNames || pendingNames.length === 0) return;

  const nameList = pendingNames
    .map((n, i) => `${i + 1}. ${n}`)
    .join('\n');

  const msg = {
    type: 'text',
    text:
      `⏰ [แจ้ง Admin] เหลือเวลาอีก ${hoursLeft} ชม.\n\n` +
      `ยังไม่ได้ประเมิน (${pendingNames.length} คน):\n` +
      `${nameList}\n\n` +
      `(สามารถ forward แจ้งในกลุ่มได้เลยครับ)`,
  };

  await sendAdminMessage(msg);
}

// 3) All done — notify admin only
async function notifyAllComplete(roundName) {
  const msg = {
    type: 'text',
    text:
      `✅ [แจ้ง Admin] ทุกคนส่งครบแล้ว!\n` +
      `🎉 รอบ: ${roundName}\n` +
      `ระบบกำลังประมวลผลคะแนน...`,
  };
  await sendAdminMessage(msg);
}

// 4) System closed — notify admin only
async function notifySystemClosed(roundName, submittedCount, totalCount) {
  const msg = {
    type: 'text',
    text:
      `🔒 [แจ้ง Admin] ปิดรอบ "${roundName}" แล้ว\n` +
      `📊 ส่งผลแล้ว: ${submittedCount}/${totalCount} คน\n` +
      `ระบบกำลังประมวลผลคะแนน...`,
  };
  await sendAdminMessage(msg);
}

// 5) Send results to admin for review
async function notifyAdminResults(roundName, rawTable, normTable, appUrl) {
  const adminUrl = `${appUrl}/admin`;
  const msgs = [
    {
      type: 'text',
      text:
        `📊 ผลการประเมิน 360° พร้อมตรวจสอบแล้ว!\n` +
        `📋 รอบ: ${roundName}\n\n` +
        `กรุณาตรวจสอบและยืนยันผลที่:\n${adminUrl}\n\n` +
        `(เมื่อยืนยันแล้ว ระบบจะส่งผลเข้ากลุ่มทันที)`,
    },
  ];
  await sendAdminMessage(msgs);
}

// 6) Publish results — notify admin only (admin forwards to group)
async function notifyPublishResults(roundName, rawText, normText) {
  const msg = {
    type: 'text',
    text:
      `🏆 [แจ้ง Admin] ผลการประเมิน 360°\n📋 รอบ: ${roundName}\n\n` +
      `📊 คะแนนดิบ\n${rawText}\n\n` +
      `🎯 คะแนนอิงกลุ่ม\n${normText}\n\n` +
      `(กรุณา forward ข้อความนี้เข้ากลุ่มพนักงานด้วยครับ)`,
  };
  await sendAdminMessage(msg);
}

module.exports = {
  sendGroupMessage,
  sendAdminMessage,
  generateQRCode,
  notifyEvalOpen,
  notifyReminder,
  notifyAllComplete,
  notifySystemClosed,
  notifyAdminResults,
  notifyPublishResults,
};
