import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  X,
  Flame,
  CheckCircle2,
  Calendar as CalendarIcon,
  Layers,
  ChevronRight,
  ChevronLeft,
  Printer,
  FileText,
  Filter,
  TrendingUp,
  CalendarDays,
  ListTodo,
  Play,
  CheckCircle,
  Edit3,
  UserX,
  Clock,
  AlertCircle,
  AlertTriangle,
  Wrench,
  Sparkles,
  UserPlus,
  Settings,
  Plus,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  formatDateDisplay,
  getJobWorkflowStatus,
  getJobWorkPlanDetails,
  normalizeToISODate,
  getWorkingDaysRangeISOList,
} from '../utils/formatters';
import {
  TechnicianProfile,
  getStoredTechnicians,
  subscribeTechniciansChange,
  parseTechnicians,
  formatTechniciansList,
} from '../utils/technicianStore';
import { TechnicianManagementModal } from './TechnicianManagementModal';

interface TechnicianQueueModalProps {
  isOpen: boolean;
  jobs: ModifyJobItem[];
  onClose: () => void;
  onSelectJob?: (job: ModifyJobItem) => void;
  onQuickStatus?: (job: ModifyJobItem) => void;
  onStartWork?: (job: ModifyJobItem) => void;
  onViewTicket?: (job: ModifyJobItem) => void;
  onEditJob?: (job: ModifyJobItem) => void;
  onAddNewJob?: () => void;
  onBatchRenameJobTechnician?: (oldName: string, newName: string) => Promise<void>;
}

export interface TechnicianQueueSummary {
  name: string;
  isUnassigned: boolean;
  totalJobs: number;
  activeJobs: number; // IN_PROGRESS
  pendingJobs: number; // PENDING
  waitingQcJobs: number; // WAIT_QC
  urgentJobs: number; // URGENT or VERY_URGENT
  totalQuantity: number;
  latestEstimatedReturnDate: string;
  status: 'AVAILABLE' | 'MODERATE' | 'BUSY' | 'OVERLOADED';
  jobs: ModifyJobItem[];
  profile?: TechnicianProfile;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const TechnicianQueueModal: React.FC<TechnicianQueueModalProps> = ({
  isOpen,
  jobs,
  onClose,
  onSelectJob,
  onQuickStatus,
  onStartWork,
  onViewTicket,
  onEditJob,
  onAddNewJob,
  onBatchRenameJobTechnician,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'ACTIVE' | 'PENDING' | 'WAIT_QC' | 'URGENT'>('ALL');
  const [viewMode, setViewMode] = useState<'queue' | 'week' | 'month'>('queue');
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [rosterTechs, setRosterTechs] = useState<TechnicianProfile[]>(() => getStoredTechnicians());

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isManageModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isManageModalOpen, onClose]);

  // Subscribe to technician roster updates
  useEffect(() => {
    setRosterTechs(getStoredTechnicians());
    const unsub = subscribeTechniciansChange((updated) => {
      setRosterTechs(updated);
    });
    return unsub;
  }, [isOpen]);

  // CRITICAL REQUIREMENT: Filter to only ongoing/active jobs (งานที่กำลังทำอยู่เท่านั้น งานเสร็จไม่ต้องเอามาโชว์)
  const activeOngoingJobs = useMemo(() => {
    return jobs.filter((job) => {
      const wf = getJobWorkflowStatus(job);
      return wf.code !== 'FINISH';
    });
  }, [jobs]);

  // Aggregate all technicians and their workload queue for active ongoing jobs
  // (รองรับ 1 งาน มีช่างทำงานได้ตั้งแต่ 1 คนขึ้นไป เช่น ฟารอส, ช่างรักษ์, meen)
  const technicianSummaries = useMemo<TechnicianQueueSummary[]>(() => {
    const techMap = new Map<string, ModifyJobItem[]>();

    // 1. First seed with all registered technicians in roster (ช่างรักษ์, ฟารอส, meen, etc.)
    rosterTechs.forEach((t) => {
      const trimmed = (t.name || '').trim();
      if (trimmed && !techMap.has(trimmed)) {
        techMap.set(trimmed, []);
      }
    });

    // 2. Gather all unique technician names from all jobs in the system using parseTechnicians
    jobs.forEach((job) => {
      const parsedTechs = parseTechnicians(job.technician);
      parsedTechs.forEach((techName) => {
        if (techName && !techMap.has(techName)) {
          techMap.set(techName, []);
        }
      });
    });

    // 3. Populate active ongoing jobs into their respective technician queue
    let hasUnassigned = false;
    activeOngoingJobs.forEach((job) => {
      const parsedTechs = parseTechnicians(job.technician);
      if (parsedTechs.length === 0) {
        hasUnassigned = true;
        const unassignedKey = 'ยังไม่ระบุช่าง (Unassigned)';
        if (!techMap.has(unassignedKey)) {
          techMap.set(unassignedKey, []);
        }
        techMap.get(unassignedKey)!.push(job);
      } else {
        // Add job to every assigned technician's queue (1 job -> multiple technicians)
        parsedTechs.forEach((techName) => {
          if (!techMap.has(techName)) {
            techMap.set(techName, []);
          }
          const list = techMap.get(techName)!;
          if (!list.some((j) => j.id === job.id)) {
            list.push(job);
          }
        });
      }
    });

    // If there's an unassigned group with 0 active jobs, remove it if it's empty
    if (!hasUnassigned && techMap.has('ยังไม่ระบุช่าง (Unassigned)')) {
      techMap.delete('ยังไม่ระบุช่าง (Unassigned)');
    }

    const summaries: TechnicianQueueSummary[] = [];

    techMap.forEach((techJobs, name) => {
      const isUnassigned = name === 'ยังไม่ระบุช่าง (Unassigned)' || !name;
      const profile = rosterTechs.find((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase());
      let activeCount = 0;
      let pendingCount = 0;
      let waitQcCount = 0;
      let urgentCount = 0;
      let totalQty = 0;
      let latestReturn = '';

      techJobs.forEach((job) => {
        const wf = getJobWorkflowStatus(job);
        if (wf.code === 'IN_PROGRESS') activeCount++;
        else if (wf.code === 'PENDING') pendingCount++;
        else if (wf.code === 'WAIT_QC') waitQcCount++;

        if (job.urgencyLevel === 'URGENT' || job.urgencyLevel === 'VERY_URGENT') {
          urgentCount++;
        }

        const qty = typeof job.quantity === 'number' ? job.quantity : parseFloat(String(job.quantity)) || 1;
        totalQty += qty;

        if (job.estimatedReturnDate && (!latestReturn || job.estimatedReturnDate > latestReturn)) {
          latestReturn = job.estimatedReturnDate;
        }
      });

      // Workload status: If 0 active/pending/waitQC jobs, status is 100% AVAILABLE (คิวว่าง)
      let status: TechnicianQueueSummary['status'] = 'AVAILABLE';
      if (activeCount >= 4 || urgentCount >= 3) {
        status = 'OVERLOADED';
      } else if (activeCount >= 2) {
        status = 'BUSY';
      } else if (activeCount === 1 || pendingCount > 0) {
        status = 'MODERATE';
      } else {
        status = 'AVAILABLE';
      }

      // Sort jobs by priority within technician queue:
      const sortedJobs = [...techJobs].sort((a, b) => {
        const wfA = getJobWorkflowStatus(a);
        const wfB = getJobWorkflowStatus(b);

        // Active first
        const isAActive = wfA.code === 'IN_PROGRESS';
        const isBActive = wfB.code === 'IN_PROGRESS';
        if (isAActive && !isBActive) return -1;
        if (!isAActive && isBActive) return 1;

        // Urgency rank
        const urgRank = (u?: string) => (u === 'VERY_URGENT' ? 3 : u === 'URGENT' ? 2 : 1);
        const rankDiff = urgRank(b.urgencyLevel) - urgRank(a.urgencyLevel);
        if (rankDiff !== 0) return rankDiff;

        // Earliest estimated return date
        const dateA = a.estimatedReturnDate || '9999-99-99';
        const dateB = b.estimatedReturnDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      });

      summaries.push({
        name,
        isUnassigned,
        totalJobs: techJobs.length,
        activeJobs: activeCount,
        pendingJobs: pendingCount,
        waitingQcJobs: waitQcCount,
        urgentJobs: urgentCount,
        totalQuantity: totalQty,
        latestEstimatedReturnDate: latestReturn,
        status,
        jobs: sortedJobs,
        profile,
      });
    });

    // Sort technicians: Unassigned first, then active jobs descending, then available
    return summaries.sort((a, b) => {
      if (a.isUnassigned && !b.isUnassigned) return -1;
      if (!a.isUnassigned && b.isUnassigned) return 1;
      if (b.activeJobs !== a.activeJobs) return b.activeJobs - a.activeJobs;
      if (b.totalJobs !== a.totalJobs) return b.totalJobs - a.totalJobs;
      return a.name.localeCompare(b.name, 'th');
    });
  }, [jobs, activeOngoingJobs, rosterTechs]);

  // Accurate Counts of Technicians and their workload status
  const technicianCounts = useMemo(() => {
    const actualTechs = technicianSummaries.filter((t) => !t.isUnassigned);
    const total = actualTechs.length;
    const available = actualTechs.filter((t) => t.status === 'AVAILABLE' && t.totalJobs === 0).length;
    const active = actualTechs.filter((t) => t.activeJobs > 0).length;
    const urgent = actualTechs.filter((t) => t.urgentJobs > 0).length;
    const waitQc = actualTechs.filter((t) => t.waitingQcJobs > 0).length;
    const pending = actualTechs.filter((t) => t.pendingJobs > 0).length;
    const unassignedTech = technicianSummaries.find((t) => t.isUnassigned);
    const unassignedJobs = unassignedTech ? unassignedTech.totalJobs : 0;

    return {
      total,
      available,
      active,
      urgent,
      waitQc,
      pending,
      unassignedJobs,
    };
  }, [technicianSummaries]);

  // Technicians matching the search term
  const matchedTechnicians = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return technicianSummaries;
    return technicianSummaries.filter((t) =>
      t.name.toLowerCase().includes(term) ||
      t.jobs.some((j) =>
        (j.saleSoNo && j.saleSoNo.toLowerCase().includes(term)) ||
        (j.id && j.id.toLowerCase().includes(term)) ||
        (j.customer && j.customer.toLowerCase().includes(term))
      )
    );
  }, [technicianSummaries, searchTerm]);

  // Filtered technicians for the multi-technician overview grid
  const filteredTechnicians = useMemo(() => {
    let list = matchedTechnicians;
    if (statusFilter === 'AVAILABLE') {
      list = list.filter((t) => !t.isUnassigned && t.totalJobs === 0);
    } else if (statusFilter === 'ACTIVE') {
      list = list.filter((t) => t.activeJobs > 0);
    } else if (statusFilter === 'URGENT') {
      list = list.filter((t) => t.urgentJobs > 0);
    } else if (statusFilter === 'WAIT_QC') {
      list = list.filter((t) => t.waitingQcJobs > 0);
    } else if (statusFilter === 'PENDING') {
      list = list.filter((t) => t.pendingJobs > 0);
    }
    return list;
  }, [matchedTechnicians, statusFilter]);

  // Active selected technician summary (if a specific technician is picked)
  const currentTechSummary = useMemo(() => {
    if (selectedTech === 'ALL') {
      if (searchTerm.trim() && matchedTechnicians.length === 1) {
        return matchedTechnicians[0];
      }
      return null;
    }
    return technicianSummaries.find((t) => t.name === selectedTech) || null;
  }, [selectedTech, searchTerm, matchedTechnicians, technicianSummaries]);

  // Filtered jobs for the queue view (active ongoing only)
  const displayedJobs = useMemo(() => {
    let sourceJobs: ModifyJobItem[] = [];

    if (currentTechSummary) {
      sourceJobs = currentTechSummary.jobs;
    } else if (searchTerm.trim()) {
      // Gather all jobs of matched technicians
      const jobSet = new Map<string, ModifyJobItem>();
      matchedTechnicians.forEach((t) => {
        t.jobs.forEach((j) => jobSet.set(j.id, j));
      });
      sourceJobs = Array.from(jobSet.values());
    } else {
      sourceJobs = activeOngoingJobs;
    }

    return sourceJobs.filter((job) => {
      const wf = getJobWorkflowStatus(job);
      if (statusFilter === 'AVAILABLE') return false; // Available technicians have 0 jobs
      if (statusFilter === 'ACTIVE' && wf.code !== 'IN_PROGRESS') return false;
      if (statusFilter === 'PENDING' && wf.code !== 'PENDING') return false;
      if (statusFilter === 'WAIT_QC' && wf.code !== 'WAIT_QC') return false;
      if (statusFilter === 'URGENT' && job.urgencyLevel !== 'URGENT' && job.urgencyLevel !== 'VERY_URGENT') return false;
      return true;
    });
  }, [currentTechSummary, searchTerm, matchedTechnicians, activeOngoingJobs, statusFilter]);

  // Today ISO
  const todayISO = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // =========================================================================
  // WEEKLY VIEW CALCULATIONS
  // =========================================================================
  const weekDays = useMemo(() => {
    const curr = new Date(currentWeekDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday... 6 is Saturday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${dateNum}`;
      const dayIndexInWeek = d.getDay(); // 0 = Sun, 6 = Sat
      const isWeekendDay = dayIndexInWeek === 0 || dayIndexInWeek === 6;

      days.push({
        date: d,
        iso,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isWeekend: isWeekendDay,
      });
    }
    return days;
  }, [currentWeekDate]);

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    return `${formatDateDisplay(start.iso)} - ${formatDateDisplay(end.iso)}`;
  }, [weekDays]);

  // Calculate events/jobs distributed for each day in the weekly view (Ongoing only)
  const weeklyEventsByDate = useMemo(() => {
    const map: Record<string, { job: ModifyJobItem; type: 'DUE' | 'WORK_SPAN' | 'HANDOVER'; wf: any; plan: any }[]> = {};
    weekDays.forEach((d) => {
      map[d.iso] = [];
    });

    const relevantJobs = currentTechSummary ? currentTechSummary.jobs : displayedJobs;

    relevantJobs.forEach((job) => {
      const wf = getJobWorkflowStatus(job);
      if (wf.code === 'FINISH') return; // Skip finished jobs
      const plan = getJobWorkPlanDetails(job);
      const returnISO = normalizeToISODate(job.estimatedReturnDate);
      const handoverISO = normalizeToISODate(job.engineerHandoverDate);

      // 1. Due date match
      if (returnISO && map[returnISO]) {
        const exists = map[returnISO].some((e) => e.job.id === job.id);
        if (!exists) {
          map[returnISO].push({
            job,
            type: 'DUE',
            wf,
            plan,
          });
        }
      }

      // 2. Working days span (Mon-Fri)
      const spanDates = getWorkingDaysRangeISOList(
        job.engineerHandoverDate || '',
        job.estimatedReturnDate || ''
      );

      spanDates.forEach((isoDate) => {
        if (map[isoDate]) {
          const already = map[isoDate].some((e) => e.job.id === job.id);
          if (!already) {
            map[isoDate].push({
              job,
              type: 'WORK_SPAN',
              wf,
              plan,
            });
          }
        }
      });

      // 3. Handover date match
      if (handoverISO && map[handoverISO]) {
        const already = map[handoverISO].some((e) => e.job.id === job.id);
        if (!already) {
          map[handoverISO].push({
            job,
            type: 'HANDOVER',
            wf,
            plan,
          });
        }
      }
    });

    return map;
  }, [weekDays, currentTechSummary, displayedJobs]);

  // =========================================================================
  // MONTHLY VIEW CALCULATIONS (เช็คคิวงานเป็นรายเดือน)
  // =========================================================================
  const monthInfo = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); // 0-11
    const thaiMonthName = THAI_MONTH_NAMES[month];
    const thaiYear = year + 543;

    // First and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Distance to Monday for first week
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon ...
    const distToMon = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const calendarStart = new Date(year, month, 1 + distToMon);

    // Distance to Sunday for last week
    const lastDayOfWeek = lastDay.getDay();
    const distToSun = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    const calendarEnd = new Date(year, month, lastDay.getDate() + distToSun);

    const days = [];
    const curr = new Date(calendarStart);
    while (curr <= calendarEnd) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const dateNum = String(curr.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${dateNum}`;
      const dayIndex = curr.getDay();
      const isWeekendDay = dayIndex === 0 || dayIndex === 6;
      const isCurrentMonth = curr.getMonth() === month;
      const isToday = iso === todayISO;

      days.push({
        date: new Date(curr),
        iso,
        dayNum: curr.getDate(),
        isCurrentMonth,
        isWeekend: isWeekendDay,
        isToday,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return {
      title: `${thaiMonthName} ${thaiYear}`,
      year,
      month,
      days,
    };
  }, [currentMonthDate, todayISO]);

  // Calculate events/jobs distributed for each day in the monthly view (Ongoing only)
  const monthlyEventsByDate = useMemo(() => {
    const map: Record<string, { job: ModifyJobItem; type: 'DUE' | 'WORK_SPAN' | 'HANDOVER'; wf: any; plan: any }[]> = {};
    monthInfo.days.forEach((d) => {
      map[d.iso] = [];
    });

    const relevantJobs = currentTechSummary ? currentTechSummary.jobs : displayedJobs;

    relevantJobs.forEach((job) => {
      const wf = getJobWorkflowStatus(job);
      if (wf.code === 'FINISH') return; // Skip finished jobs
      const plan = getJobWorkPlanDetails(job);
      const returnISO = normalizeToISODate(job.estimatedReturnDate);
      const handoverISO = normalizeToISODate(job.engineerHandoverDate);

      // 1. Due date match
      if (returnISO && map[returnISO]) {
        const exists = map[returnISO].some((e) => e.job.id === job.id);
        if (!exists) {
          map[returnISO].push({
            job,
            type: 'DUE',
            wf,
            plan,
          });
        }
      }

      // 2. Working days span (Mon-Fri)
      const spanDates = getWorkingDaysRangeISOList(
        job.engineerHandoverDate || '',
        job.estimatedReturnDate || ''
      );

      spanDates.forEach((isoDate) => {
        if (map[isoDate]) {
          const already = map[isoDate].some((e) => e.job.id === job.id);
          if (!already) {
            map[isoDate].push({
              job,
              type: 'WORK_SPAN',
              wf,
              plan,
            });
          }
        }
      });

      // 3. Handover date match
      if (handoverISO && map[handoverISO]) {
        const already = map[handoverISO].some((e) => e.job.id === job.id);
        if (!already) {
          map[handoverISO].push({
            job,
            type: 'HANDOVER',
            wf,
            plan,
          });
        }
      }
    });

    return map;
  }, [monthInfo, currentTechSummary, displayedJobs]);

  // Week navigation handlers
  const handlePrevWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekDate(d);
  };

  const handleTodayWeek = () => {
    setCurrentWeekDate(new Date());
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonthDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonthDate(d);
  };

  const handleTodayMonth = () => {
    setCurrentMonthDate(new Date());
  };

  // Print Queue sheet
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      id="technician-queue-modal"
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-xs overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-queue-title"
    >
      {/* Top Header Bar */}
      <div className="bg-[#362f27] text-[#f8f6f0] px-4 sm:px-6 py-3.5 border-b border-[#4d4338] shadow-md flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 id="tech-queue-title" className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2 text-white">
              <span>เช็คสถานะ & คิวงานช่าง (Technician Queue Tracker)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                {activeOngoingJobs.length} งานค้างในระบบ • ทั้งหมด {technicianCounts.total} ช่าง • 🟢 คิวว่าง {technicianCounts.available} ท่าน
              </span>
            </h2>
            <p className="text-xs text-[#d1c7ba] mt-0.5">
              ติดตามคิวงานที่กำลังทำอยู่ (Active Jobs) เท่านั้น • ตรวจสอบรายวัน รายสัปดาห์ และรายเดือนแบบเรียลไทม์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manage Technicians Button (New Modal/View) */}
          <button
            id="btn-manage-technicians"
            type="button"
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-[#2c241c] text-xs font-black border border-amber-300 transition-all cursor-pointer shadow-xs"
            title="เปิดหน้าจัดการ เพิ่มชื่อ ลบชื่อ แก้ไขข้อมูลช่าง"
          >
            <UserPlus className="w-4 h-4" />
            <span>จัดการรายชื่อช่าง (เพิ่ม/ลบ/แก้ไข)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4a4035] hover:bg-[#5a4e41] text-[#f8f6f0] text-xs font-bold border border-[#615446] transition-all cursor-pointer shadow-2xs"
            title="พิมพ์สรุปคิวงาน"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>พิมพ์คิวงาน</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#f5f2eb]">
        {/* Search, Mode Toggle & Technician Filter Bar */}
        <div className="bg-white border-b border-[#ded7cc] px-4 sm:px-6 py-3.5 shadow-2xs shrink-0 space-y-3">
          {/* Top Control Line: Search Bar + View Mode Switcher (Queue / Week / Month) */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7d7265]">
                <Search className="w-4 h-4 text-amber-700" />
              </div>
              <input
                id="tech-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedTech('ALL');
                }}
                placeholder="พิมพ์ชื่อช่าง (เช่น ช่างรักษ์, FAROS, MEEN) เพื่อดูคิวงาน..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#fbf9f5] hover:bg-white focus:bg-white text-sm font-semibold text-[#2c241c] rounded-xl border border-[#cfc7bc] focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all placeholder:text-[#9e9384] shadow-2xs"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTech('ALL');
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9e9384] hover:text-[#2c241c] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View Mode Toggle: Queue List vs Weekly Queue vs Monthly Queue */}
            <div className="flex items-center gap-1.5 p-1 bg-[#ede9e1] rounded-xl border border-[#ded7cc] shrink-0">
              <button
                id="btn-view-queue"
                type="button"
                onClick={() => setViewMode('queue')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'queue'
                    ? 'bg-[#3b3228] text-white shadow-xs'
                    : 'text-[#52473b] hover:text-[#2c241c] hover:bg-[#ded7cc]'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                <span>คิวงานตามลำดับ</span>
              </button>

              <button
                id="btn-view-week"
                type="button"
                onClick={() => setViewMode('week')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[#52473b] hover:text-amber-900 hover:bg-[#ded7cc]'
                }`}
              >
                <CalendarDays className="w-4 h-4 text-amber-300" />
                <span>📅 คิวรายสัปดาห์</span>
              </button>

              <button
                id="btn-view-month"
                type="button"
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-[#3b3228] text-white shadow-xs'
                    : 'text-[#52473b] hover:text-[#2c241c] hover:bg-[#ded7cc]'
                }`}
              >
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                <span>🗓️ เช็คคิวงานรายเดือน</span>
              </button>
            </div>
          </div>

          {/* Technician Scope Bar (Hidden as requested) */}
          <div className="hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black text-[#7d7265] uppercase shrink-0 mr-1">
                เลือกช่าง:
              </span>
              <button
                id="btn-view-all-techs"
                type="button"
                onClick={() => {
                  setSelectedTech('ALL');
                  setSearchTerm('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  selectedTech === 'ALL' && !searchTerm
                    ? 'bg-amber-600 border-amber-700 text-white shadow-2xs'
                    : 'bg-white border-[#cfc7bc] text-[#52473b] hover:bg-[#ede9e1]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>👥 ดูช่างทั้งหมด ({technicianSummaries.filter((t) => !t.isUnassigned).length} ช่าง)</span>
              </button>
            </div>
          </div>

          {/* Active Filter Indicator Tag & Quick Status Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#ede9e1]">
            {/* Active Filter Indicator Tag if a specific technician is searched or selected */}
            {(selectedTech !== 'ALL' || (searchTerm && currentTechSummary)) ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 shadow-2xs">
                <span>กำลังดูคิวของ:</span>
                <span className="font-black text-[#2c241c] underline">
                  {currentTechSummary ? currentTechSummary.name : searchTerm}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTech('ALL');
                    setSearchTerm('');
                  }}
                  className="p-0.5 text-amber-700 hover:text-amber-950 hover:bg-amber-200 rounded-full cursor-pointer ml-1"
                  title="ล้างเพื่อดูช่างทั้งหมด"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-xs font-bold text-[#7d7265] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                <span>แสดงช่างทั้งหมด ({technicianCounts.total} ท่าน)</span>
              </div>
            )}

            {/* Quick Status Filter Tabs (For Queue Mode) */}
            {viewMode === 'queue' && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
                <span className="text-xs font-bold text-[#685e52] flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-amber-700" />
                  กรองคิวงานค้าง:
                </span>
                {[
                  { id: 'ALL', label: 'ทั้งหมด', badge: activeOngoingJobs.length },
                  { id: 'AVAILABLE', label: '🟢 ว่างรอรับงาน', badge: technicianCounts.available },
                  { id: 'ACTIVE', label: '⚙️ กำลังทำ', badge: technicianSummaries.reduce((a, b) => a + b.activeJobs, 0) },
                  { id: 'URGENT', label: '🚨 งานด่วน', badge: technicianSummaries.reduce((a, b) => a + b.urgentJobs, 0) },
                  { id: 'WAIT_QC', label: '🔍 รอ QC', badge: technicianSummaries.reduce((a, b) => a + b.waitingQcJobs, 0) },
                  { id: 'PENDING', label: '⏳ รอดำเนินการ', badge: technicianSummaries.reduce((a, b) => a + b.pendingJobs, 0) },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      statusFilter === f.id
                        ? f.id === 'AVAILABLE'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-[#4a4036] text-[#fbf9f5] shadow-xs'
                        : f.id === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-[#ebe5dc] text-[#52473b] hover:bg-[#dfd7cc]'
                    }`}
                  >
                    <span>{f.label}</span>
                    {typeof f.badge === 'number' && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        statusFilter === f.id
                          ? 'bg-white text-[#2c241c] font-black'
                          : f.id === 'AVAILABLE'
                          ? 'bg-emerald-200 text-emerald-950 font-bold'
                          : 'bg-white/80 text-[#4a4036]'
                      }`}>
                        {f.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Technician Availability & Workload Stat Bar (Quick Glance Summary) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#ede9e1]">
            <button
              type="button"
              onClick={() => {
                setSelectedTech('ALL');
                setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE');
              }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                  : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 block">🟢 ว่างรอรับงาน (Available)</span>
                  <span className="text-xs text-emerald-950 font-black">ไม่มีในแผนงาน & ไม่มีงานกำลังทำ</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-black text-emerald-800">{technicianCounts.available}</span>
                <span className="text-[10px] font-bold text-emerald-700 block">ท่าน</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTech('ALL');
                setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE');
              }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                statusFilter === 'ACTIVE'
                  ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-500/30 shadow-xs'
                  : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-200 text-blue-800 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-800 block">⚙️ ช่างมีงานกำลังทำ</span>
                  <span className="text-xs text-blue-950 font-black">In Progress</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-black text-blue-800">{technicianCounts.active}</span>
                <span className="text-[10px] font-bold text-blue-700 block">ท่าน</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTech('ALL');
                setStatusFilter(statusFilter === 'URGENT' ? 'ALL' : 'URGENT');
              }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                statusFilter === 'URGENT'
                  ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-500/30 shadow-xs'
                  : 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4 text-rose-700" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-800 block">🚨 งานด่วน / คิวแน่น</span>
                  <span className="text-xs text-rose-950 font-black">Urgent / Overloaded</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-black text-rose-800">{technicianCounts.urgent}</span>
                <span className="text-[10px] font-bold text-rose-700 block">ท่าน</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTech('ALL');
                setSearchTerm('ยังไม่ระบุช่าง');
              }}
              className="p-2.5 rounded-xl border border-[#ded7cc] bg-white hover:bg-[#faf8f5] transition-all cursor-pointer flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#7d7265] block">⚠️ รอมอบหมายช่าง</span>
                  <span className="text-xs text-[#2c241c] font-black">Unassigned</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-black text-amber-800">{technicianCounts.unassignedJobs}</span>
                <span className="text-[10px] font-bold text-[#7d7265] block">งาน</span>
              </div>
            </button>
          </div>
        </div>

        {/* Body Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* =========================================================================
              VIEW MODE 1: MONTHLY QUEUE SCHEDULE (เช็คคิวงานเป็นรายเดือน)
             ========================================================================= */}
          {viewMode === 'month' ? (
            <div className="space-y-4">
              {/* Month Navigation Header Bar */}
              <div className="bg-white rounded-2xl border border-[#d8d1c5] shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-[#2c241c]">
                        คิวงานประจำเดือน: {monthInfo.title}
                      </h3>
                      {currentTechSummary && (
                        currentTechSummary.totalJobs === 0 && !currentTechSummary.isUnassigned ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-lg text-xs font-black flex items-center gap-1.5 animate-pulse shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>ช่าง: <strong className="text-emerald-700 font-black">{currentTechSummary.name}</strong> (🟢 สถานะ: ว่าง)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-xs font-bold">
                            ช่าง: {currentTechSummary.name}
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-xs text-[#7d7265]">
                      แสดงเฉพาะงานที่กำลังทำและงานในแผน • เลื่อนแถบสไลด์แนวตั้งด้านข้าง (Scroll Bar) เพื่อดูทั้งเดือน • วันเสาร์-อาทิตย์เป็นวันหยุด
                    </p>
                  </div>
                </div>

                {/* Month Prev / Today / Next Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl bg-[#f5f2eb] hover:bg-[#e4ded5] text-[#2c241c] font-bold text-xs border border-[#cfc7bc] transition-all cursor-pointer flex items-center gap-1"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">เดือนก่อน</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTodayMonth}
                    className="px-3 py-2 rounded-xl bg-[#3b3228] hover:bg-[#2a231b] text-white font-black text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    เดือนนี้
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 rounded-xl bg-[#f5f2eb] hover:bg-[#e4ded5] text-[#2c241c] font-bold text-xs border border-[#cfc7bc] transition-all cursor-pointer flex items-center gap-1"
                    title="เดือนถัดไป"
                  >
                    <span className="hidden sm:inline">เดือนถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Monthly Calendar Table / Grid with Vertical Side Scrollbar */}
              <div className="bg-white rounded-2xl border border-[#ded7cc] shadow-xs overflow-hidden flex flex-col">
                {/* Scrollable Container with Side Vertical Scrollbar */}
                <div className="calendar-scroll-container overflow-y-auto overflow-x-auto max-h-[580px] sm:max-h-[640px] xl:max-h-[700px] relative scroll-smooth">
                  {/* 7 Days of Week Header - Sticky at the top */}
                  <div className="grid grid-cols-7 border-b border-[#ded7cc] bg-[#fbf9f5] text-center text-xs font-black text-[#4a4036] sticky top-0 z-10 shadow-2xs min-w-[640px]">
                    {['จันทร์ (Mon)', 'อังคาร (Tue)', 'พุธ (Wed)', 'พฤหัสบดี (Thu)', 'ศุกร์ (Fri)', 'เสาร์ (Sat)', 'อาทิตย์ (Sun)'].map((dName, i) => (
                      <div
                        key={dName}
                        className={`py-2.5 px-1 border-r last:border-r-0 border-[#ded7cc] ${
                          i >= 5 ? 'text-rose-700 bg-rose-50/70' : 'bg-[#fbf9f5]'
                        }`}
                      >
                        <span>{dName}</span>
                      </div>
                    ))}
                  </div>

                  {/* Monthly Days Cells (7 columns per row) */}
                  <div className="grid grid-cols-7 auto-rows-fr bg-[#ded7cc] gap-[1px] min-w-[640px]">
                    {monthInfo.days.map((day) => {
                      const dayEvents = monthlyEventsByDate[day.iso] || [];
                      const isWeekendDay = day.isWeekend;

                      return (
                        <div
                          key={day.iso}
                          className={`min-h-[140px] p-2 flex flex-col justify-between transition-all ${
                            !day.isCurrentMonth
                              ? 'bg-[#f4efe8] text-[#a89d8f] opacity-60'
                              : day.isToday
                              ? 'bg-amber-50/80 ring-2 ring-amber-500/30'
                              : isWeekendDay
                              ? 'bg-rose-50/20 text-rose-900'
                              : 'bg-white text-[#2c241c]'
                          }`}
                        >
                          {/* Day Cell Top Header */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-xs font-black px-1.5 py-0.5 rounded-md ${
                                  day.isToday
                                    ? 'bg-amber-600 text-white'
                                    : isWeekendDay
                                    ? 'text-rose-700 font-extrabold'
                                    : 'text-[#2c241c]'
                                }`}
                              >
                                {day.dayNum}
                              </span>
                              {day.isToday && (
                                <span className="text-[9px] font-bold text-amber-800 bg-amber-200/70 px-1 py-0.2 rounded">
                                  วันนี้
                                </span>
                              )}
                            </div>

                            {dayEvents.length > 0 && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 shadow-2xs">
                                {dayEvents.length} งาน
                              </span>
                            )}
                          </div>

                          {/* Day Events Box (Active Ongoing Jobs) */}
                          <div className="space-y-1 overflow-y-auto max-h-[140px] pr-0.5">
                            {dayEvents.length === 0 ? (
                              isWeekendDay ? (
                                <div className="text-[10px] text-rose-400 font-medium italic pt-2">
                                  วันหยุด
                                </div>
                              ) : null
                            ) : (
                              dayEvents.slice(0, 3).map((ev, idx) => {
                                const isUrgent = ev.job.urgencyLevel === 'URGENT' || ev.job.urgencyLevel === 'VERY_URGENT';
                                const techName = ev.job.technician?.trim() || 'ยังไม่ระบุช่าง';

                                return (
                                  <div
                                    key={`${ev.job.id}-${ev.type}-${idx}`}
                                    onClick={() => {
                                      if (onViewTicket) onViewTicket(ev.job);
                                      else if (onSelectJob) onSelectJob(ev.job);
                                    }}
                                    className={`p-1.5 rounded-lg border text-[10px] leading-tight cursor-pointer hover:shadow-xs transition-all ${
                                      ev.type === 'DUE'
                                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                                        : ev.wf.code === 'IN_PROGRESS'
                                        ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold'
                                        : 'bg-[#faf8f5] border-[#ded7cc] text-[#2c241c]'
                                    }`}
                                    title={`${ev.job.customer || 'ไม่ระบุ'} • SO: ${ev.job.saleSoNo || ev.job.id} • ช่าง: ${techName}`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate font-bold">
                                        {ev.type === 'DUE' ? '🏁 ' : '🛠️ '}
                                        {ev.job.saleSoNo ? `SO:${ev.job.saleSoNo}` : ev.job.id}
                                      </span>
                                      {isUrgent && (
                                        <span className="text-[8px] font-black text-rose-700 bg-rose-100 px-0.5 rounded shrink-0">
                                          ด่วน
                                        </span>
                                      )}
                                    </div>
                                    <div className="truncate text-[9px] text-[#5a4e40]">
                                      {ev.job.customer || 'ลูกค้าทั่วไป'}
                                    </div>
                                    {!currentTechSummary && (
                                      <div className="text-[8px] font-semibold text-amber-800 truncate">
                                        👤 {parseTechnicians(ev.job.technician).join(', ') || 'ยังไม่ระบุช่าง'}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}

                            {dayEvents.length > 3 && (
                              <div className="text-[9px] text-center font-bold text-amber-800 bg-amber-100/80 rounded py-0.5">
                                +{dayEvents.length - 3} งานเพิ่มเติม
                              </div>
                            )}
                          </div>

                          {/* Bottom Space / Subtle Indicator */}
                          <div className="h-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'week' ? (
            /* =========================================================================
                VIEW MODE 2: WEEKLY QUEUE SCHEDULE (คิวงานรายสัปดาห์)
               ========================================================================= */
            <div className="space-y-4">
              {/* Week Navigation Header Bar */}
              <div className="bg-white rounded-2xl border border-[#d8d1c5] shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 shadow-2xs">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-[#2c241c]">
                        คิวงานประจำสัปดาห์
                      </h3>
                      <span className="px-2.5 py-0.5 bg-[#3b3228] text-amber-300 rounded-lg text-xs font-black shadow-2xs">
                        {weekRangeLabel}
                      </span>
                      {currentTechSummary && (
                        currentTechSummary.totalJobs === 0 && !currentTechSummary.isUnassigned ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-lg text-xs font-black flex items-center gap-1.5 animate-pulse shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>ช่าง: <strong className="text-emerald-700 font-black">{currentTechSummary.name}</strong> (🟢 สถานะ: ว่าง)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-xs font-bold">
                            ช่าง: {currentTechSummary.name}
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-xs text-[#7d7265] mt-0.5">
                      ตารางงาน Modify ที่กำลังทำอยู่ตลอดสัปดาห์ (ย้อนหลังและไปข้างหน้าได้ • วันเสาร์-อาทิตย์เป็นวันหยุด)
                    </p>
                  </div>
                </div>

                {/* Week Prev / Today / Next Controls (ย้อนหลัง และ ไปข้างหน้า) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(currentWeekDate);
                      d.setDate(d.getDate() - 14);
                      setCurrentWeekDate(d);
                    }}
                    className="px-2 py-1.5 rounded-xl bg-[#f5f2eb] hover:bg-[#e4ded5] text-[#5a4e40] font-bold text-xs border border-[#cfc7bc] transition-all cursor-pointer hidden md:inline-flex items-center gap-0.5"
                    title="ย้อนหลัง 2 สัปดาห์"
                  >
                    <span>-2 สัปดาห์</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="px-3 py-2 rounded-xl bg-[#f5f2eb] hover:bg-[#e4ded5] text-[#2c241c] font-black text-xs border border-[#cfc7bc] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="ย้อนกลับสัปดาห์ก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4 text-amber-800" />
                    <span>ย้อนหลัง (สัปดาห์ก่อน)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTodayWeek}
                    className="px-3.5 py-2 rounded-xl bg-[#3b3228] hover:bg-[#2a231b] text-white font-black text-xs transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                    title="กลับมาสัปดาห์ปัจจุบัน"
                  >
                    <span>สัปดาห์นี้</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="px-3 py-2 rounded-xl bg-[#f5f2eb] hover:bg-[#e4ded5] text-[#2c241c] font-black text-xs border border-[#cfc7bc] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="ไปสัปดาห์ถัดไป"
                  >
                    <span>ไปข้างหน้า (สัปดาห์ถัดไป)</span>
                    <ChevronRight className="w-4 h-4 text-amber-800" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(currentWeekDate);
                      d.setDate(d.getDate() + 14);
                      setCurrentWeekDate(d);
                    }}
                    className="px-2 py-1.5 rounded-xl bg-[#f5f2eb] hover:bg-[#e4ded5] text-[#5a4e40] font-bold text-xs border border-[#cfc7bc] transition-all cursor-pointer hidden md:inline-flex items-center gap-0.5"
                    title="ไปข้างหน้า 2 สัปดาห์"
                  >
                    <span>+2 สัปดาห์</span>
                  </button>
                </div>
              </div>

              {/* 7 Days Weekly Grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const dayEvents = weeklyEventsByDate[day.iso] || [];
                  const isToday = day.iso === todayISO;
                  const isWeekendDay = day.isWeekend;

                  return (
                    <div
                      key={day.iso}
                      className={`bg-white rounded-2xl border flex flex-col overflow-hidden shadow-xs transition-all ${
                        isToday
                          ? 'border-amber-500 ring-2 ring-amber-500/20'
                          : isWeekendDay
                          ? 'border-rose-200 bg-rose-50/10'
                          : 'border-[#ded7cc]'
                      }`}
                    >
                      {/* Day Column Header */}
                      <div
                        className={`p-3 border-b text-center ${
                          isToday
                            ? 'bg-amber-600 text-white'
                            : isWeekendDay
                            ? 'bg-rose-50 text-rose-900 border-rose-200'
                            : 'bg-[#fbf9f5] text-[#2c241c]'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-black">{day.dayName}</span>
                          {isWeekendDay && (
                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${isToday ? 'bg-amber-700 text-white' : 'bg-rose-100 text-rose-700'}`}>
                              วันหยุด
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-lg font-black inline-block mt-0.5 ${
                            isToday ? 'text-white' : isWeekendDay ? 'text-rose-700' : 'text-[#2c241c]'
                          }`}
                        >
                          {day.dayNum}
                        </span>
                        <span className={`text-[10px] block ${isToday ? 'text-amber-100' : isWeekendDay ? 'text-rose-500' : 'text-[#7d7265]'}`}>
                          {formatDateDisplay(day.iso)}
                        </span>
                      </div>

                      {/* Day Tasks Column (Only Ongoing Active Tasks) */}
                      <div className={`p-2 space-y-2 flex-1 min-h-[300px] overflow-y-auto ${isWeekendDay ? 'bg-rose-50/20' : 'bg-[#faf8f5]'}`}>
                        {dayEvents.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-3">
                            {isWeekendDay ? (
                              <>
                                <span className="text-base mb-1">☕</span>
                                <span className="text-[11px] font-bold text-rose-600">วันหยุดประจำสัปดาห์</span>
                                <span className="text-[10px] text-[#9e9384] mt-0.5">ไม่นับเป็นวันทำงานในแผน</span>
                              </>
                            ) : (
                              <span className="text-[11px] text-[#9e9384] font-medium">ไม่มีคิวงาน</span>
                            )}
                          </div>
                        ) : (
                          dayEvents.map((ev, idx) => {
                            const isUrgent = ev.job.urgencyLevel === 'URGENT' || ev.job.urgencyLevel === 'VERY_URGENT';
                            const techList = parseTechnicians(ev.job.technician);

                            return (
                              <div
                                key={`${ev.job.id}-${ev.type}-${idx}`}
                                className={`bg-white rounded-xl border p-2.5 shadow-2xs hover:shadow-sm transition-all text-xs flex flex-col justify-between ${
                                  ev.wf.code === 'IN_PROGRESS'
                                    ? 'border-blue-300 ring-1 ring-blue-500/20'
                                    : isUrgent
                                    ? 'border-rose-300 ring-1 ring-rose-500/20'
                                    : 'border-[#ded7cc]'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  {/* Event Type & Urgency */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                                      ev.type === 'DUE'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                                    }`}>
                                      {ev.type === 'DUE' ? '🏁 กำหนดส่ง' : '🛠️ กำลังทำ'}
                                    </span>
                                    {isUrgent && (
                                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                        ด่วน
                                      </span>
                                    )}
                                  </div>

                                  {/* SO / ID */}
                                  <div className="font-bold text-[#2c241c] truncate">
                                    {ev.job.saleSoNo ? `SO: ${ev.job.saleSoNo}` : ev.job.id}
                                  </div>

                                  {/* Technician Name Tags (รองรับ 1 คนขึ้นไป) */}
                                  {!currentTechSummary && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      {techList.length === 0 ? (
                                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                          ⚠️ ยังไม่ระบุช่าง
                                        </span>
                                      ) : (
                                        techList.map((tn) => (
                                          <span
                                            key={tn}
                                            className="text-[9px] font-bold text-[#3d332a] bg-[#f2ede4] border border-[#d8d1c5] px-1.5 py-0.2 rounded flex items-center gap-0.5 truncate"
                                          >
                                            👤 {tn}
                                          </span>
                                        ))
                                      )}
                                      {techList.length > 1 && (
                                        <span className="text-[8px] font-black text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                                          {techList.length} ช่าง
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Customer */}
                                  <div className="text-[11px] text-[#4a4036] font-medium truncate">
                                    {ev.job.customer || 'ไม่ระบุลูกค้า'}
                                  </div>

                                  {/* Work Details & Qty */}
                                  <div className="text-[10px] text-[#7d7265] bg-[#faf8f5] p-1 rounded border border-[#ede9e1] line-clamp-2">
                                    {ev.job.quantity || 1} ชิ้น • {ev.job.modifyDetails || (ev.job.workDetails && ev.job.workDetails[0]) || '-'}
                                  </div>
                                </div>

                                {/* Mini Action Buttons */}
                                <div className="pt-2 mt-2 border-t border-[#ede9e1] flex items-center justify-between gap-1">
                                  {onQuickStatus && (
                                    <button
                                      type="button"
                                      onClick={() => onQuickStatus(ev.job)}
                                      className="flex-1 py-1 bg-[#eae4db] hover:bg-[#ded7cc] text-[#2c241c] rounded text-[10px] font-bold transition-all cursor-pointer text-center"
                                    >
                                      อัปเดต
                                    </button>
                                  )}
                                  {onViewTicket && (
                                    <button
                                      type="button"
                                      onClick={() => onViewTicket(ev.job)}
                                      className="p-1 bg-[#eae4db] hover:bg-[#ded7cc] text-[#2c241c] rounded transition-all cursor-pointer"
                                      title="ดูใบสั่งงาน"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </button>
                                  )}
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
          ) : (
            /* =========================================================================
                VIEW MODE 3: QUEUE LIST VIEW (คิวงานตามสถานะ / สรุปรายช่าง)
               ========================================================================= */
            currentTechSummary ? (
              <div className="space-y-6">
                {/* Selected Technician Profile Banner */}
                <div className="bg-white rounded-2xl border border-[#d8d1c5] shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs shrink-0 ${
                      currentTechSummary.isUnassigned
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : currentTechSummary.activeJobs > 0
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {currentTechSummary.isUnassigned ? '⚠️' : currentTechSummary.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {currentTechSummary.totalJobs === 0 && !currentTechSummary.isUnassigned ? (
                          <h3 className="text-lg sm:text-xl font-black text-emerald-600 animate-pulse flex items-center gap-2">
                            <span>{currentTechSummary.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-850 border border-emerald-300 flex items-center gap-1 not-italic animate-none">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              🟢 สถานะ: ว่าง
                            </span>
                          </h3>
                        ) : (
                          <h3 className="text-lg sm:text-xl font-black text-[#2c241c]">
                            {currentTechSummary.name}
                          </h3>
                        )}
                        {currentTechSummary.status === 'OVERLOADED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-rose-600" />
                            งานล้นมือ / มีงานด่วน
                          </span>
                        ) : currentTechSummary.status === 'BUSY' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            🟡 กำลังทำ {currentTechSummary.activeJobs} งาน
                          </span>
                        ) : currentTechSummary.activeJobs > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            ⚙️ มีงานในมือ 1 งาน
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-400 ring-2 ring-emerald-400/40 flex items-center gap-1.5 animate-pulse shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>🟢 สถานะว่างรอรับงาน (0 งาน)</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7d7265] mt-1">
                        {currentTechSummary.isUnassigned
                          ? 'รายการงานค้างที่ยังไม่ได้มอบหมายให้ช่างคนใดคนหนึ่ง ดำเนินการมอบหมายช่างเพื่อเริ่มงาน'
                          : currentTechSummary.totalJobs === 0
                          ? 'ไม่มีรายชื่อในแผนงาน และไม่มีงานกำลังดำเนินการ (พร้อมรับงานใหม่ได้ทันที)'
                          : `รวมงานค้างในมือ ${currentTechSummary.totalJobs} รายการ (จำนวนรวม ${currentTechSummary.totalQuantity} ชิ้น)`}
                      </p>
                    </div>
                  </div>

                  {/* KPI Metric Counter Pills (Ongoing Only) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
                    <div className="bg-[#fbf9f5] border border-[#ded7cc] p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold text-[#7d7265] block">กำลังทำ (Active)</span>
                      <span className="text-lg font-black text-blue-700">{currentTechSummary.activeJobs}</span>
                    </div>
                    <div className="bg-[#fbf9f5] border border-[#ded7cc] p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold text-[#7d7265] block">งานด่วน (Urgent)</span>
                      <span className="text-lg font-black text-rose-700">{currentTechSummary.urgentJobs}</span>
                    </div>
                    <div className="bg-[#fbf9f5] border border-[#ded7cc] p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold text-[#7d7265] block">รอตรวจ QC</span>
                      <span className="text-lg font-black text-purple-700">{currentTechSummary.waitingQcJobs}</span>
                    </div>
                    <div className="bg-[#fbf9f5] border border-[#ded7cc] p-2.5 rounded-xl">
                      <span className="text-[10px] font-bold text-[#7d7265] block">รอดำเนินการ</span>
                      <span className="text-lg font-black text-amber-700">{currentTechSummary.pendingJobs}</span>
                    </div>
                  </div>
                </div>

                {/* Technician's Job Queue List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-[#2c241c] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-700" />
                      <span>ลำดับคิวงานค้างของ {currentTechSummary.name} ({displayedJobs.length} งาน)</span>
                    </h4>
                    {onAddNewJob && currentTechSummary.isUnassigned && (
                      <button
                        type="button"
                        onClick={onAddNewJob}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        + มอบหมายงานใหม่
                      </button>
                    )}
                  </div>

                  {displayedJobs.length === 0 ? (
                    currentTechSummary.totalJobs === 0 ? (
                      <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center space-y-3 shadow-xs">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <h5 className="font-black text-base text-emerald-950">
                          ช่าง "{currentTechSummary.name}" ว่างรอรับงาน (0 งาน)
                        </h5>
                        <p className="text-xs text-[#52473b] max-w-md mx-auto">
                          ไม่มีรายชื่อในแผนงาน และไม่มีงานกำลังดำเนินการ พร้อมรับมอบหมายใบสั่งงานใหม่ได้ทันที
                        </p>
                        {onAddNewJob && (
                          <button
                            type="button"
                            onClick={onAddNewJob}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            <span>+ มอบหมายงาน Modify ใหม่ให้ช่างคนนี้</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-[#ded7cc] p-10 text-center space-y-2 shadow-xs">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                        <h5 className="font-bold text-sm text-[#2c241c]">ไม่มีงานค้างที่ตรงกับตัวกรองที่เลือก</h5>
                        <p className="text-xs text-[#7d7265]">ช่าง {currentTechSummary.name} มีงานค้างทั้งหมด {currentTechSummary.totalJobs} งาน แต่ไม่มีรายการที่ตรงกับสถานะ "{statusFilter}"</p>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('ALL')}
                          className="mt-2 text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                        >
                          ดูงานทั้งหมดของช่าง ({currentTechSummary.totalJobs} งาน)
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayedJobs.map((job, idx) => {
                        const wf = getJobWorkflowStatus(job);
                        const plan = getJobWorkPlanDetails(job);
                        const isUrgent = job.urgencyLevel === 'URGENT' || job.urgencyLevel === 'VERY_URGENT';

                        return (
                          <div
                            key={job.id || idx}
                            className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm ${
                              wf.code === 'IN_PROGRESS'
                                ? 'border-blue-300 ring-1 ring-blue-500/20'
                                : isUrgent
                                ? 'border-rose-300 ring-1 ring-rose-500/20'
                                : 'border-[#ded7cc]'
                            }`}
                          >
                            <div>
                              {/* Card Top: Queue Position + Job ID + Urgency + Status */}
                              <div className="flex items-start justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shadow-2xs ${
                                    idx === 0 && wf.code === 'IN_PROGRESS'
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-[#4a4036] text-white'
                                  }`}>
                                    #{idx + 1}
                                  </span>
                                  <div>
                                    <span className="text-xs font-black text-[#2c241c] block">
                                      {job.id}
                                    </span>
                                    {job.saleSoNo && (
                                      <span className="text-[11px] font-bold text-blue-700">
                                        SO: {job.saleSoNo}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${wf.badgeClass}`}>
                                    {wf.icon} {wf.shortLabel}
                                  </span>
                                  {isUrgent && (
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                                      job.urgencyLevel === 'VERY_URGENT'
                                        ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                                        : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}>
                                      {job.urgencyLevel === 'VERY_URGENT' ? '🚨 ด่วนมาก' : '⚡ ด่วน'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Customer & Project */}
                              <div className="mb-2">
                                <h5 className="text-sm font-bold text-[#1f1913] truncate">
                                  {job.customer || 'ไม่ระบุลูกค้า'}
                                </h5>
                                {job.project && (
                                  <p className="text-xs text-[#7d7265] truncate">
                                    โครงการ: {job.project}
                                  </p>
                                )}
                              </div>

                              {/* Technician Badges (รองรับ 1 คนขึ้นไป) */}
                              <div className="mb-2.5 flex flex-wrap items-center gap-1">
                                {parseTechnicians(job.technician).length === 0 ? (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                    ⚠️ ยังไม่ระบุช่าง
                                  </span>
                                ) : (
                                  parseTechnicians(job.technician).map((tName) => (
                                    <span
                                      key={tName}
                                      className="text-[10px] font-bold text-[#3a3026] bg-[#f0ebd5]/70 border border-[#d8d1c5] px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                                    >
                                      👤 {tName}
                                    </span>
                                  ))
                                )}
                                {parseTechnicians(job.technician).length > 1 && (
                                  <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md">
                                    👥 {parseTechnicians(job.technician).length} ช่างร่วม
                                  </span>
                                )}
                              </div>

                              {/* Work Details & Quantity */}
                              <div className="bg-[#fbf9f5] border border-[#ede9e1] rounded-xl p-2.5 mb-3 text-xs space-y-1">
                                <div className="flex items-center justify-between text-[#7d7265]">
                                  <span className="font-semibold">ประเภทงาน / จำนวน:</span>
                                  <span className="font-black text-[#2c241c] bg-[#eae4db] px-2 py-0.5 rounded-md">
                                    {job.quantity || 1} ชิ้น
                                  </span>
                                </div>
                                <p className="text-[#4a4036] font-medium line-clamp-2">
                                  {job.modifyDetails || (job.workDetails && job.workDetails[0]) || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                </p>
                              </div>

                              {/* Schedule & Working Days Indicator */}
                              <div className="text-[11px] text-[#685e52] space-y-1 mb-3 bg-white p-2 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between">
                                  <span>📅 ส่งมอบช่าง:</span>
                                  <span className="font-bold text-[#2c241c]">
                                    {formatDateDisplay(job.engineerHandoverDate) || '-'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>⏳ ประมาณการคืน:</span>
                                  <span className="font-bold text-amber-800">
                                    {formatDateDisplay(job.estimatedReturnDate) || '-'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-bold">
                                  <span>สถานะระยะเวลา:</span>
                                  <span className={`${
                                    plan.diffStatus === 'OVERDUE' || plan.diffStatus === 'EXCEEDED'
                                      ? 'text-rose-600'
                                      : plan.diffStatus === 'FASTER'
                                      ? 'text-emerald-600'
                                      : 'text-blue-600'
                                  }`}>
                                    {plan.diffLabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-[#ded7cc] flex items-center justify-between gap-1.5">
                              {onStartWork && wf.code === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => onStartWork(job)}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>เริ่มทำ</span>
                                </button>
                              )}

                              {onQuickStatus && (
                                <button
                                  type="button"
                                  onClick={() => onQuickStatus(job)}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>อัปเดต</span>
                                </button>
                              )}

                              {onViewTicket && (
                                <button
                                  type="button"
                                  onClick={() => onViewTicket(job)}
                                  className="p-1.5 bg-[#eae4db] hover:bg-[#ded7cc] text-[#4a4036] rounded-lg transition-all cursor-pointer"
                                  title="ดูใบสั่งงาน"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}

                              {onEditJob && (
                                <button
                                  type="button"
                                  onClick={() => onEditJob(job)}
                                  className="p-1.5 bg-[#eae4db] hover:bg-[#ded7cc] text-[#4a4036] rounded-lg transition-all cursor-pointer"
                                  title="แก้ไขข้อมูล"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Multi-Technician Workload Matrix (Overview of all technicians) */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-[#2c241c] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-700" />
                      <span>ภาพรวมสถานะ & ภาระงานช่าง ({filteredTechnicians.length} จาก {technicianCounts.total} ท่าน)</span>
                    </h3>
                    <p className="text-xs text-[#7d7265]">
                      แสดงเฉพาะงานที่กำลังทำ (Active Jobs) • แสดงสถานะช่างคิวว่างตามจริง ({technicianCounts.available} ท่าน) • คลิกที่การ์ดเพื่อดูคิวงาน
                    </p>
                  </div>

                  {statusFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className="self-start sm:self-auto text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                    >
                      ล้างตัวกรอง (ดูช่างทั้งหมด)
                    </button>
                  )}
                </div>

                {filteredTechnicians.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#ded7cc] p-12 text-center space-y-3 shadow-xs">
                    <UserX className="w-12 h-12 text-[#9e9384] mx-auto" />
                    <h4 className="font-bold text-sm text-[#2c241c]">
                      {statusFilter === 'AVAILABLE'
                        ? 'ขณะนี้ไม่มีช่างที่คิวว่าง (ช่างทุกคนมีงานค้างในมือ)'
                        : searchTerm
                        ? `ไม่พบชื่อช่างที่ตรงกับคำค้นหา "${searchTerm}"`
                        : 'ไม่พบช่างที่ตรงกับเงื่อนไขที่เลือก'}
                    </h4>
                    <p className="text-xs text-[#7d7265]">ลองเลือกตัวกรองอื่น หรือกดปุ่ม "ดูช่างทั้งหมด"</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedTech('ALL');
                        setStatusFilter('ALL');
                      }}
                      className="px-4 py-2 bg-[#4a4036] hover:bg-[#382f26] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      แสดงช่างทั้งหมด
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTechnicians.map((tech) => {
                      const isFree = !tech.isUnassigned && tech.totalJobs === 0;

                      return (
                        <div
                          key={tech.name}
                          onClick={() => setSelectedTech(tech.name)}
                          className={`bg-white rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-md flex flex-col justify-between ${
                            tech.isUnassigned
                              ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                              : isFree
                              ? 'border-emerald-300 bg-emerald-50/25 hover:border-emerald-500 hover:bg-emerald-50/40'
                              : tech.status === 'OVERLOADED'
                              ? 'border-rose-400 bg-rose-50/10 hover:border-rose-500'
                              : tech.status === 'BUSY'
                              ? 'border-amber-400 hover:border-amber-500'
                              : 'border-[#ded7cc] hover:border-[#b5aba0]'
                          }`}
                        >
                          <div>
                            {/* Header of Technician Card */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-2xs ${
                                  tech.isUnassigned
                                    ? 'bg-rose-100 text-rose-800'
                                    : isFree
                                    ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400 animate-pulse'
                                    : tech.activeJobs > 0
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-blue-100 text-blue-900'
                                }`}>
                                  {tech.isUnassigned ? '⚠️' : isFree ? '🟢' : tech.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className={`text-sm font-black flex items-center gap-1.5 ${
                                    isFree ? 'text-emerald-600 animate-pulse font-extrabold' : 'text-[#2c241c] hover:text-amber-800'
                                  }`}>
                                    <span>{tech.name}</span>
                                    {isFree && (
                                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold not-italic animate-none">
                                        สถานะ: ว่าง
                                      </span>
                                    )}
                                  </h4>
                                  <span className={`text-[11px] ${isFree ? 'text-emerald-800 font-bold' : 'text-[#7d7265]'}`}>
                                    {tech.isUnassigned
                                      ? 'รอมอบหมาย'
                                      : isFree
                                      ? '🟢 ว่างรอรับงาน (ไม่มีในแผน & ไม่มีงานทำ)'
                                      : `งานค้างในมือ ${tech.totalJobs} งาน`}
                                  </span>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                tech.isUnassigned
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : isFree
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400 ring-2 ring-emerald-400/40 font-black flex items-center gap-1.5 animate-pulse shadow-2xs'
                                  : tech.status === 'OVERLOADED'
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : tech.status === 'BUSY'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : tech.activeJobs > 0
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}>
                                {tech.isUnassigned
                                  ? '⚠️ รอมอบหมาย'
                                  : isFree
                                  ? (
                                    <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                      <span>🟢 สถานะ: ว่าง</span>
                                    </>
                                  )
                                  : tech.status === 'OVERLOADED'
                                  ? '🔥 คิวแน่น'
                                  : tech.status === 'BUSY'
                                  ? '🟡 มีงานทำ'
                                  : tech.activeJobs > 0
                                  ? '⚙️ 1 งาน'
                                  : '🟢 สถานะ: ว่าง'}
                              </span>
                            </div>

                            {/* Free Technician Highlight Box */}
                            {isFree ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 text-xs flex items-center gap-2.5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div>
                                  <span className="font-black text-emerald-950 block">ไม่มีรายชื่อในแผนงาน และไม่มีงานกำลังดำเนินการ</span>
                                  <span className="text-[11px] text-emerald-850 font-medium">สถานะว่างรอรับงาน 100% (พร้อมรับงานใหม่ได้ทันที)</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Workload Progress Bar */}
                                <div className="space-y-1 mb-3">
                                  <div className="flex justify-between text-[11px] font-bold text-[#685e52]">
                                    <span>ภาระงานในมือ</span>
                                    <span>{tech.activeJobs} งานกำลังทำ</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div
                                      style={{ width: `${Math.min(100, (tech.activeJobs / 5) * 100)}%` }}
                                      className={`h-full rounded-full transition-all ${
                                        tech.activeJobs >= 4 ? 'bg-rose-500' : tech.activeJobs >= 2 ? 'bg-amber-500' : 'bg-blue-500'
                                      }`}
                                    />
                                  </div>
                                </div>

                                {/* Stats Grid (Ongoing only) */}
                                <div className="grid grid-cols-3 gap-1.5 text-center text-xs mb-3 bg-[#fbf9f5] p-2 rounded-xl border border-[#ede9e1]">
                                  <div>
                                    <span className="text-[10px] text-[#7d7265] block">กำลังทำ</span>
                                    <span className="font-black text-blue-700">{tech.activeJobs}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#7d7265] block">งานด่วน</span>
                                    <span className="font-black text-rose-700">{tech.urgentJobs}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#7d7265] block">รอตรวจ QC</span>
                                    <span className="font-black text-purple-700">{tech.waitingQcJobs}</span>
                                  </div>
                                </div>

                                {/* Top 2 Active Tasks in Queue preview */}
                                {tech.jobs.filter((j) => getJobWorkflowStatus(j).code === 'IN_PROGRESS').length > 0 && (
                                  <div className="space-y-1 mb-3 text-[11px]">
                                    <span className="text-[10px] font-bold text-[#7d7265] uppercase">
                                      งานที่กำลังดำเนินการ:
                                    </span>
                                    {tech.jobs
                                      .filter((j) => getJobWorkflowStatus(j).code === 'IN_PROGRESS')
                                      .slice(0, 2)
                                      .map((j) => (
                                        <div
                                          key={j.id}
                                          className="bg-white border border-[#ded7cc] p-1.5 rounded-lg flex items-center justify-between gap-1 text-slate-800"
                                        >
                                          <span className="font-bold truncate text-[#2c241c]">{j.customer} ({j.saleSoNo || j.id})</span>
                                          <span className="text-[10px] text-amber-800 font-bold shrink-0">
                                            คืน {formatDateDisplay(j.estimatedReturnDate) || '-'}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Card Bottom CTA */}
                          <div className={`pt-2 border-t flex items-center justify-between text-xs font-bold ${
                            isFree
                              ? 'border-emerald-200 text-emerald-800 hover:text-emerald-950'
                              : 'border-[#ded7cc] text-amber-800 hover:text-amber-900'
                          }`}>
                            <span>{isFree ? 'คลิกดูรายละเอียดช่าง' : `คลิกดูคิวงาน ${tech.name}`}</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Technician Roster Management Modal */}
      <TechnicianManagementModal
        isOpen={isManageModalOpen}
        jobs={jobs}
        onClose={() => setIsManageModalOpen(false)}
        onSelectTechnician={(name) => {
          setSelectedTech(name);
          setSearchTerm('');
          setViewMode('queue');
        }}
        onBatchRenameJobTechnician={onBatchRenameJobTechnician}
      />
    </div>
  );
};
