import { ModifyJobItem, CalendarEventItem, CalendarMilestoneType, JobUrgencyLevel } from '../types';

export const URGENCY_OPTIONS: { value: JobUrgencyLevel; label: string; desc: string; badgeClass: string; icon: string }[] = [
  {
    value: 'NORMAL',
    label: 'งานปกติ',
    desc: 'ระยะเวลาผลิตและตรวจสอบตามเกณฑ์มาตรฐาน',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: '☕',
  },
  {
    value: 'URGENT',
    label: 'งานด่วน',
    desc: 'เร่งดำเนินการก่อนกำหนด เร่งประสานงานช่างและ QC',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    icon: '⚡',
  },
  {
    value: 'VERY_URGENT',
    label: 'งานด่วนมาก',
    desc: 'งานด่วนพิเศษสูงสุด (Hot Rush) ต้องทำทันทีและติดตามใกล้ชิด',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold animate-pulse',
    icon: '🚨',
  },
];

export const parseUrgencyLevel = (input?: string): JobUrgencyLevel => {
  if (!input) return 'NORMAL';
  const str = String(input).trim().toUpperCase();
  if (str.includes('VERY_URGENT') || str.includes('ด่วนมาก') || str.includes('HOT') || str.includes('EMERGENCY')) {
    return 'VERY_URGENT';
  }
  if (str.includes('URGENT') || str.includes('ด่วน') || str.includes('RUSH') || str.includes('EXPRESS')) {
    return 'URGENT';
  }
  return 'NORMAL';
};

export const getUrgencyDisplay = (urgency?: string): { label: string; badgeClass: string; icon: string; level: JobUrgencyLevel } => {
  const level = parseUrgencyLevel(urgency);
  const found = URGENCY_OPTIONS.find((o) => o.value === level) || URGENCY_OPTIONS[0];
  return {
    label: found.label,
    badgeClass: found.badgeClass,
    icon: found.icon,
    level: found.value,
  };
};

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
  return `ECR-${year}${month}-${seq}`;
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

export interface WorkTypeOptionItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  icon: string;
  badgeClass: string;
  activeClass: string;
  description: string;
}

export const WORK_TYPE_OPTIONS: WorkTypeOptionItem[] = [
  {
    id: 'GENERAL',
    code: 'GENERAL',
    name: 'งาน Modify ทั่วไป',
    shortName: 'งาน Modify ทั่วไป',
    icon: '🔨',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    activeClass: 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/30',
    description: 'งานตัด กัด กลึง เจาะ ดัดแปลงชิ้นงานทั่วไป',
  },
  {
    id: 'PAINTING',
    code: 'PAINTING',
    name: 'งานทำสี (Painting)',
    shortName: 'งานทำสี',
    icon: '🎨',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    activeClass: 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-600/30',
    description: 'งานพ่นสี อบสี ชุบอโนไดซ์ ชุบผิวชิ้นงาน',
  },
];

/**
 * แยกรายการประเภทงานเป็น array ของ string IDs (เช่น ['GENERAL', 'PAINTING'])
 */
export const parseWorkTypes = (input?: string | string[] | null): string[] => {
  if (!input) return ['GENERAL'];
  if (Array.isArray(input)) {
    const valid = input
      .map((t) => {
        const up = String(t).toUpperCase();
        if (up.includes('PAINT') || up.includes('ทำสี') || up.includes('พ่นสี') || up.includes('ชุบ')) return 'PAINTING';
        return 'GENERAL';
      })
      .filter(Boolean);
    const unique = Array.from(new Set(valid));
    return unique.length > 0 ? unique : ['GENERAL'];
  }
  const str = String(input).toUpperCase();
  const found: string[] = [];
  if (str.includes('GENERAL') || str.includes('ทั่วไป') || str.includes('MODIFY') || str.includes('ซ่อม') || str.includes('ประกอบ')) {
    found.push('GENERAL');
  }
  if (str.includes('PAINTING') || str.includes('ทำสี') || str.includes('พ่นสี') || str.includes('ชุบ')) {
    found.push('PAINTING');
  }

  return found.length > 0 ? found : ['GENERAL'];
};

/**
 * ดึงข้อมูลการแสดงผลประเภทงานสำหรับ UI
 */
export const getWorkTypeDisplay = (input?: string | string[] | null) => {
  const types = parseWorkTypes(input);
  const matched = types.map((t) => {
    const opt = WORK_TYPE_OPTIONS.find((o) => o.id === t || o.code === t);
    if (opt) return opt;
    return {
      id: t,
      code: t,
      name: t,
      shortName: t,
      icon: '📌',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      activeClass: 'bg-slate-700 text-white',
      description: '',
    };
  });

  const hasPainting = types.includes('PAINTING') || matched.some((m) => m.id === 'PAINTING' || m.name.includes('ทำสี'));
  const label = matched.map((m) => `${m.icon} ${m.shortName}`).join(' + ');

  return {
    types,
    matched,
    hasPainting,
    label: label || '🔨 Modify ทั่วไป',
  };
};

/**
 * คำนวณจำนวนชิ้นรวมจากรายละเอียดงาน 10 บรรทัด (Sum of workDetailQuantities 1-10)
 */
export const calculateWorkDetailsTotalQuantity = (
  quantities?: (string | number)[] | null
): { totalQty: number; countWithQty: number; hasAnyQty: boolean } => {
  if (!quantities || !Array.isArray(quantities)) {
    return { totalQty: 0, countWithQty: 0, hasAnyQty: false };
  }

  let total = 0;
  let count = 0;

  quantities.forEach((q) => {
    if (q === undefined || q === null || q === '') return;
    const str = String(q).replace(/[^\d\.]/g, '').trim();
    const num = parseFloat(str);
    if (!isNaN(num) && num > 0) {
      total += num;
      count++;
    }
  });

  return {
    totalQty: Math.round(total * 100) / 100, // round to 2 decimals if needed
    countWithQty: count,
    hasAnyQty: count > 0,
  };
};

/**
 * ตรวจจับว่าเป็นงานทำสีหรือไม่จากข้อความ หรือประเภทงานที่เลือก
 */
export const detectIsPaintingJob = (input?: any): boolean => {
  if (!input) return false;
  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else if (typeof input === 'object' && input !== null) {
    if (input.workType === 'PAINTING' || (Array.isArray(input.workTypes) && input.workTypes.includes('PAINTING'))) {
      return true;
    }
    if (typeof input.workType === 'string' && (input.workType.includes('PAINTING') || input.workType.includes('ทำสี'))) {
      return true;
    }
    text = [
      input.modifyDetails,
      input.remarks,
      ...(Array.isArray(input.workDetails) ? input.workDetails : []),
    ]
      .filter(Boolean)
      .join(' ');
  } else {
    text = String(input);
  }

  if (!text || typeof text !== 'string') return false;
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
  workType: string | string[] = 'GENERAL'
): number => {
  const isPainting = Array.isArray(workType)
    ? workType.includes('PAINTING')
    : String(workType).includes('PAINTING') || String(workType).includes('ทำสี');

  const qty = typeof qtyInput === 'string' ? parseInt(qtyInput.replace(/[^\d]/g, ''), 10) : qtyInput;
  if (isNaN(qty) || qty <= 0) {
    return isPainting ? 3 : 1;
  }

  // กรณีกรอบเกณฑ์งานทำสี (Painting Rules)
  if (isPainting) {
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
  workType: string | string[] = 'GENERAL',
  includeSaturday = false
): {
  workingDays: number;
  calculatedDate: string;
  ruleLabel: string;
  isPainting: boolean;
} => {
  const isPainting = Array.isArray(workType)
    ? workType.includes('PAINTING')
    : String(workType).includes('PAINTING') || String(workType).includes('ทำสี');

  const workingDays = getWorkingDaysForQuantity(qtyInput, workType);
  const calculatedDate = addWorkingDays(startDateStr, workingDays, includeSaturday);

  const rules = isPainting ? PAINTING_WORKING_DAYS_RULES : GENERAL_WORKING_DAYS_RULES;
  const qty = typeof qtyInput === 'string' ? parseInt(qtyInput.replace(/[^\d]/g, ''), 10) : qtyInput;
  let ruleLabel = `${workingDays} วันทำการ (${isPainting ? 'มีงานทำสี' : 'ทั่วไป'})`;

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
 * รายชื่อช่างมาตรฐานเริ่มต้น
 */
export const DEFAULT_TECHNICIANS = [
  'ช่างสมพงษ์ (CNC)',
  'ช่างธนาวุฒิ (Weld/Sheet)',
  'ช่างเอกชัย (Milling)',
  'ช่างวิชัย (Lathe/กลึง)',
  'ช่างสมพร (Assembly)',
  'ช่างมานพ (QC/Modify)',
];

export interface TechnicianQueueInfo {
  name: string;
  activeJobsCount: number;
  activeJobs: ModifyJobItem[];
  isFree: boolean;
  latestFinishDate: string; // YYYY-MM-DD
  latestJob: ModifyJobItem | null;
  availableStartDate: string; // YYYY-MM-DD
  estimatedFinishDate: string; // YYYY-MM-DD
  estimatedWorkingDays: number;
}

export interface QueueEstimateResult {
  technicianName: string;
  isTechnicianFree: boolean;
  activeJobsCount: number;
  priorJob: ModifyJobItem | null;
  effectiveStartDate: string;
  workingDays: number;
  calculatedReturnDate: string;
  isQueuedAfterPriorJob: boolean;
  ruleLabel: string;
  queueExplanation: string;
}

/**
 * คำนวณวันประมาณการเสร็จโดยอิงจากคิวงานของช่าง (Queue-based estimation)
 * ถ้านายช่างมีงานค้างอยู่ -> ให้นับวันทำงานเริ่มจากวันที่งานก่อนหน้าเสร็จ
 * ถ้าเป็นช่างที่ไม่มีงานค้าง (ว่าง) -> ให้นับจากวันที่รับสินค้าทันที
 */
export const calculateQueueBasedEstimate = (
  technicianName: string | undefined | null,
  receiveDateStr: string | undefined | null,
  quantity: number | string,
  workTypes: string | string[] = 'GENERAL',
  existingJobs: ModifyJobItem[] = [],
  currentJobId?: string,
  includeSaturday = false
): QueueEstimateResult => {
  const cleanTech = (technicianName || '').trim();
  const baseReceiveDate = normalizeToISODate(receiveDateStr || getCurrentDateFormatted()) || getCurrentDateFormatted();
  const workingDays = getWorkingDaysForQuantity(quantity, workTypes);
  const isPainting = Array.isArray(workTypes)
    ? workTypes.includes('PAINTING')
    : String(workTypes).includes('PAINTING') || String(workTypes).includes('ทำสี');

  const rules = isPainting ? PAINTING_WORKING_DAYS_RULES : GENERAL_WORKING_DAYS_RULES;
  const qty = typeof quantity === 'string' ? parseInt(quantity.replace(/[^\d]/g, ''), 10) : quantity;
  let ruleLabel = `${workingDays} วันทำการ (${isPainting ? 'มีงานทำสี' : 'ทั่วไป'})`;
  if (!isNaN(qty)) {
    const matched = rules.find((r) => qty >= r.min && qty <= r.max);
    if (matched) {
      ruleLabel = matched.label;
    } else if (qty > 300) {
      ruleLabel = `> 300 ชิ้น: ${workingDays} วันทำการ`;
    }
  }

  // If no technician assigned yet
  if (!cleanTech) {
    const calculatedReturnDate = addWorkingDays(baseReceiveDate, workingDays, includeSaturday);
    return {
      technicianName: '',
      isTechnicianFree: true,
      activeJobsCount: 0,
      priorJob: null,
      effectiveStartDate: baseReceiveDate,
      workingDays,
      calculatedReturnDate,
      isQueuedAfterPriorJob: false,
      ruleLabel,
      queueExplanation: `ยังไม่ได้ระบุช่าง: คำนวณเริ่มต้นจากวันรับสินค้า (${formatDateDisplay(baseReceiveDate)}) + ${workingDays} วันทำการ`,
    };
  }

  // Find all active/in-progress/pending jobs for this technician (excluding current job)
  const techJobs = existingJobs.filter((job) => {
    if (currentJobId && job.id === currentJobId) return false;
    const jTech = (job.technician || '').trim().toLowerCase();
    if (!jTech) return false;
    if (jTech !== cleanTech.toLowerCase() && !cleanTech.toLowerCase().includes(jTech) && !jTech.includes(cleanTech.toLowerCase())) {
      return false;
    }
    // Only consider non-finished / non-cancelled jobs
    return job.finishStatus !== 'FINISH' && job.finishStatus !== 'CANCELLED';
  });

  if (techJobs.length === 0) {
    // Technician is FREE (ช่างไม่มีงานทำ / ไม่มีงานค้าง) -> Start immediately from receiveDate
    const calculatedReturnDate = addWorkingDays(baseReceiveDate, workingDays, includeSaturday);
    return {
      technicianName: cleanTech,
      isTechnicianFree: true,
      activeJobsCount: 0,
      priorJob: null,
      effectiveStartDate: baseReceiveDate,
      workingDays,
      calculatedReturnDate,
      isQueuedAfterPriorJob: false,
      ruleLabel,
      queueExplanation: `✨ ${cleanTech} ไม่มีงานค้าง (ช่างว่าง) เริ่มงานได้ทันทีจากวันรับสินค้า (${formatDateDisplay(baseReceiveDate)}) -> ประมาณการเสร็จ ${formatDateDisplay(calculatedReturnDate)}`,
    };
  }

  // Technician has active jobs -> Find the latest finish date among existing jobs
  let latestJobDate = '';
  let latestJob: ModifyJobItem | null = null;

  techJobs.forEach((j) => {
    // Prefer estimatedReturnDate, or calculate one from handover date
    let finishDate = normalizeToISODate(j.estimatedReturnDate);
    if (!finishDate && j.engineerHandoverDate) {
      const jWorkType = j.workTypes || j.workType || 'GENERAL';
      const jEst = calculateEstimatedCompletion(j.engineerHandoverDate, j.quantity, jWorkType, includeSaturday);
      finishDate = jEst.calculatedDate;
    }
    if (!finishDate) {
      finishDate = normalizeToISODate(j.requestDate) || baseReceiveDate;
    }

    if (!latestJobDate || finishDate > latestJobDate) {
      latestJobDate = finishDate;
      latestJob = j;
    }
  });

  // Check if latest finish date is in the future compared to baseReceiveDate
  const isQueued = Boolean(latestJobDate && latestJobDate >= baseReceiveDate);
  const effectiveStartDate = isQueued ? latestJobDate : baseReceiveDate;
  const calculatedReturnDate = addWorkingDays(effectiveStartDate, workingDays, includeSaturday);

  const priorJobInfo = latestJob ? `Job ${latestJob.id || ''} (${latestJob.customer || 'ลูกค้า'})` : 'งานก่อนหน้า';

  return {
    technicianName: cleanTech,
    isTechnicianFree: false,
    activeJobsCount: techJobs.length,
    priorJob: latestJob,
    effectiveStartDate,
    workingDays,
    calculatedReturnDate,
    isQueuedAfterPriorJob: isQueued,
    ruleLabel,
    queueExplanation: isQueued
      ? `⏳ ${cleanTech} มีงานค้าง ${techJobs.length} งาน (งานก่อนหน้า ${priorJobInfo} คาดว่าจะเสร็จ ${formatDateDisplay(latestJobDate)}) ระบบเริ่มนับวันทำงานต่องานก่อนหน้า (${formatDateDisplay(latestJobDate)}) + ${workingDays} วันทำการ -> ประมาณการเสร็จ ${formatDateDisplay(calculatedReturnDate)}`
      : `✨ ${cleanTech} มีงานค้าง ${techJobs.length} งานแต่กำหนดเสร็จก่อนวันรับสินค้า เริ่มงานได้จาก ${formatDateDisplay(baseReceiveDate)} -> ประมาณการเสร็จ ${formatDateDisplay(calculatedReturnDate)}`,
  };
};

/**
 * สรุปคิวงานของช่างทั้งหมด พร้อมค้นหาช่างที่ว่าง (ไม่มีงานทำ) และช่างที่คิวว่างเร็วที่สุด
 */
export const getAllTechniciansQueueList = (
  existingJobs: ModifyJobItem[] = [],
  quantity: number | string = 1,
  workTypes: string | string[] = 'GENERAL',
  receiveDateStr?: string,
  currentJobId?: string,
  includeSaturday = false
): TechnicianQueueInfo[] => {
  const baseReceiveDate = normalizeToISODate(receiveDateStr || getCurrentDateFormatted()) || getCurrentDateFormatted();
  
  // Extract all distinct technician names from existing jobs + default list
  const techNames = new Set<string>(DEFAULT_TECHNICIANS);
  existingJobs.forEach((j) => {
    if (j.technician && j.technician.trim()) {
      techNames.add(j.technician.trim());
    }
  });

  const list: TechnicianQueueInfo[] = [];

  techNames.forEach((tech) => {
    const queueRes = calculateQueueBasedEstimate(
      tech,
      baseReceiveDate,
      quantity,
      workTypes,
      existingJobs,
      currentJobId,
      includeSaturday
    );

    const activeJobs = existingJobs.filter((j) => {
      if (currentJobId && j.id === currentJobId) return false;
      const jTech = (j.technician || '').trim().toLowerCase();
      if (!jTech) return false;
      return (
        (jTech === tech.toLowerCase() || tech.toLowerCase().includes(jTech) || jTech.includes(tech.toLowerCase())) &&
        j.finishStatus !== 'FINISH' &&
        j.finishStatus !== 'CANCELLED'
      );
    });

    list.push({
      name: tech,
      activeJobsCount: queueRes.activeJobsCount,
      activeJobs,
      isFree: queueRes.isTechnicianFree,
      latestFinishDate: queueRes.priorJob?.estimatedReturnDate || queueRes.effectiveStartDate,
      latestJob: queueRes.priorJob,
      availableStartDate: queueRes.effectiveStartDate,
      estimatedFinishDate: queueRes.calculatedReturnDate,
      estimatedWorkingDays: queueRes.workingDays,
    });
  });

  // Sort: Free technicians first, then by earliest available finish date
  return list.sort((a, b) => {
    if (a.isFree && !b.isFree) return -1;
    if (!a.isFree && b.isFree) return 1;
    if (a.activeJobsCount !== b.activeJobsCount) return a.activeJobsCount - b.activeJobsCount;
    return a.estimatedFinishDate.localeCompare(b.estimatedFinishDate);
  });
};

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

