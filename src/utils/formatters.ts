import { ModifyJobItem, CalendarEventItem, CalendarMilestoneType } from '../types';

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const THAI_DAYS_FULL = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

export const getCurrentDateFormatted = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthFormatted = (): string => {
  const now = new Date();
  const monthName = THAI_MONTHS[now.getMonth()];
  const year = now.getFullYear();
  return `${monthName} ${year}`;
};

export const getCurrentTimeFormatted = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const generateJobId = (existingCount = 0): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(existingCount + 1).padStart(4, '0');
  return `MOD-${year}${month}-${seq}`;
};

export const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const cleanDate = dateStr.trim().split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const formatThaiFullDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dayName = THAI_DAYS_FULL[d.getDay()];
    const day = d.getDate();
    const monthName = THAI_MONTHS[d.getMonth()];
    const thaiYear = d.getFullYear() + 543;
    return `${dayName}ที่ ${day} ${monthName} พ.ศ. ${thaiYear}`;
  } catch {
    return dateStr;
  }
};

export const formatThaiMonthYear = (year: number, monthIndex: number): string => {
  const thaiMonth = THAI_MONTHS[monthIndex];
  const thaiYear = year + 543;
  return `${thaiMonth} ${thaiYear} (${year})`;
};

// Normalize any date string to YYYY-MM-DD
export const normalizeToISODate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  // Handle DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

// Extract all scheduled milestone events from jobs
export const extractJobCalendarEvents = (
  jobs: ModifyJobItem[],
  milestoneFilter: CalendarMilestoneType = 'all',
  statusFilter = 'ALL'
): CalendarEventItem[] => {
  const events: CalendarEventItem[] = [];

  jobs.forEach((job) => {
    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'IN_PROGRESS' && job.finishStatus !== 'IN_PROGRESS') return;
      if (statusFilter === 'FINISH' && job.finishStatus !== 'FINISH') return;
      if ((statusFilter === 'COMPLETE' || statusFilter === 'PASS') && job.inspectionResult !== 'COMPLETE' && job.inspectionResult !== 'PASS') return;
      if ((statusFilter === 'EDIT' || statusFilter === 'REJECT') && job.inspectionResult !== 'EDIT' && job.inspectionResult !== 'REJECT') return;
      if (statusFilter === 'WAITING' && job.inspectionResult !== 'WAITING' && job.inspectionResult !== 'PENDING' && Boolean(job.inspectionResult)) return;
    }

    // 1. Request Date
    if (job.requestDate && (milestoneFilter === 'all' || milestoneFilter === 'request')) {
      const iso = normalizeToISODate(job.requestDate);
      if (iso) {
        events.push({
          id: `${job.id}-req-${iso}`,
          jobId: job.id,
          job,
          date: iso,
          time: job.requestTime || '09:00',
          title: `📝 ขอเปิดงาน Modify: ${job.customer}`,
          type: 'request',
          typeLabel: 'วันที่ Request',
          customer: job.customer,
          saleSoNo: job.saleSoNo,
          status: job.finishStatus,
          qcResult: job.inspectionResult,
          colorClass: {
            bg: 'bg-blue-50 hover:bg-blue-100/90 text-blue-900',
            text: 'text-blue-800',
            border: 'border-blue-300',
            badge: 'bg-blue-600 text-white',
            dot: 'bg-blue-500',
          },
        });
      }
    }

    // 2. Engineer Handover Date
    if (
      job.engineerHandoverDate &&
      (milestoneFilter === 'all' || milestoneFilter === 'handover')
    ) {
      const iso = normalizeToISODate(job.engineerHandoverDate);
      if (iso) {
        events.push({
          id: `${job.id}-handover-${iso}`,
          jobId: job.id,
          job,
          date: iso,
          title: `🛠️ ส่งมอบงานให้ Engineer: ${job.customer}`,
          type: 'handover',
          typeLabel: 'ส่งมอบ Engineer',
          customer: job.customer,
          saleSoNo: job.saleSoNo,
          status: job.finishStatus,
          qcResult: job.inspectionResult,
          colorClass: {
            bg: 'bg-indigo-50 hover:bg-indigo-100/90 text-indigo-900',
            text: 'text-indigo-800',
            border: 'border-indigo-300',
            badge: 'bg-indigo-600 text-white',
            dot: 'bg-indigo-500',
          },
        });
      }
    }

    // 3. Estimated Return Date
    if (
      job.estimatedReturnDate &&
      (milestoneFilter === 'all' || milestoneFilter === 'estimatedReturn')
    ) {
      const iso = normalizeToISODate(job.estimatedReturnDate);
      if (iso) {
        events.push({
          id: `${job.id}-est-return-${iso}`,
          jobId: job.id,
          job,
          date: iso,
          title: `⏳ ประมาณการส่งคืนชิ้นงาน: ${job.customer}`,
          type: 'estimatedReturn',
          typeLabel: 'ประมาณการส่งคืน',
          customer: job.customer,
          saleSoNo: job.saleSoNo,
          status: job.finishStatus,
          qcResult: job.inspectionResult,
          colorClass: {
            bg: 'bg-amber-50 hover:bg-amber-100/90 text-amber-900',
            text: 'text-amber-800',
            border: 'border-amber-300',
            badge: 'bg-amber-600 text-white',
            dot: 'bg-amber-500',
          },
        });
      }
    }

    // 4. Inspection Date
    if (
      job.inspectionDate &&
      (milestoneFilter === 'all' || milestoneFilter === 'inspection')
    ) {
      const iso = normalizeToISODate(job.inspectionDate);
      if (iso) {
        const isComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
        const isEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
        const displayLabel = isComplete ? 'COMPLETE' : isEdit ? 'EDIT' : (job.inspectionResult || 'WAITING');

        events.push({
          id: `${job.id}-inspect-${iso}`,
          jobId: job.id,
          job,
          date: iso,
          title: `🔍 ตรวจสอบ QC (${displayLabel}): ${job.customer}`,
          type: 'inspection',
          typeLabel: `ตรวจ QC: ${displayLabel}`,
          customer: job.customer,
          saleSoNo: job.saleSoNo,
          status: job.finishStatus,
          qcResult: displayLabel,
          colorClass: isComplete
            ? {
                bg: 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900',
                text: 'text-emerald-800',
                border: 'border-emerald-300',
                badge: 'bg-emerald-600 text-white',
                dot: 'bg-emerald-500',
              }
            : isEdit
            ? {
                bg: 'bg-rose-50 hover:bg-rose-100/90 text-rose-900',
                text: 'text-rose-800',
                border: 'border-rose-300',
                badge: 'bg-rose-600 text-white',
                dot: 'bg-rose-500',
              }
            : {
                bg: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
                text: 'text-slate-700',
                border: 'border-slate-300',
                badge: 'bg-slate-600 text-white',
                dot: 'bg-slate-400',
              },
        });
      }
    }

    // 5. Shipment Date
    if (
      job.shipmentDate &&
      (milestoneFilter === 'all' || milestoneFilter === 'shipment')
    ) {
      const iso = normalizeToISODate(job.shipmentDate);
      if (iso) {
        events.push({
          id: `${job.id}-shipment-${iso}`,
          jobId: job.id,
          job,
          date: iso,
          title: `🚚 กำหนดส่งสินค้า (Shipment): ${job.customer}`,
          type: 'shipment',
          typeLabel: 'วันส่งมอบสินค้า',
          customer: job.customer,
          saleSoNo: job.saleSoNo,
          status: job.finishStatus,
          qcResult: job.inspectionResult,
          colorClass: {
            bg: 'bg-purple-50 hover:bg-purple-100/90 text-purple-900',
            text: 'text-purple-800',
            border: 'border-purple-300',
            badge: 'bg-purple-600 text-white',
            dot: 'bg-purple-500',
          },
        });
      }
    }
  });

  return events;
};

// Generate Google Calendar Web Add Event link
export const generateGoogleCalendarLink = (
  job: ModifyJobItem,
  eventType: 'request' | 'handover' | 'estimatedReturn' | 'shipment' = 'estimatedReturn'
): string => {
  let targetDate = job.estimatedReturnDate || job.requestDate || getCurrentDateFormatted();
  let titlePrefix = 'ส่งคืนงาน Modify';

  if (eventType === 'handover') {
    targetDate = job.engineerHandoverDate || targetDate;
    titlePrefix = 'ส่งมอบงาน Engineer (Modify)';
  } else if (eventType === 'shipment') {
    targetDate = job.shipmentDate || targetDate;
    titlePrefix = 'ส่งสินค้าให้ลูกค้า (Modify)';
  } else if (eventType === 'request') {
    targetDate = job.requestDate || targetDate;
    titlePrefix = 'คำของาน Modify';
  }

  const iso = normalizeToISODate(targetDate);
  const dateFormatted = iso.replace(/-/g, '');

  const startIso = `${dateFormatted}T090000`;
  const endIso = `${dateFormatted}T180000`;

  const title = encodeURIComponent(`[${job.id}] ${titlePrefix} - ${job.customer}`);
  const details = encodeURIComponent(
    `รหัสงาน: ${job.id}\nลูกค้า: ${job.customer}\nSO No.: ${job.saleSoNo || '-'}\nโครงการ: ${
      job.project || '-'
    }\nผู้ขอ: ${job.requester}\nSale: ${job.sale}\nจำนวน: ${job.quantity}\nสถานะงาน: ${
      job.finishStatus
    }\nผลตรวจ QC: ${job.inspectionResult || 'WAITING'}\n\nรายละเอียด Modify:\n${
      job.modifyDetails || '-'
    }`
  );
  const location = encodeURIComponent('โรงงาน / แผนกวิศวกรรม (Engineer & QC Department)');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
};

// Export ICS file for any calendar client (Apple Calendar, Google Calendar, Outlook)
export const exportIcsCalendar = (jobs: ModifyJobItem[]): void => {
  const events = extractJobCalendarEvents(jobs, 'all', 'ALL');
  if (events.length === 0) {
    alert('ไม่มีข้อมูลกำหนดการวันที่ในระบบสำหรับสร้างปฏิทิน');
    return;
  }

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Modify Job Management System//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ตารางงาน Modify',
    'X-WR-TIMEZONE:Asia/Bangkok',
  ];

  events.forEach((ev) => {
    const cleanDate = ev.date.replace(/-/g, '');
    const createdDate = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${ev.id}@modify-job-app`);
    icsContent.push(`DTSTAMP:${createdDate}`);
    icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`);
    icsContent.push(`DTEND;VALUE=DATE:${cleanDate}`);
    icsContent.push(`SUMMARY:${ev.title.replace(/[\n,]/g, ' ')}`);
    icsContent.push(
      `DESCRIPTION:รหัสงาน: ${ev.jobId}\\nลูกค้า: ${ev.customer}\\nประเภท: ${ev.typeLabel}\\nสถานะ: ${ev.status}\\nQC: ${ev.qcResult || 'WAITING'}`
    );
    icsContent.push('STATUS:CONFIRMED');
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modify_jobs_calendar_${getCurrentDateFormatted()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export interface QuantityWorkingDaysRule {
  min: number;
  max: number;
  days: number;
  label: string;
}

// เกณฑ์งาน Modify ทั่วไป
export const GENERAL_WORKING_DAYS_RULES: QuantityWorkingDaysRule[] = [
  { min: 1, max: 10, days: 1, label: '1 - 10 ชิ้น: 1 วันทำการ' },
  { min: 11, max: 30, days: 2, label: '11 - 30 ชิ้น: 2 วันทำการ' },
  { min: 31, max: 50, days: 3, label: '31 - 50 ชิ้น: 3 วันทำการ' },
  { min: 51, max: 70, days: 4, label: '51 - 70 ชิ้น: 4 วันทำการ' },
  { min: 71, max: 80, days: 5, label: '71 - 80 ชิ้น: 5 วันทำการ' },
  { min: 81, max: 150, days: 6, label: '81 - 150 ชิ้น: 6 วันทำการ' },
  { min: 151, max: 200, days: 8, label: '151 - 200 ชิ้น: 8 วันทำการ' },
  { min: 201, max: 300, days: 10, label: '201 - 300 ชิ้น: 10 วันทำการ' },
];

// เกณฑ์กรณีงานทำสี (Painting / Coating)
// 1-10 ชิ้น 3 วันทำการ, 11-20 ชิ้น 4 วันทำการ, 21-50 ชิ้น 7 วันทำการ, 51-100 ชิ้น 10 วันทำการ, 101-300 ชิ้น 15 วันทำการ
export const PAINTING_WORKING_DAYS_RULES: QuantityWorkingDaysRule[] = [
  { min: 1, max: 10, days: 3, label: '1 - 10 ชิ้น: 3 วันทำการ' },
  { min: 11, max: 20, days: 4, label: '11 - 20 ชิ้น: 4 วันทำการ' },
  { min: 21, max: 50, days: 7, label: '21 - 50 ชิ้น: 7 วันทำการ' },
  { min: 51, max: 100, days: 10, label: '51 - 100 ชิ้น: 10 วันทำการ' },
  { min: 101, max: 300, days: 15, label: '101 - 300 ชิ้น: 15 วันทำการ' },
];

export const QUANTITY_WORKING_DAYS_RULES = GENERAL_WORKING_DAYS_RULES;

/**
 * ตรวจจับว่าเป็นงานทำสีหรือไม่จากข้อความ (Auto-detection for painting jobs)
 */
export const detectIsPaintingJob = (text?: string): boolean => {
  if (!text) return false;
  const lower = text.toLowerCase();
  const paintingKeywords = [
    'ทำสี',
    'พ่นสี',
    'ชุบสี',
    'อบสี',
    'ทาสี',
    'เพ้นท์',
    'เพนต์',
    'ย้อมสี',
    'ลงสี',
    'paint',
    'painting',
    'powder coat',
    'powdercoat',
    'powder-coat',
    'coating',
    'anodize',
    'anodizing',
    'color',
  ];
  return paintingKeywords.some((kw) => lower.includes(kw));
};

/**
 * คำนวณจำนวนวันทำการที่ต้องใช้จากจำนวนชิ้นงาน (Quantity) ตามประเภทงาน
 */
export const getWorkingDaysForQuantity = (
  qtyInput: number | string,
  workType: 'GENERAL' | 'PAINTING' | string = 'GENERAL'
): number => {
  const qty = typeof qtyInput === 'string' ? parseInt(qtyInput, 10) : qtyInput;
  if (isNaN(qty) || qty <= 0) {
    return workType === 'PAINTING' ? 3 : 1;
  }

  // กรณีกรอบเกณฑ์งานทำสี (Painting Rules)
  if (workType === 'PAINTING') {
    if (qty >= 1 && qty <= 10) return 3;
    if (qty >= 11 && qty <= 20) return 4;
    if (qty >= 21 && qty <= 50) return 7;
    if (qty >= 51 && qty <= 100) return 10;
    if (qty >= 101 && qty <= 300) return 15;
    // มากกว่า 300 ชิ้น: 15 วัน + เพิ่ม 1 วันทำการต่อทุก 20 ชิ้น
    return 15 + Math.ceil((qty - 300) / 20);
  }

  // กรณีกรอบเกณฑ์งาน Modify ทั่วไป (General Modify Rules)
  if (qty >= 1 && qty <= 10) return 1;
  if (qty >= 11 && qty <= 30) return 2;
  if (qty >= 31 && qty <= 50) return 3;
  if (qty >= 51 && qty <= 70) return 4;
  if (qty >= 71 && qty <= 80) return 5;
  if (qty >= 81 && qty <= 150) return 6;
  if (qty >= 151 && qty <= 200) return 8;
  if (qty >= 201 && qty <= 300) return 10;

  // มากกว่า 300 ชิ้น: ทุกๆ 30 ชิ้นเพิ่ม 1 วันทำการ
  return 10 + Math.ceil((qty - 300) / 30);
};

/**
 * คำนวณวันที่ส่งมอบคืนโดยบวกวันทำการ (ข้ามวันเสาร์-อาทิตย์ หรือข้ามเฉพาะวันอาทิตย์)
 */
export const addWorkingDays = (
  startDateStr: string,
  workingDays: number,
  includeSaturday = false
): string => {
  if (!startDateStr) return '';
  const iso = normalizeToISODate(startDateStr);
  if (!iso) return '';

  const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10));
  // create date object (month is 0-indexed)
  const date = new Date(y, m - 1, d);

  if (isNaN(date.getTime()) || workingDays <= 0) return iso;

  let added = 0;
  while (added < workingDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = includeSaturday ? dayOfWeek === 0 : dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend) {
      added++;
    }
  }

  const finalYear = date.getFullYear();
  const finalMonth = String(date.getMonth() + 1).padStart(2, '0');
  const finalDay = String(date.getDate()).padStart(2, '0');
  return `${finalYear}-${finalMonth}-${finalDay}`;
};

/**
 * คำนวณวันประมาณการเสร็จสมบูรณ์พร้อมสรุปคำอธิบาย
 */
export const calculateEstimatedCompletion = (
  startDateStr: string,
  qtyInput: number | string,
  workType: 'GENERAL' | 'PAINTING' | string = 'GENERAL',
  includeSaturday = false
): {
  workingDays: number;
  calculatedDate: string;
  ruleLabel: string;
  isPainting: boolean;
} => {
  const isPainting = workType === 'PAINTING';
  const workingDays = getWorkingDaysForQuantity(qtyInput, workType);
  const calculatedDate = addWorkingDays(startDateStr, workingDays, includeSaturday);

  const rules = isPainting ? PAINTING_WORKING_DAYS_RULES : GENERAL_WORKING_DAYS_RULES;
  const qty = typeof qtyInput === 'string' ? parseInt(qtyInput, 10) : qtyInput;
  let ruleLabel = `${workingDays} วันทำการ (${isPainting ? 'งานทำสี' : 'ทั่วไป'})`;

  if (!isNaN(qty)) {
    const matched = rules.find((r) => qty >= r.min && qty <= r.max);
    if (matched) {
      ruleLabel = matched.label;
    } else if (qty > 300) {
      ruleLabel = `> 300 ชิ้น: ${workingDays} วันทำการ`;
    }
  }

  return {
    workingDays,
    calculatedDate,
    ruleLabel,
    isPainting,
  };
};

/**
 * คำนวณจำนวนวันทำการที่ผ่านไปแล้วนับจากวันที่เริ่มทำงาน (Start Date)
 */
export const calculateWorkingDaysElapsed = (
  startDateStr: string,
  endDateStr?: string,
  includeSaturday = false
): number => {
  if (!startDateStr) return 0;
  const startISO = normalizeToISODate(startDateStr);
  const endISO = endDateStr ? normalizeToISODate(endDateStr) : getCurrentDateFormatted();
  if (!startISO || !endISO) return 0;

  const [sy, sm, sd] = startISO.split('-').map((v) => parseInt(v, 10));
  const [ey, em, ed] = endISO.split('-').map((v) => parseInt(v, 10));

  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    const isWeekend = includeSaturday ? day === 0 : day === 0 || day === 6;
    if (!isWeekend) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

/**
 * ดึงข้อมูลสถานะความคืบหน้าของงานโดยอ้างอิงจากวันที่เริ่มทำงาน
 */
export const getJobProgressDetails = (
  job: ModifyJobItem
): {
  isStarted: boolean;
  startDate: string;
  isFinished: boolean;
  isInProgress: boolean;
  elapsedWorkingDays: number;
  totalWorkingDaysNeeded: number;
  isOverdue: boolean;
  progressPercent: number;
  statusBadgeText: string;
  statusDetailText: string;
} => {
  const isFinished = job.finishStatus === 'FINISH';
  const isStarted = Boolean(job.engineerHandoverDate);
  const startDate = job.engineerHandoverDate || '';
  const isInProgress =
    job.finishStatus === 'IN_PROGRESS' ||
    (isStarted && !isFinished && job.finishStatus !== 'CANCELLED');

  const totalWorkingDaysNeeded = getWorkingDaysForQuantity(
    job.quantity,
    job.workType || (detectIsPaintingJob(job.modifyDetails) ? 'PAINTING' : 'GENERAL')
  );

  let elapsedWorkingDays = 0;
  let isOverdue = false;
  let progressPercent = 0;

  if (isStarted) {
    elapsedWorkingDays = calculateWorkingDaysElapsed(
      startDate,
      isFinished && job.inspectionDate ? job.inspectionDate : undefined
    );

    if (totalWorkingDaysNeeded > 0) {
      progressPercent = Math.min(100, Math.round((elapsedWorkingDays / totalWorkingDaysNeeded) * 100));
    }

    if (!isFinished && job.estimatedReturnDate) {
      const estISO = normalizeToISODate(job.estimatedReturnDate);
      const todayISO = getCurrentDateFormatted();
      if (estISO && todayISO > estISO) {
        isOverdue = true;
      }
    }
  }

  let statusBadgeText = 'รอดำเนินการ (Pending)';
  let statusDetailText = 'ยังไม่ได้ระบุวันเริ่มงาน';

  if (isFinished) {
    statusBadgeText = 'เสร็จสมบูรณ์ (Finish)';
    statusDetailText = `เสร็จสิ้นแล้ว${job.inspectionDate ? ` (${formatDateDisplay(job.inspectionDate)})` : ''}`;
  } else if (isInProgress) {
    if (isStarted) {
      statusBadgeText = 'กำลังดำเนินการ (In Progress)';
      statusDetailText = `เริ่มปฏิบัติงานเมื่อ ${formatDateDisplay(startDate)} (ทำมาแล้ว ${elapsedWorkingDays} วันทำการ)`;
    } else {
      statusBadgeText = 'กำลังดำเนินการ';
      statusDetailText = 'รอกำหนดวันเริ่มงานของ Engineer';
    }
  }

  return {
    isStarted,
    startDate,
    isFinished,
    isInProgress,
    elapsedWorkingDays,
    totalWorkingDaysNeeded,
    isOverdue,
    progressPercent,
    statusBadgeText,
    statusDetailText,
  };
};

