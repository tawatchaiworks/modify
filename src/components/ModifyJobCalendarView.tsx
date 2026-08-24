import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  Printer,
  Edit,
  Trash2,
  ExternalLink,
  Download,
  Filter,
  Layers,
  ArrowRight,
  Truck,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Hash,
  Briefcase,
  ListFilter,
  Check,
  Info,
} from 'lucide-react';
import {
  ModifyJobItem,
  CalendarViewType,
  CalendarMilestoneType,
  CalendarEventItem,
} from '../types';
import {
  THAI_MONTHS,
  THAI_DAYS_SHORT,
  THAI_DAYS_FULL,
  formatDateDisplay,
  formatThaiFullDate,
  formatThaiMonthYear,
  normalizeToISODate,
  extractJobCalendarEvents,
  generateGoogleCalendarLink,
  exportIcsCalendar,
  getCurrentDateFormatted,
} from '../utils/formatters';

interface ModifyJobCalendarViewProps {
  jobs: ModifyJobItem[];
  currentUserEmail?: string;
  currentUserName?: string;
  onEdit: (job: ModifyJobItem) => void;
  onQuickStatus: (job: ModifyJobItem) => void;
  onStartWork?: (job: ModifyJobItem) => void;
  onViewTicket: (job: ModifyJobItem) => void;
  onPrintStatusReport?: (status?: string) => void;
  onDelete: (job: ModifyJobItem) => void;
  onAddNew: () => void;
}

export const ModifyJobCalendarView: React.FC<ModifyJobCalendarViewProps> = ({
  jobs,
  currentUserEmail,
  currentUserName,
  onEdit,
  onQuickStatus,
  onStartWork,
  onViewTicket,
  onPrintStatusReport,
  onDelete,
  onAddNew,
}) => {
  const activeUserEmail = currentUserEmail || 'tawatchai.works@gmail.com';
  const isAuthorizedEmail = activeUserEmail.toLowerCase() === 'tawatchai.works@gmail.com';

  // Calendar View mode: 'day' | 'week' | 'month'
  const [calendarView, setCalendarView] = useState<CalendarViewType>('month');

  // Month sub-view: 'table' (full monthly schedule table) | 'selected_day' (selected day agenda)
  const [monthDetailMode, setMonthDetailMode] = useState<'table' | 'selected_day'>('table');

  // Currently focused date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Filters
  const [selectedMilestone, setSelectedMilestone] = useState<CalendarMilestoneType>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Selected Day for Day Detail / inspector
  const [selectedDayISO, setSelectedDayISO] = useState<string>(() => getCurrentDateFormatted());

  // Search/filter in monthly table
  const [monthSearchQuery, setMonthSearchQuery] = useState('');

  // Extract all calendar events based on jobs and filters
  const events = useMemo(() => {
    return extractJobCalendarEvents(jobs, selectedMilestone, selectedStatus);
  }, [jobs, selectedMilestone, selectedStatus]);

  // Group events by ISO date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventItem[]> = {};
    events.forEach((ev) => {
      if (!map[ev.date]) {
        map[ev.date] = [];
      }
      map[ev.date].push(ev);
    });
    return map;
  }, [events]);

  // Helper to format ISO string from Date object
  const toISODate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayISO = getCurrentDateFormatted();
  const currentISO = toISODate(currentDate);

  // Month and Year numbers
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayISO(getCurrentDateFormatted());
  };

  // 1. Calculations for Monthly Grid
  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; iso: string; isCurrentMonth: boolean; dayNum: number }[] = [];

    // Preceding month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({
        date: prevDate,
        iso: toISODate(prevDate),
        isCurrentMonth: false,
        dayNum: prevDate.getDate(),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({
        date: d,
        iso: toISODate(d),
        isCurrentMonth: true,
        dayNum: i,
      });
    }

    // Trailing next month days to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      days.push({
        date: nextDate,
        iso: toISODate(nextDate),
        isCurrentMonth: false,
        dayNum: i,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // 2. Calculations for Weekly Grid (Mon - Sun)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0=Sun, 1=Mon...
    const distanceToMonday = (dayOfWeek + 6) % 7; // distance from Monday
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - distanceToMonday);

    const week: { date: Date; iso: string; dayName: string; dayShort: string; dayNum: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = toISODate(d);
      week.push({
        date: d,
        iso,
        dayName: THAI_DAYS_FULL[d.getDay()],
        dayShort: THAI_DAYS_SHORT[d.getDay()],
        dayNum: d.getDate(),
      });
    }
    return week;
  }, [currentDate]);

  // 3. Filtered Jobs specifically for current month
  const currentMonthJobs = useMemo(() => {
    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const thaiMonthName = THAI_MONTHS[currentMonth];

    return jobs.filter((job) => {
      // Match by ISO dates or by requestMonth string
      const dates = [
        job.requestDate,
        job.engineerHandoverDate,
        job.estimatedReturnDate,
        job.inspectionDate,
        job.shipmentDate,
      ].filter(Boolean);

      const hasDateInMonth = dates.some((d) => {
        const iso = normalizeToISODate(d);
        return iso && iso.startsWith(currentMonthPrefix);
      });

      const hasMonthText =
        job.requestMonth &&
        (job.requestMonth.includes(thaiMonthName) ||
          job.requestMonth.includes(String(currentYear)) ||
          job.requestMonth.includes(String(currentYear + 543)));

      return hasDateInMonth || hasMonthText;
    });
  }, [jobs, currentYear, currentMonth]);

  // Search filtered month jobs for the master schedule table
  const displayMonthJobs = useMemo(() => {
    if (!monthSearchQuery.trim()) return currentMonthJobs;
    const q = (monthSearchQuery || '').toLowerCase().trim();
    return currentMonthJobs.filter((j) => {
      return (
        (j.id && String(j.id).toLowerCase().includes(q)) ||
        (j.customer && String(j.customer).toLowerCase().includes(q)) ||
        (j.project && String(j.project).toLowerCase().includes(q)) ||
        (j.sale && String(j.sale).toLowerCase().includes(q)) ||
        (j.saleSoNo && String(j.saleSoNo).toLowerCase().includes(q)) ||
        (j.technician && String(j.technician).toLowerCase().includes(q)) ||
        (j.requester && String(j.requester).toLowerCase().includes(q)) ||
        (j.createdBy && String(j.createdBy).toLowerCase().includes(q))
      );
    });
  }, [currentMonthJobs, monthSearchQuery]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const total = currentMonthJobs.length;
    const finish = currentMonthJobs.filter((j) => j.finishStatus === 'FINISH').length;
    const inProgress = currentMonthJobs.filter((j) => j.finishStatus === 'IN_PROGRESS').length;
    const qcComplete = currentMonthJobs.filter(
      (j) => j.inspectionResult === 'COMPLETE' || j.inspectionResult === 'PASS'
    ).length;
    const qcEdit = currentMonthJobs.filter(
      (j) => j.inspectionResult === 'EDIT' || j.inspectionResult === 'REJECT'
    ).length;
    const qcWaiting = currentMonthJobs.filter(
      (j) => !j.inspectionResult || j.inspectionResult === 'WAITING' || j.inspectionResult === 'PENDING'
    ).length;

    return { total, finish, inProgress, qcComplete, qcEdit, qcWaiting };
  }, [currentMonthJobs]);

  // Single Day View / Selected Day Events
  const activeDayEvents = eventsByDate[calendarView === 'day' ? currentISO : selectedDayISO] || [];
  const selectedDayJobs = useMemo(() => {
    const dayIso = calendarView === 'day' ? currentISO : selectedDayISO;
    return jobs.filter((job) => {
      const dates = [
        job.requestDate,
        job.engineerHandoverDate,
        job.estimatedReturnDate,
        job.inspectionDate,
        job.shipmentDate,
      ].filter(Boolean);
      return dates.some((d) => normalizeToISODate(d) === dayIso);
    });
  }, [jobs, calendarView, currentISO, selectedDayISO]);

  return (
    <div className="space-y-5">
      {/* 1. Google Account & Permissions Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">ชื่อ login เข้าใช้งาน (Google):</span>
              <span className="text-xs font-bold text-white px-2.5 py-0.5 rounded-lg bg-blue-500/30 border border-blue-400/30 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {activeUserEmail}
              </span>
              {isAuthorizedEmail ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> สิทธิ์ผู้ดูแลระบบ (Admin)
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ผู้ใช้งานระบบ
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              🛡️ สิทธิ์การเพิ่มและจัดการแผนงาน Google Sheets: <strong className="text-blue-300 font-mono">tawatchai.works@gmail.com</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ สร้างคำขอ Modify</span>
          </button>
        </div>
      </div>

      {/* 2. Calendar Header & Action Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: View Mode Switcher (Day, Week, Month) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setCalendarView('day')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calendarView === 'day'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>แผนรายวัน (Day)</span>
            </button>
            <button
              type="button"
              onClick={() => setCalendarView('week')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calendarView === 'week'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>แผนรายสัปดาห์ (Week)</span>
            </button>
            <button
              type="button"
              onClick={() => setCalendarView('month')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calendarView === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>แผนรายเดือน (Month)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
          >
            วันนี้ (Today)
          </button>
        </div>

        {/* Center: Current Period Display & Navigation */}
        <div className="flex items-center justify-between sm:justify-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            title="ย้อนกลับ"
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center min-w-[200px] sm:min-w-[260px]">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              {calendarView === 'day' && formatThaiFullDate(currentISO)}
              {calendarView === 'week' && (
                <span>
                  {formatDateDisplay(weekDays[0].iso)} - {formatDateDisplay(weekDays[6].iso)}
                </span>
              )}
              {calendarView === 'month' && formatThaiMonthYear(currentYear, currentMonth)}
            </h3>
            <span className="text-[11px] text-slate-500 block">
              {calendarView === 'day'
                ? `พบ ${activeDayEvents.length} กิจกรรมในวันที่เลือก`
                : calendarView === 'week'
                ? `ภาพรวมสัปดาห์ (${weekDays[0].dayNum} - ${weekDays[6].dayNum} ${THAI_MONTHS[weekDays[6].date.getMonth()]})`
                : `รวม ${currentMonthJobs.length} งาน (${events.length} กำหนดการ) ในเดือนนี้`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            title="ถัดไป"
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick Tools (iCal Export & Print A4) */}
        <div className="flex items-center gap-2">
          {onPrintStatusReport && (
            <button
              type="button"
              onClick={() => onPrintStatusReport(selectedStatus)}
              title="Print Preview รายงานสถานะขนาด A4"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>พิมพ์ A4</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => exportIcsCalendar(jobs)}
            title="ดาวน์โหลดปฏิทินไฟล์ .ics ไปยัง Apple Calendar หรือ Outlook"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">ส่งออก</span>
            <span>.ICS</span>
          </button>
        </div>
      </div>

      {/* 3. Filter & Milestone Legend Bar */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Milestone Type Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>กำหนดการ:</span>
          </span>
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'request', label: '📝 ขอเปิดงาน (Request)', color: 'border-blue-300 bg-blue-50 text-blue-700' },
            { id: 'handover', label: '🛠️ ส่งมอบ Engineer', color: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
            { id: 'estimatedReturn', label: '⏳ ประมาณการส่งคืน', color: 'border-amber-300 bg-amber-50 text-amber-800' },
            { id: 'inspection', label: '🔍 ตรวจสอบ QC', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
            { id: 'shipment', label: '🚚 กำหนดส่งสินค้า', color: 'border-purple-300 bg-purple-50 text-purple-800' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMilestone(m.id as CalendarMilestoneType)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedMilestone === m.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Status Filter Selector */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <span className="text-slate-500 font-semibold">สถานะงาน/QC:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-blue-500 outline-hidden font-medium"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="IN_PROGRESS">🟡 กำลังดำเนินการ (IN PROGRESS)</option>
            <option value="FINISH">🟢 เสร็จสิ้นแล้ว (FINISH)</option>
            <option value="COMPLETE">✅ ตรวจผ่าน (COMPLETE)</option>
            <option value="EDIT">⚠️ ส่งกลับแก้ไข (EDIT)</option>
            <option value="WAITING">⏳ รอตรวจ (WAITING)</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: MONTH VIEW (แผนรายเดือน พร้อมรายละเอียดงานครบถ้วน)
         ========================================================================= */}
      {calendarView === 'month' && (
        <div className="space-y-5">
          {/* Monthly Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium block">งานในเดือนนี้</span>
              <span className="text-xl font-black text-slate-900">{monthStats.total}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">รายการทั้งหมด</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] text-emerald-800 font-medium block">ตรวจผ่าน (COMPLETE)</span>
              <span className="text-xl font-black text-emerald-600">{monthStats.qcComplete}</span>
              <span className="text-[10px] text-emerald-700 block mt-0.5">QC ผ่านเรียบร้อย</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <span className="text-[11px] text-rose-800 font-medium block">ส่งกลับแก้ไข (EDIT)</span>
              <span className="text-xl font-black text-rose-600">{monthStats.qcEdit}</span>
              <span className="text-[10px] text-rose-700 block mt-0.5">ต้องนำไปปรับปรุง</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-xs">
              <span className="text-[11px] text-slate-600 font-medium block">รอตรวจ QC (WAITING)</span>
              <span className="text-xl font-black text-slate-700">{monthStats.qcWaiting}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">รอกระบวนการตรวจสอบ</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <span className="text-[11px] text-blue-800 font-medium block">เสร็จสิ้น (FINISH)</span>
              <span className="text-xl font-black text-blue-600">{monthStats.finish}</span>
              <span className="text-[10px] text-blue-700 block mt-0.5">ปิดงานสมบูรณ์</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[11px] text-amber-800 font-medium block">กำลังทำ (PROGRESS)</span>
              <span className="text-xl font-black text-amber-600">{monthStats.inProgress}</span>
              <span className="text-[10px] text-amber-700 block mt-0.5">อยู่ในสายการผลิต</span>
            </div>
          </div>

          {/* Month 7-Day Grid Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90 text-center py-2.5 text-xs font-bold text-slate-700">
              <span className="text-rose-600">อาทิตย์</span>
              <span>จันทร์</span>
              <span>อังคาร</span>
              <span>พุธ</span>
              <span>พฤหัสบดี</span>
              <span>ศุกร์</span>
              <span className="text-blue-600">เสาร์</span>
            </div>

            {/* Month Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-50/30">
              {monthGridDays.map((dayObj, idx) => {
                const dayEvents = eventsByDate[dayObj.iso] || [];
                const isToday = dayObj.iso === todayISO;
                const isSelected = dayObj.iso === selectedDayISO;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDayISO(dayObj.iso);
                      setMonthDetailMode('selected_day');
                    }}
                    className={`min-h-[110px] sm:min-h-[135px] p-1.5 sm:p-2 flex flex-col transition-all cursor-pointer group ${
                      !dayObj.isCurrentMonth
                        ? 'bg-slate-50/40 text-slate-400'
                        : isSelected
                        ? 'bg-blue-50/60 ring-2 ring-blue-500/60 z-10'
                        : 'bg-white hover:bg-slate-50/90'
                    }`}
                  >
                    {/* Cell Day Number Header */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : dayObj.isCurrentMonth
                            ? 'text-slate-800 group-hover:bg-slate-200/70'
                            : 'text-slate-400'
                        }`}
                      >
                        {dayObj.dayNum}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events List inside Grid Cell */}
                    <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[90px] sm:max-h-[115px] pr-0.5">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const isFinish = ev.job.finishStatus === 'FINISH';
                        const isInProgress = ev.job.finishStatus === 'IN_PROGRESS';
                        const statusColor = isFinish
                          ? 'bg-emerald-600 text-white'
                          : isInProgress
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-500 text-white';
                        const statusText = isFinish
                          ? 'เสร็จ (FINISH)'
                          : isInProgress
                          ? 'กำลังดำเนินการ'
                          : 'รอดำเนินการ';

                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDayISO(ev.date);
                              setMonthDetailMode('selected_day');
                            }}
                            title={`SO No: ${ev.job.saleSoNo || '-'} | สถานะงาน: ${ev.job.finishStatus || 'PENDING'} | ประมาณการส่ง: ${ev.job.estimatedReturnDate || '-'} | QC: ${ev.job.inspectionResult || 'WAITING'} | โครงการ: ${ev.job.project || '-'} | ลูกค้า: ${ev.customer} | เซลล์: ${ev.job.sale || '-'} | ช่าง: ${ev.job.technician || '-'}`}
                            className={`p-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold border cursor-pointer transition-all shadow-2xs ${ev.colorClass.bg} ${ev.colorClass.border} hover:shadow-xs hover:border-blue-400`}
                          >
                            {/* Line 1: SO No. + Job Status Badge */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono font-black text-[9px] sm:text-[10px] text-blue-900 bg-blue-100/90 px-1.5 py-0.5 rounded border border-blue-200 truncate">
                                SO: {ev.job.saleSoNo ? ev.job.saleSoNo : ev.jobId}
                              </span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                                {statusText}
                              </span>
                            </div>

                            {/* Line 2: Customer & Project */}
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-900 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.colorClass.dot}`} />
                              <span className="truncate">{ev.customer}</span>
                            </div>

                            {/* Line 3: วันที่ประมาณการส่ง (Estimated Return Date) */}
                            {ev.job.estimatedReturnDate && (
                              <div className="flex items-center gap-1 text-[9px] text-amber-900 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200/70 font-mono mt-0.5 truncate">
                                <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span className="truncate font-semibold">
                                  นัดส่ง: {formatDateDisplay(ev.job.estimatedReturnDate)}
                                </span>
                              </div>
                            )}

                            {/* Line 4: Milestone & Technician */}
                            <div className="flex items-center justify-between gap-1 text-[9px] text-slate-500 mt-0.5 pt-0.5 border-t border-slate-200/60">
                              <span className="truncate text-slate-600 font-medium">{ev.typeLabel}</span>
                              {ev.job.technician && (
                                <span className="text-indigo-700 font-medium shrink-0 truncate max-w-[50%]">
                                  🔧 {ev.job.technician}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayISO(dayObj.iso);
                            setMonthDetailMode('selected_day');
                          }}
                          className="w-full text-center text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline py-0.5"
                        >
                          + อีก {dayEvents.length - 3} รายการ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =====================================================================
              DEDICATED SECTION: ตารางแผนงานรายเดือน (Monthly Master Schedule)
              โชว์รายละเอียดงาน: ชื่อเซลล์, ชื่อโครงการ, So No., ชื่อช่าง, ชื่อ login เข้าใช้งาน
             ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header / Tabs */}
            <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ListFilter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>แผนงานรายเดือน & รายละเอียดงาน</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      {formatThaiMonthYear(currentYear, currentMonth)}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    แสดงรายละเอียด: ชื่อเซลล์, ชื่อโครงการ, So No., ชื่อช่างผู้ทำ และชื่อ login Google
                  </p>
                </div>
              </div>

              {/* View Switch Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setMonthDetailMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      monthDetailMode === 'table'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    ตารางแผนงานทั้งเดือน ({currentMonthJobs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthDetailMode('selected_day')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      monthDetailMode === 'selected_day'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    วันที่เลือก: {formatDateDisplay(selectedDayISO)} ({selectedDayJobs.length})
                  </button>
                </div>

                <input
                  type="text"
                  value={monthSearchQuery}
                  onChange={(e) => setMonthSearchQuery(e.target.value)}
                  placeholder="ค้นหา SO, เซลล์, ช่าง, โครงการ..."
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden w-48 sm:w-60"
                />
              </div>
            </div>

            {/* Content: Mode 1 - Full Monthly Table */}
            {monthDetailMode === 'table' && (
              <div className="overflow-x-auto">
                {displayMonthJobs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-2">
                    <p className="font-semibold text-sm">ไม่พบรายการงานในเดือนนี้ตามคำค้นหา</p>
                    <button
                      type="button"
                      onClick={onAddNew}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + เพิ่มงาน Modify ประจำเดือนนี้
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">So No. / รหัสงาน</th>
                        <th className="py-3 px-3.5">ชื่อโครงการ & ลูกค้า</th>
                        <th className="py-3 px-3.5">ชื่อเซลล์ (Sale)</th>
                        <th className="py-3 px-3.5">ชื่อช่าง (Technician)</th>
                        <th className="py-3 px-3.5">ชื่อ login เข้าใช้งาน (Google)</th>
                        <th className="py-3 px-3.5">กำหนดการสำคัญ</th>
                        <th className="py-3 px-3.5">สถานะงาน / QC</th>
                        <th className="py-3 px-3.5 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayMonthJobs.map((job) => {
                        const isComplete =
                          job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                        const isEdit =
                          job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                        const qcLabel = isComplete
                          ? 'COMPLETE'
                          : isEdit
                          ? 'EDIT'
                          : job.inspectionResult || 'WAITING';

                        const loginUser = job.createdBy || activeUserEmail;

                        return (
                          <tr key={job.id} className="hover:bg-blue-50/40 transition-colors">
                            {/* So No. / Job ID */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-xs text-blue-700 block">
                                  {job.saleSoNo || '-'}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {job.id}
                                </span>
                              </div>
                            </td>

                            {/* Project & Customer */}
                            <td className="py-3.5 px-3.5 align-top max-w-[220px]">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 block text-xs truncate" title={job.project || '-'}>
                                  🏢 {job.project || 'ไม่ได้ระบุชื่อโครงการ'}
                                </span>
                                <span className="text-[11px] text-slate-600 block truncate" title={job.customer}>
                                  👥 {job.customer}
                                </span>
                                {job.modifyDetails && (
                                  <p className="text-[10px] text-slate-400 line-clamp-1">
                                    {job.modifyDetails}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Sale */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                                <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>{job.sale || '-'}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                ผู้ขอ: {job.requester}
                              </span>
                            </td>

                            {/* Technician */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                                <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="text-slate-900">{job.technician || 'ยังไม่ระบุช่าง'}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                จำนวน: <strong className="text-blue-700">{job.quantity}</strong>
                              </span>
                            </td>

                            {/* Login User (Google) */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[140px]" title={loginUser}>
                                  {loginUser}
                                </span>
                              </div>
                            </td>

                            {/* Milestones */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="space-y-1 text-[11px]">
                                {job.engineerHandoverDate && (
                                  <span className="text-slate-600 block">
                                    🛠️ ส่งมอบ: <strong className="text-slate-800">{formatDateDisplay(job.engineerHandoverDate)}</strong>
                                  </span>
                                )}
                                {job.estimatedReturnDate && (
                                  <span className="text-amber-800 block font-medium">
                                    ⏳ นัดส่งคืน: <strong>{formatDateDisplay(job.estimatedReturnDate)}</strong>
                                  </span>
                                )}
                                {job.inspectionDate && (
                                  <span className="text-emerald-800 block font-medium">
                                    🔍 ตรวจ QC: <strong>{formatDateDisplay(job.inspectionDate)}</strong>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status / QC */}
                            <td className="py-3.5 px-3.5 align-top">
                              <div className="space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => onQuickStatus(job)}
                                  title="คลิกเพื่ออัปเดตสถานะงาน"
                                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                    job.finishStatus === 'FINISH'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : job.finishStatus === 'IN_PROGRESS'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {job.finishStatus === 'FINISH' ? '🟢 FINISH' : job.finishStatus === 'IN_PROGRESS' ? '🟡 IN PROGRESS' : '⚪ PENDING'}
                                </button>

                                <div>
                                  <button
                                    type="button"
                                    onClick={() => onQuickStatus(job)}
                                    title="คลิกเพื่อเปลี่ยนผล QC"
                                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                      isComplete
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : isEdit
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    QC: {qcLabel}
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3.5 align-top text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => onViewTicket(job)}
                                  title="พิมพ์ใบสั่งงาน"
                                  className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                <a
                                  href={generateGoogleCalendarLink(job, 'estimatedReturn')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="ส่งออกไปยัง Google Calendar"
                                  className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                                >
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => onEdit(job)}
                                  title="แก้ไขข้อมูล"
                                  className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDelete(job)}
                                  title="ลบรายการ"
                                  className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-400 rounded-lg border border-slate-200 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Content: Mode 2 - Selected Day Cards */}
            {monthDetailMode === 'selected_day' && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-sm text-slate-900">
                      รายการกำหนดการประจำวันที่: {formatThaiFullDate(selectedDayISO)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    พบ {selectedDayJobs.length} งาน
                  </span>
                </div>

                {selectedDayJobs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <p className="text-sm">ไม่มีกำหนดการในวันที่ {formatDateDisplay(selectedDayISO)}</p>
                    <button
                      type="button"
                      onClick={onAddNew}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + เพิ่มงาน Modify ในวันนี้
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDayJobs.map((job) => {
                      const isComplete =
                        job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                      const isEdit =
                        job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                      const qcLabel = isComplete
                        ? 'COMPLETE'
                        : isEdit
                        ? 'EDIT'
                        : job.inspectionResult || 'WAITING';

                      return (
                        <div
                          key={job.id}
                          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-blue-700">
                                  {job.saleSoNo || job.id}
                                </span>
                                <span className="font-mono text-xs text-slate-400">{job.id}</span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                                🏢 {job.project || 'งานไม่มีชื่อโครงการ'}
                              </h4>
                              <p className="text-xs text-slate-600">👥 {job.customer}</p>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  job.finishStatus === 'FINISH'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {job.finishStatus}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isEdit
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                QC: {qcLabel}
                              </span>
                            </div>
                          </div>

                          {/* Key Requested Information Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">So No.:</span>
                              <strong className="text-blue-700 font-mono font-bold text-xs">{job.saleSoNo || '-'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">ชื่อเซลล์ (Sale):</span>
                              <strong className="text-slate-800 font-semibold">{job.sale || '-'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">ชื่อช่าง (Technician):</span>
                              <strong className="text-slate-800 font-semibold">{job.technician || '-'}</strong>
                            </div>
                            <div className="bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60">
                              <span className="text-amber-800 block text-[10px] font-bold">⏳ ประมาณการส่งมอบคืน:</span>
                              <strong className="text-amber-950 font-semibold text-[11px] block">
                                {job.estimatedReturnDate ? formatDateDisplay(job.estimatedReturnDate) : '-'}
                              </strong>
                            </div>
                            <div className="bg-blue-50/80 p-1.5 rounded-lg border border-blue-200/60">
                              <span className="text-blue-800 block text-[10px] font-bold">🚚 Shipment Date:</span>
                              <strong className="text-blue-950 font-semibold text-[11px] block">
                                {job.shipmentDate ? formatDateDisplay(job.shipmentDate) : '-'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Login ผู้บันทึก:</span>
                              <strong className="text-emerald-700 font-mono text-[11px] truncate block" title={job.createdBy || activeUserEmail}>
                                {job.createdBy || activeUserEmail}
                              </strong>
                            </div>
                          </div>

                          {/* Action row */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onViewTicket(job)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>พิมพ์ใบงาน</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onQuickStatus(job)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                อัปเดตสถานะ
                              </button>
                              <button
                                type="button"
                                onClick={() => onEdit(job)}
                                className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: WEEK VIEW (แผนรายสัปดาห์ 7 วัน)
         ========================================================================= */}
      {calendarView === 'week' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dayEvents = eventsByDate[day.iso] || [];
              const isToday = day.iso === todayISO;

              return (
                <div
                  key={day.iso}
                  className={`bg-white rounded-2xl border flex flex-col overflow-hidden shadow-xs transition-all ${
                    isToday ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                  }`}
                >
                  {/* Day Column Header */}
                  <div
                    className={`p-3 border-b text-center ${
                      isToday ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold block">{day.dayName}</span>
                    <span
                      className={`text-lg font-black inline-block mt-0.5 ${
                        isToday ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                    <span className={`text-[10px] block ${isToday ? 'text-blue-100' : 'text-slate-500'}`}>
                      {formatDateDisplay(day.iso)}
                    </span>
                  </div>

                  {/* Day Events Column */}
                  <div className="p-2 space-y-2 flex-1 min-h-[300px] bg-slate-50/40 overflow-y-auto">
                    {dayEvents.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-3">
                        <span className="text-[11px] text-slate-400 font-medium">ไม่มีกำหนดการ</span>
                      </div>
                    ) : (
                      dayEvents.map((ev) => {
                        const isFinish = ev.job.finishStatus === 'FINISH';
                        const isInProgress = ev.job.finishStatus === 'IN_PROGRESS';

                        return (
                          <div
                            key={ev.id}
                            className={`p-2.5 rounded-xl border text-xs shadow-2xs space-y-1.5 transition-all hover:shadow-xs bg-white ${ev.colorClass.border}`}
                          >
                            {/* SO No. + Job Status Header */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-black text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate">
                                SO: {ev.job.saleSoNo || ev.jobId}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                                  isFinish
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isInProgress
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}
                              >
                                {isFinish ? '🟢 FINISH' : isInProgress ? '🟡 PROGRESS' : '⚪ PENDING'}
                              </span>
                            </div>

                            {/* Milestone Badge */}
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-block ${ev.colorClass.badge}`}
                              >
                                {ev.typeLabel}
                              </span>
                            </div>

                            <h5 className="font-bold text-slate-900 text-xs line-clamp-1">
                              {ev.customer}
                            </h5>

                            {ev.job.project && (
                              <p className="text-[10px] text-indigo-700 font-medium truncate">
                                🏢 {ev.job.project}
                              </p>
                            )}

                            {/* Estimated Return Date */}
                            {ev.job.estimatedReturnDate && (
                              <div className="flex items-center gap-1 text-[9px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono truncate">
                                <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span className="truncate font-semibold">
                                  นัดส่ง: {formatDateDisplay(ev.job.estimatedReturnDate)}
                                </span>
                              </div>
                            )}

                            <div className="space-y-0.5 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span>เซลล์: <strong className="text-slate-800">{ev.job.sale || '-'}</strong></span>
                                <span>ช่าง: <strong className="text-slate-800">{ev.job.technician || '-'}</strong></span>
                              </div>
                              <div className="text-[9px] text-emerald-700 font-mono truncate">
                                login: {ev.job.createdBy || activeUserEmail}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => onViewTicket(ev.job)}
                                title="พิมพ์ใบสั่งงาน"
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>พิมพ์</span>
                              </button>

                              <div className="flex items-center gap-1">
                                <a
                                  href={generateGoogleCalendarLink(ev.job, ev.type as any)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="เพิ่มลง Google Calendar"
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => onQuickStatus(ev.job)}
                                  title="อัปเดตสถานะ"
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-amber-600 rounded cursor-pointer"
                                >
                                  <Wrench className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEdit(ev.job)}
                                  title="แก้ไข"
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: DAY VIEW (แผนรายวัน Timeline / Detailed Agenda)
         ========================================================================= */}
      {calendarView === 'day' && (
        <div className="space-y-4">
          {/* Day Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">งานที่มีกำหนดวันนี้</span>
                <span className="text-lg font-black text-slate-900">{activeDayEvents.length} รายการ</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">นัดส่งมอบคืนวันนี้</span>
                <span className="text-lg font-black text-slate-900">
                  {activeDayEvents.filter((e) => e.type === 'estimatedReturn').length} รายการ
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">ตรวจ QC วันนี้</span>
                <span className="text-lg font-black text-slate-900">
                  {activeDayEvents.filter((e) => e.type === 'inspection').length} รายการ
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">ส่งสินค้า (Shipment)</span>
                <span className="text-lg font-black text-slate-900">
                  {activeDayEvents.filter((e) => e.type === 'shipment').length} รายการ
                </span>
              </div>
            </div>
          </div>

          {/* Agenda List for Selected Day */}
          {activeDayEvents.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">ไม่มีกำหนดการในวันที่เลือก</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ไม่พบงานที่มีวัน Request, ส่งมอบ Engineer, นัดส่งมอบคืน หรือตรวจ QC ในวันที่{' '}
                {formatDateDisplay(currentISO)}
              </p>
              <button
                type="button"
                onClick={onAddNew}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                + สร้างคำขอ Modify สำหรับวันนี้
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDayEvents.map((ev) => {
                const job = ev.job;
                const isComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                const isEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                const qcLabel = isComplete ? 'COMPLETE' : isEdit ? 'EDIT' : (job.inspectionResult || 'WAITING');

                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* Left: Event Type Icon & Main Job Info */}
                    <div className="flex items-start gap-3.5 flex-1">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${ev.colorClass.badge}`}
                      >
                        {ev.type === 'request' && <Clock className="w-6 h-6 text-white" />}
                        {ev.type === 'handover' && <Wrench className="w-6 h-6 text-white" />}
                        {ev.type === 'estimatedReturn' && <Clock className="w-6 h-6 text-white" />}
                        {ev.type === 'inspection' && <CheckCircle2 className="w-6 h-6 text-white" />}
                        {ev.type === 'shipment' && <Truck className="w-6 h-6 text-white" />}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-blue-700">
                            {job.saleSoNo || job.id}
                          </span>
                          <span className="font-mono text-xs text-slate-400">({job.id})</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ev.colorClass.badge}`}>
                            {ev.typeLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => onQuickStatus(job)}
                            title="คลิกเพื่อเปลี่ยนสถานะงาน"
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              job.finishStatus === 'FINISH'
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                            }`}
                          >
                            งาน: {job.finishStatus}
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickStatus(job)}
                            title="คลิกเพื่อเปลี่ยนผลการตรวจ QC (WAITING / COMPLETE / EDIT)"
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              isComplete
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                : isEdit
                                ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            QC: {qcLabel}
                          </button>
                        </div>

                        <h4 className="text-base font-bold text-slate-900">{job.customer}</h4>

                        {/* Complete Job Specific Details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                          {job.project && <span>🏢 โครงการ: <strong className="text-slate-900">{job.project}</strong></span>}
                          {job.saleSoNo && (
                            <span>
                              🔖 SO No: <strong className="text-blue-700 font-mono">{job.saleSoNo}</strong>
                            </span>
                          )}
                          <span>👤 Sale: <strong className="text-slate-900">{job.sale || '-'}</strong></span>
                          <span>🔧 ช่างผู้ทำ: <strong className="text-slate-900">{job.technician || '-'}</strong></span>
                          {job.estimatedReturnDate && (
                            <span className="bg-amber-50 text-amber-900 font-semibold px-2 py-0.5 rounded-md border border-amber-200">
                              ⏳ นัดส่งมอบคืน: <strong>{formatDateDisplay(job.estimatedReturnDate)}</strong>
                            </span>
                          )}
                          {job.shipmentDate && (
                            <span className="bg-blue-50 text-blue-900 font-semibold px-2 py-0.5 rounded-md border border-blue-200">
                              🚚 Shipment: <strong>{formatDateDisplay(job.shipmentDate)}</strong>
                            </span>
                          )}
                          <span className="font-mono text-emerald-700">
                            🌐 Login: <strong>{job.createdBy || activeUserEmail}</strong>
                          </span>
                          <span>จำนวน: <strong className="text-blue-700">{job.quantity}</strong></span>
                        </div>

                        {job.modifyDetails && (
                          <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                            <span className="font-semibold block text-[11px] text-slate-500 mb-0.5">
                              รายละเอียด Modify:
                            </span>
                            <p className="line-clamp-2">{job.modifyDetails}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Dates & Action Buttons */}
                    <div className="flex flex-col items-end gap-2.5 shrink-0 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="flex items-center gap-2">
                        <a
                          href={generateGoogleCalendarLink(job, ev.type as any)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>Google Calendar</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>

                        <button
                          type="button"
                          onClick={() => onViewTicket(job)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์ใบงาน</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onQuickStatus(job)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>อัปเดตสถานะ QC/งาน</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(job)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl border border-slate-200 transition-colors"
                          title="แก้ไขข้อมูลทั้งหมด"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(job)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-400 rounded-xl border border-slate-200 transition-colors"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
