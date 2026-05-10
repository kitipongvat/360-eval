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

// 1) Open evaluation — send to group with link (1 message)
async function notifyEvalOpen(roundName, appUrl) {
  const link = `${appUrl}/`;
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const msg = {
    type: 'text',
    text:
      `🔔 เปิดการประเมิน 360° แล้ววันนี้!\n` +
      `📋 รอบ: ${roundName}\n` +
      `📅 ${today}\n` +
      `⏰ เวลา 08:00 – 21:00 น.\n\n` +
      `👉 คลิกลิงก์เพื่อเข้าประเมิน:\n${link}\n\n` +
      `(ประเมินเพื่อนร่วมงานทุกคน 20 คน 8 หัวข้อ)`,
  };

  await sendGroupMessage(msg);
}

// 2) Reminder — who hasn't evaluated yet
async function notifyReminder(pendingNames, hoursLeft) {
  if (!pendingNames || pendingNames.length === 0) return;

  const nameList = pendingNames
    .map((n, i) => `${i + 1}. ${n}`)
    .join('\n');

  const msg = {
    type: 'text',
    text:
      `⏰ แจ้งเตือน: เหลือเวลาอีก ${hoursLeft} ชั่วโมง!\n\n` +
      `📋 รายชื่อที่ยังไม่ได้ประเมิน (${pendingNames.length} คน):\n` +
      `${nameList}\n\n` +
      `กรุณาประเมินก่อน 21:00 น. นะครับ/ค่ะ 🙏`,
  };

  await sendGroupMessage(msg);
}

// 3) All done — thank you
async function notifyAllComplete(roundName) {
  const msg = {
    type: 'text',
    text:
      `✅ ขอบคุณทุกคนมากนะครับ!\n` +
      `🎉 การประเมิน "${roundName}" สมบูรณ์แล้ว!\n` +
      `ทุกคนส่งผลการประเมินครบถ้วนแล้ว ระบบกำลังประมวลผลคะแนน...`,
  };
  await sendGroupMessage(msg);
}

// 4) System closed — not all submitted
async function notifySystemClosed(roundName, submittedCount, totalCount) {
  const msg = {
    type: 'text',
    text:
      `🔒 ปิดระบบประเมิน "${roundName}" แล้ว\n` +
      `📊 ส่งผลแล้ว: ${submittedCount}/${totalCount} คน\n` +
      `ระบบกำลังประมวลผลคะแนนจากข้อมูลที่ได้รับ...`,
  };
  await sendGroupMessage(msg);
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

// 6) Publish results to group (1 message only to save quota)
async function notifyPublishResults(roundName, rawText, normText) {
  const msg = {
    type: 'text',
    text:
      `🏆 ผลการประเมิน 360° รอบ: ${roundName}\n\n` +
      `📊 คะแนนดิบ\n${rawText}\n\n` +
      `🎯 คะแนนอิงกลุ่ม\n${normText}`,
  };
  await sendGroupMessage(msg);
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
