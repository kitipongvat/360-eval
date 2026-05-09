# 🚀 คู่มือ Deploy ระบบประเมิน 360°

## ขั้นตอนที่ 1: สร้าง GitHub Repository

1. ไปที่ github.com → New Repository
2. ชื่อ: `360-eval`
3. Upload โฟลเดอร์ทั้งหมดนี้ขึ้น GitHub

## ขั้นตอนที่ 2: Deploy บน Render (ฟรี)

1. ไปที่ render.com → Sign up (ใช้ GitHub)
2. New → Web Service → Connect to GitHub repo `360-eval`
3. Settings:
   - **Build Command:** `npm run setup`
   - **Start Command:** `npm start`
4. สร้าง PostgreSQL Database (New → PostgreSQL → Free)
5. ตั้งค่า Environment Variables:

| Key | Value |
|-----|-------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Token จาก LINE Developers Console |
| `LINE_ADMIN_USER_ID` | LINE User ID ของ Admin |
| `APP_URL` | https://your-app-name.onrender.com |
| `ADMIN_PIN` | PIN สำหรับ Admin (ตั้งเอง) |
| `LINE_GROUP_ID` | C90e76bf018150c361e4558f2b260b683 |

## ขั้นตอนที่ 3: ตั้งค่า cron-job.org (Keep-alive)

1. ไปที่ cron-job.org → Sign up → Create Cronjob
2. URL: `https://your-app.onrender.com/ping`
3. Schedule: ทุก 10 นาที
4. **เปิดเฉพาะวันที่มีการประเมิน** หรือจะเปิดตลอดก็ได้

## ขั้นตอนที่ 4: หา LINE Admin User ID

1. เพิ่ม LINE Bot เป็นเพื่อน
2. ส่งข้อความใดก็ได้ไปหา Bot
3. ดู User ID ใน LINE Webhook หรือใช้ LINE Developers → Users

## ขั้นตอนที่ 5: สร้างรอบประเมินแรก

1. เปิด https://your-app.onrender.com
2. กด Admin (ปุ่มเล็กด้านล่าง Login)
3. กรอก Admin PIN
4. ไปที่ "รอบประเมิน" → สร้างรอบใหม่
5. ตั้งชื่อรอบ + วันเวลาเปิด/ปิด
6. กด "เปิดการประเมิน" เมื่อถึงเวลา

## URL สำคัญ

- **หน้าหลัก (พนักงาน):** https://your-app.onrender.com/
- **Admin Dashboard:** https://your-app.onrender.com/admin
- **Health Check:** https://your-app.onrender.com/ping

## หมายเหตุ Render Free Tier

- Server หลับหลัง 15 นาทีไม่มี traffic
- ใช้ cron-job.org ping /ping ทุก 10 นาทีในวันประเมิน
- หรืออัปเกรดเป็น Starter $7/เดือน เพื่อไม่ให้หลับ
