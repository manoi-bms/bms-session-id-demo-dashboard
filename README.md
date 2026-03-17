# BMS Session ID Demo Dashboard

แดชบอร์ด KPI สำหรับระบบ HOSxP ที่ใช้ BMS Session ID ในการเชื่อมต่อและดึงข้อมูลจากฐานข้อมูลโรงพยาบาล รองรับทั้ง MySQL และ PostgreSQL

## ภาพรวม

ระบบนี้เป็น Single-Page Application ที่แสดงข้อมูลสถิติโรงพยาบาลแบบ real-time ผ่าน BMS Session API โดยรองรับการตรวจจับประเภทฐานข้อมูลอัตโนมัติ และสร้าง SQL ที่เหมาะสมกับแต่ละฐานข้อมูล

### หน้าจอหลัก

| หน้า | รายละเอียด |
|------|-----------|
| **ภาพรวม** | KPI cards (OPD/IPD/ER), สถิติรวม, แพทย์ยอดนิยม, การเข้ารับบริการล่าสุด, ปริมาณงานแผนก, ข้อมูลเซสชัน |
| **แนวโน้ม** | แนวโน้มรายวัน (Area), รายสัปดาห์ (Radar), รายเดือน (Line), กลุ่มโรคที่พบบ่อย, ค่ายา, สถิติการเสียชีวิต |
| **แผนก** | วิเคราะห์แผนก drill-down, ปริมาณงานแพทย์, แนวโน้มรายวันของแผนก |
| **ข้อมูลประชากร** | การกระจายเพศ (Donut), กลุ่มอายุ (Bar), สิทธิ์การรักษา (Horizontal Bar) |

### คุณสมบัติ

- เชื่อมต่อผ่าน BMS Session ID (URL parameter, cookie, หรือ manual input)
- ตรวจจับ MySQL/PostgreSQL อัตโนมัติด้วย `SELECT VERSION()`
- สร้าง SQL ที่รองรับทั้งสองฐานข้อมูลผ่าน Query Builder
- UI ภาษาไทยทั้งหมด รองรับฟอนต์ Sarabun
- Responsive design (desktop + tablet)
- Loading states, error handling, empty states ทุกจุด
- Dark/light theme support

## เทคโนโลยี

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.x (strict mode) |
| Build | Vite 6 |
| UI | shadcn/ui + Tailwind CSS v4 |
| Charts | Recharts 3.x (Area, Bar, Line, Radar, Pie) |
| Testing | Vitest 4.x + React Testing Library + MSW 2.x |
| Font | Google Sarabun |
| Deploy | Docker (nginx:alpine) |

## การติดตั้ง

### วิธีที่ 1: Docker (แนะนำ)

```bash
docker compose up -d
```

เข้าใช้งาน: `http://localhost:3080/?bms-session-id=YOUR_SESSION_ID`

### วิธีที่ 2: Development

```bash
# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev
```

เข้าใช้งาน: `http://localhost:5173/?bms-session-id=YOUR_SESSION_ID`

## Session ID สำหรับทดสอบ

BMS Session ID จะได้รับจากระบบ HOSxP Dashboard โดยอัตโนมัติ เมื่อผู้ใช้เปิดลิงก์จากเมนู Dashboard ในโปรแกรม HOSxP ระบบจะส่ง `bms-session-id` มาใน URL parameter

### วิธีรับ Session ID

1. เปิดโปรแกรม **HOSxP** บนเครื่องที่มี BMS API Server ทำงานอยู่
2. ไปที่เมนู **Dashboard** ในระบบ HOSxP
3. ระบบจะสร้าง URL พร้อม session ID ในรูปแบบ:
   ```
   https://your-dashboard.com/?bms-session-id=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   ```
4. Session ID จะถูกสร้างใหม่ทุกครั้งที่เปิดใช้งาน และมีอายุตามที่ BMS API Server กำหนด (ค่าเริ่มต้น 30 วัน)

### การใช้งานกับ Demo Dashboard

คัดลอก Session ID จาก URL ของ HOSxP Dashboard แล้วนำมาใช้กับ Demo Dashboard:

```
http://localhost:3080/?bms-session-id=YOUR_SESSION_ID_FROM_HOSXP
```

> **หมายเหตุ**: Session ID เป็นค่าเฉพาะของแต่ละเครื่อง/ผู้ใช้ ไม่สามารถใช้ข้ามเครื่องได้ และจะหมดอายุเมื่อ BMS API Server รีสตาร์ท

## การเชื่อมต่อ BMS Session

ระบบรับ Session ID ได้ 3 ช่องทาง:

1. **URL Parameter**: `?bms-session-id=GUID` — ระบบจะดึง session, เก็บ cookie, และลบออกจาก URL อัตโนมัติ
2. **Cookie**: เก็บ session ID ไว้ 7 วัน เมื่อเปิดใช้งานครั้งถัดไปจะเชื่อมต่ออัตโนมัติ
3. **Manual Input**: ป้อน session ID ผ่านหน้า login

### ขั้นตอนการเชื่อมต่อ

```
URL/Cookie/Input → PasteJSON API → Session Data → SELECT VERSION() → Database Type → Dashboard
```

1. ดึงข้อมูล session จาก `https://hosxp.net/phapi/PasteJSON?Action=GET&code=SESSION_ID`
2. ตรวจจับประเภทฐานข้อมูลด้วย `SELECT VERSION()`
3. สร้าง SQL ที่เหมาะสมผ่าน Query Builder
4. แสดงผลข้อมูล KPI บนแดชบอร์ด

## ตารางฐานข้อมูลที่ใช้

| ตาราง | ข้อมูล | ใช้ในหน้า |
|-------|--------|----------|
| `ovst` | การเข้ารับบริการผู้ป่วยนอก | ทุกหน้า |
| `ipt` | ผู้ป่วยใน | ภาพรวม |
| `er_regist` | ห้องฉุกเฉิน | ภาพรวม |
| `kskdepartment` | ข้อมูลแผนก | ภาพรวม, แผนก |
| `doctor` | ข้อมูลแพทย์ | ภาพรวม, แผนก |
| `patient` | ข้อมูลผู้ป่วย | ข้อมูลประชากร |
| `ovst_patient_record` | ข้อมูลผู้ป่วยต่อ visit (fallback) | ข้อมูลประชากร |
| `pttype` | สิทธิ์การรักษา | ข้อมูลประชากร |
| `ovstdiag` + `icd101` | การวินิจฉัยโรค (ICD10) | แนวโน้ม |
| `opitemrece` + `drugitems` | ยาและค่าใช้จ่าย | แนวโน้ม |
| `death` | สถิติการเสียชีวิต | แนวโน้ม |
| `opdscreen` | สัญญาณชีพ | ภาพรวม |

## คำสั่งสำหรับพัฒนา

```bash
# Development server
npm run dev

# Build สำหรับ production
npm run build

# รัน test ทั้งหมด
npm test

# รัน test แยกตามประเภท
npm run test:unit          # Unit tests
npm run test:component     # Component tests
npm run test:integration   # Integration tests
npm run test:api           # API contract tests

# Coverage report
npm run test:coverage

# Lint
npm run lint
```

## โครงสร้างโปรเจค

```
src/
├── services/
│   ├── bmsSession.ts        # เชื่อมต่อ session, เรียก API
│   ├── queryBuilder.ts      # สร้าง SQL สำหรับ MySQL/PostgreSQL
│   └── kpiService.ts        # ดึงข้อมูล KPI ทุกหน้า
├── hooks/
│   ├── useBmsSession.ts     # จัดการ session state
│   └── useQuery.ts          # จัดการ loading/error/data
├── contexts/
│   └── BmsSessionContext.tsx # แชร์ session state ทั่วแอป
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Header, Layout
│   ├── dashboard/           # KpiCard, Table, DatePicker
│   ├── charts/              # Recharts components
│   └── session/             # Login, Expired, Validator
├── pages/                   # 4 หน้าหลัก
├── types/                   # TypeScript interfaces
└── utils/                   # Cookie, date formatting

tests/
├── unit/                    # 5 test files
├── component/               # 2 test files
├── integration/             # (planned)
└── api/                     # 3 test files (MSW)
```

## รองรับฐานข้อมูล

Query Builder จะสร้าง SQL ที่เหมาะสมตามประเภทฐานข้อมูลอัตโนมัติ:

| ฟังก์ชัน | MySQL | PostgreSQL |
|----------|-------|------------|
| วันปัจจุบัน | `CURDATE()` | `CURRENT_DATE` |
| จัดรูปวันที่ | `DATE_FORMAT(col, '%Y-%m')` | `TO_CHAR(col, 'YYYY-MM')` |
| ลบวัน | `DATE_SUB(CURDATE(), INTERVAL 30 DAY)` | `CURRENT_DATE - INTERVAL '30 days'` |
| คำนวณอายุ | `TIMESTAMPDIFF(YEAR, birthday, CURDATE())` | `EXTRACT(YEAR FROM AGE(birthday))` |
| ดึงชั่วโมง | `HOUR(vsttime)` | `EXTRACT(HOUR FROM vsttime)::int` |
| แปลงเป็น text | `CAST(col AS CHAR)` | `col::text` |

## API Reference

### BMS Session API

- **ดึง session**: `GET https://hosxp.net/phapi/PasteJSON?Action=GET&code=SESSION_ID`
- **Query ข้อมูล**: `POST {bms_url}/api/sql` พร้อม `Authorization: Bearer {token}`
- **SQL ที่รองรับ**: SELECT, DESCRIBE, EXPLAIN, SHOW, WITH (CTE)
- **ตารางที่ถูกบล็อก**: opduser, opdconfig, sys_var, user_var, user_jwt

ดูรายละเอียดเพิ่มเติมใน [docs/BMS-SESSION-FOR-DEV.md](docs/BMS-SESSION-FOR-DEV.md)

## License

Private — BMS (Bangkok Medical Software)
