import React, { useState, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  UserCheck,
  Calendar,
  Filter,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Flame,
  Star,
  Users,
  Search,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { ModifyJobItem } from '../types';
import { formatDateDisplay } from '../utils/formatters';

interface TechnicianKpiDashboardProps {
  jobs: ModifyJobItem[];
  onSelectJob?: (job: ModifyJobItem) => void;
  onEditJob?: (job: ModifyJobItem) => void;
}

export interface TechnicianMetric {
  name: string;
  totalJobs: number;
  finishedJobs: number;
  inProgressJobs: number;
  passQcJobs: number;
  editQcJobs: number;
  waitingQcJobs: number;
  urgentJobs: number;
  onTimeJobs: number;
  lateJobs: number;
  totalQuantity: number;
  passRate: number; // % (0-100)
  onTimeRate: number; // % (0-100)
  completionRate: number; // % (0-100)
  avgTurnaroundDays: number;
  performanceScore: number; // (0-100)
  grade: 'S' | 'A+' | 'A' | 'B' | 'C';
  jobsList: ModifyJobItem[];
}

export const TechnicianKpiDashboard: React.FC<TechnicianKpiDashboardProps> = ({
  jobs,
  onSelectJob,
  onEditJob,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedTechnicianName, setSelectedTechnicianName] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'charts' | 'details'>('leaderboard');
  const [isPrintKpiOpen, setIsPrintKpiOpen] = useState(false);

  // Available Months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    jobs.forEach((j) => {
      if (j.requestMonth) months.add(j.requestMonth);
      else if (j.requestDate) {
        const d = new Date(j.requestDate);
        if (!isNaN(d.getTime())) {
          months.add(
            d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
          );
        }
      }
    });
    return Array.from(months);
  }, [jobs]);

  // Filter jobs based on filter criteria
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Month filter
      if (selectedMonth !== 'ALL') {
        const jobMonth =
          job.requestMonth ||
          (job.requestDate
            ? new Date(job.requestDate).toLocaleDateString('th-TH', {
                month: 'long',
                year: 'numeric',
              })
            : '');
        if (jobMonth !== selectedMonth) return false;
      }

      // Urgency filter
      if (selectedUrgency !== 'ALL') {
        const u = job.urgencyLevel || 'NORMAL';
        if (u !== selectedUrgency) return false;
      }

      // Technician filter
      if (selectedTechnicianName !== 'ALL') {
        const tech = (job.technician || 'ยังไม่ระบุช่าง').trim();
        if (tech !== selectedTechnicianName) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = job.id?.toLowerCase().includes(q);
        const matchCustomer = job.customer?.toLowerCase().includes(q);
        const matchProject = job.project?.toLowerCase().includes(q);
        const matchTech = job.technician?.toLowerCase().includes(q);
        const matchModify = job.modifyDetails?.toLowerCase().includes(q);
        if (!matchId && !matchCustomer && !matchProject && !matchTech && !matchModify) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, selectedMonth, selectedUrgency, selectedTechnicianName, searchQuery]);

  // Calculate Turnaround Days
  const getTurnaroundDays = (job: ModifyJobItem): number | null => {
    const startStr = job.engineerHandoverDate || job.requestDate;
    const endStr = job.inspectionDate || job.finishDate;
    if (!startStr || !endStr) return null;
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  // Check if job was completed on time
  const isJobOnTime = (job: ModifyJobItem): boolean | null => {
    if (!job.estimatedReturnDate) return null;
    const actualEndStr = job.inspectionDate || job.finishDate;
    if (!actualEndStr) {
      // If not finished yet, check if today is past estimated date
      const estDate = new Date(job.estimatedReturnDate);
      if (isNaN(estDate.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today <= estDate;
    }
    const estDate = new Date(job.estimatedReturnDate);
    const actualDate = new Date(actualEndStr);
    if (isNaN(estDate.getTime()) || isNaN(actualDate.getTime())) return null;
    return actualDate <= estDate;
  };

  // Group and Calculate KPI per Technician
  const technicianMetrics = useMemo((): TechnicianMetric[] => {
    const techMap = new Map<string, ModifyJobItem[]>();

    filteredJobs.forEach((job) => {
      const techName = (job.technician && job.technician.trim()) || 'ยังไม่ระบุช่าง';
      if (!techMap.has(techName)) {
        techMap.set(techName, []);
      }
      techMap.get(techName)!.push(job);
    });

    const metrics: TechnicianMetric[] = [];

    techMap.forEach((techJobs, name) => {
      const totalJobs = techJobs.length;
      const finishedJobs = techJobs.filter((j) => j.finishStatus === 'FINISH').length;
      const inProgressJobs = techJobs.filter(
        (j) => j.finishStatus === 'IN_PROGRESS' || (!j.finishStatus && j.engineerHandoverDate)
      ).length;

      const passQcJobs = techJobs.filter(
        (j) => j.inspectionResult === 'COMPLETE' || j.inspectionResult === 'PASS'
      ).length;
      const editQcJobs = techJobs.filter(
        (j) => j.inspectionResult === 'EDIT' || j.inspectionResult === 'REJECT'
      ).length;
      const waitingQcJobs = techJobs.filter(
        (j) =>
          j.inspectionResult === 'WAITING' ||
          j.inspectionResult === 'PENDING' ||
          !j.inspectionResult
      ).length;

      const urgentJobs = techJobs.filter(
        (j) => j.urgencyLevel === 'URGENT' || j.urgencyLevel === 'VERY_URGENT'
      ).length;

      // On-time calculation
      let onTimeCount = 0;
      let lateCount = 0;
      let evaluatedCount = 0;

      techJobs.forEach((j) => {
        const onTime = isJobOnTime(j);
        if (onTime === true) onTimeCount++;
        else if (onTime === false) lateCount++;
        if (onTime !== null) evaluatedCount++;
      });

      // Turnaround days calculation
      let totalDays = 0;
      let validDaysCount = 0;
      techJobs.forEach((j) => {
        const days = getTurnaroundDays(j);
        if (days !== null) {
          totalDays += days;
          validDaysCount++;
        }
      });

      const avgTurnaroundDays =
        validDaysCount > 0 ? Number((totalDays / validDaysCount).toFixed(1)) : 0;

      // Quantity calculation
      let totalQuantity = 0;
      techJobs.forEach((j) => {
        if (typeof j.quantity === 'number') {
          totalQuantity += j.quantity;
        } else if (typeof j.quantity === 'string') {
          const parsed = parseFloat(j.quantity.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) totalQuantity += parsed;
          else totalQuantity += 1;
        } else {
          totalQuantity += 1;
        }
      });

      // Pass Rate % (Only for jobs that have undergone QC)
      const inspectedTotal = passQcJobs + editQcJobs;
      const passRate =
        inspectedTotal > 0 ? Math.round((passQcJobs / inspectedTotal) * 100) : 100;

      // On-Time Rate %
      const onTimeRate =
        evaluatedCount > 0 ? Math.round((onTimeCount / evaluatedCount) * 100) : 100;

      // Completion Rate %
      const completionRate =
        totalJobs > 0 ? Math.round((finishedJobs / totalJobs) * 100) : 0;

      // Overall Performance Score (0 - 100)
      // Formula: Pass Rate (45%) + On-Time Rate (35%) + Completion Rate (20%)
      const performanceScore = Math.round(
        passRate * 0.45 + onTimeRate * 0.35 + completionRate * 0.2
      );

      // Grade assignment
      let grade: 'S' | 'A+' | 'A' | 'B' | 'C' = 'C';
      if (performanceScore >= 95) grade = 'S';
      else if (performanceScore >= 85) grade = 'A+';
      else if (performanceScore >= 75) grade = 'A';
      else if (performanceScore >= 60) grade = 'B';
      else grade = 'C';

      metrics.push({
        name,
        totalJobs,
        finishedJobs,
        inProgressJobs,
        passQcJobs,
        editQcJobs,
        waitingQcJobs,
        urgentJobs,
        onTimeJobs: onTimeCount,
        lateJobs: lateCount,
        totalQuantity,
        passRate,
        onTimeRate,
        completionRate,
        avgTurnaroundDays,
        performanceScore,
        grade,
        jobsList: techJobs,
      });
    });

    // Sort by performance score descending
    return metrics.sort((a, b) => {
      // Keep "ยังไม่ระบุช่าง" at the end if score matches
      if (a.name === 'ยังไม่ระบุช่าง') return 1;
      if (b.name === 'ยังไม่ระบุช่าง') return -1;
      return b.performanceScore - a.performanceScore || b.totalJobs - a.totalJobs;
    });
  }, [filteredJobs]);

  // Overall Global KPI Metrics
  const overallKpi = useMemo(() => {
    const total = filteredJobs.length;
    const finished = filteredJobs.filter((j) => j.finishStatus === 'FINISH').length;
    const inProgress = filteredJobs.filter(
      (j) => j.finishStatus === 'IN_PROGRESS' || (!j.finishStatus && j.engineerHandoverDate)
    ).length;
    const passQc = filteredJobs.filter(
      (j) => j.inspectionResult === 'COMPLETE' || j.inspectionResult === 'PASS'
    ).length;
    const editQc = filteredJobs.filter(
      (j) => j.inspectionResult === 'EDIT' || j.inspectionResult === 'REJECT'
    ).length;
    const waitingQc = filteredJobs.filter(
      (j) =>
        j.inspectionResult === 'WAITING' ||
        j.inspectionResult === 'PENDING' ||
        !j.inspectionResult
    ).length;

    const inspectedCount = passQc + editQc;
    const passRate =
      inspectedCount > 0 ? Math.round((passQc / inspectedCount) * 100) : 100;

    let onTimeCount = 0;
    let evalCount = 0;
    filteredJobs.forEach((j) => {
      const onTime = isJobOnTime(j);
      if (onTime === true) onTimeCount++;
      if (onTime !== null) evalCount++;
    });
    const onTimeRate = evalCount > 0 ? Math.round((onTimeCount / evalCount) * 100) : 100;
    const completionRate = total > 0 ? Math.round((finished / total) * 100) : 0;

    // FTR (First Time Right) Rate: No EDIT/REJECT
    const ftrRate = total > 0 ? Math.round(((total - editQc) / total) * 100) : 100;

    return {
      total,
      finished,
      inProgress,
      passQc,
      editQc,
      waitingQc,
      passRate,
      onTimeRate,
      completionRate,
      ftrRate,
    };
  }, [filteredJobs]);

  // Chart Data: Technician Comparison (Bar Chart)
  const barChartData = useMemo(() => {
    return technicianMetrics
      .filter((m) => m.name !== 'ยังไม่ระบุช่าง')
      .slice(0, 8)
      .map((m) => ({
        name: m.name.length > 15 ? m.name.substring(0, 13) + '..' : m.name,
        fullName: m.name,
        'ผ่าน QC (Pass)': m.passQcJobs,
        'ส่งแก้ (Edit)': m.editQcJobs,
        'กำลังทำ (Progress)': m.inProgressJobs,
        'คะแนน KPI (%)': m.performanceScore,
      }));
  }, [technicianMetrics]);

  // Chart Data: QC Status Breakdown (Pie Chart)
  const qcPieData = useMemo(() => {
    return [
      { name: 'ผ่านการตรวจ (PASS)', value: overallKpi.passQc, color: '#10b981' },
      { name: 'ส่งกลับแก้ไข (EDIT)', value: overallKpi.editQc, color: '#f43f5e' },
      { name: 'รอการตรวจสอบ (WAITING)', value: overallKpi.waitingQc, color: '#f59e0b' },
    ].filter((item) => item.value > 0);
  }, [overallKpi]);

  // Chart Data: Overall Status Breakdown
  const statusPieData = useMemo(() => {
    return [
      { name: 'เสร็จสมบูรณ์ (FINISH)', value: overallKpi.finished, color: '#3b82f6' },
      { name: 'กำลังดำเนินการ (IN PROGRESS)', value: overallKpi.inProgress, color: '#f59e0b' },
      {
        name: 'รอดำเนินการ (PENDING)',
        value: overallKpi.total - overallKpi.finished - overallKpi.inProgress,
        color: '#94a3b8',
      },
    ].filter((item) => item.value > 0);
  }, [overallKpi]);

  // Grade Badge Helper
  const renderGradeBadge = (grade: 'S' | 'A+' | 'A' | 'B' | 'C') => {
    const styles: Record<string, string> = {
      S: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-xs',
      'A+': 'bg-emerald-600 text-white font-bold',
      A: 'bg-blue-600 text-white font-bold',
      B: 'bg-indigo-600 text-white font-semibold',
      C: 'bg-slate-600 text-white font-semibold',
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-lg text-xs tracking-wider inline-flex items-center gap-1 ${
          styles[grade] || 'bg-slate-500 text-white'
        }`}
      >
        {grade === 'S' && <Star className="w-3 h-3 fill-current" />}
        <span>เกรด {grade}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200/60 shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-black text-xs tracking-wider">
                  LUMENCRAFT
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  แดชบอร์ด KPI การทำงานของช่างและอัตราความสำเร็จ
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Real-time Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                LUMENCRAFT • วิเคราะห์ผลงาน, อัตราความสำเร็จ (QC Pass Rate), การส่งงานตรงเวลา และคะแนนสมรรถนะช่าง
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switch Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ตารางคะแนนช่าง</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('charts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'charts'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>กราฟวิเคราะห์</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'details'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>รายการงานใน KPI</span>
              </button>
            </div>

            {/* Print KPI Report Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / PDF รายงาน KPI</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
          {/* Month Select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">เดือน:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="กรองข้อมูลตามเดือนที่ขอเปิดงาน"
              className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">ทุกเดือน ({jobs.length} งาน)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency Select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500 font-medium">ความเร่งด่วน:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              aria-label="กรองข้อมูลตามระดับความเร่งด่วน"
              className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">ทุกระดับ</option>
              <option value="NORMAL">งานปกติ</option>
              <option value="URGENT">งานด่วน ⚡</option>
              <option value="VERY_URGENT">งานด่วนมาก 🔥</option>
            </select>
          </div>

          {/* Specific Technician Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Wrench className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-slate-500 font-medium">เลือกช่าง:</span>
            <select
              value={selectedTechnicianName}
              onChange={(e) => setSelectedTechnicianName(e.target.value)}
              aria-label="กรองข้อมูลตามช่างผู้รับผิดชอบ"
              className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">ช่างทุกคน ({technicianMetrics.length} คน)</option>
              {technicianMetrics.map((tech) => (
                <option key={tech.name} value={tech.name}>
                  {tech.name} ({tech.totalJobs} งาน)
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาช่าง, รหัสงาน, ลูกค้า, รายละเอียด..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
            />
          </div>

          {(selectedMonth !== 'ALL' ||
            selectedUrgency !== 'ALL' ||
            selectedTechnicianName !== 'ALL' ||
            searchQuery.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('ALL');
                setSelectedUrgency('ALL');
                setSelectedTechnicianName('ALL');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Top 5 High-Impact KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: QC Pass Rate (อัตราความสำเร็จงาน) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">QC Pass Rate</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {overallKpi.passRate}%
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                อัตราความสำเร็จ
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallKpi.passRate}%` }}
              />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>ตรวจผ่าน: <strong className="text-emerald-700">{overallKpi.passQc}</strong></span>
            <span>ส่งแก้: <strong className="text-rose-700">{overallKpi.editQc}</strong></span>
          </div>
        </div>

        {/* Card 2: On-Time Delivery Rate (ส่งงานตรงเวลา) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">On-Time Delivery</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {overallKpi.onTimeRate}%
              </span>
              <span className="text-xs font-bold text-blue-600">ตรงตามกำหนด</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallKpi.onTimeRate}%` }}
              />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>เทียบประมาณการส่งคืน</span>
            <span className="text-blue-700 font-semibold">ส่งทันกำหนด</span>
          </div>
        </div>

        {/* Card 3: Completion Rate (งานเสร็จสิ้น) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Completion Rate</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {overallKpi.completionRate}%
              </span>
              <span className="text-xs font-bold text-indigo-600">
                {overallKpi.finished}/{overallKpi.total} งาน
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallKpi.completionRate}%` }}
              />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>กำลังทำ: <strong className="text-amber-700">{overallKpi.inProgress}</strong></span>
            <span>เสร็จ: <strong className="text-indigo-700">{overallKpi.finished}</strong></span>
          </div>
        </div>

        {/* Card 4: First Time Right (FTR %) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">First-Time Right (FTR)</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {overallKpi.ftrRate}%
              </span>
              <span className="text-xs font-bold text-purple-600">ไม่ติดแก้</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallKpi.ftrRate}%` }}
              />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>ส่งมอบครั้งแรกผ่าน</span>
            <span className="text-purple-700 font-semibold">Zero Defect Rate</span>
          </div>
        </div>

        {/* Card 5: Total Technicians Active */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">ช่างผู้รับผิดชอบ</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {technicianMetrics.length}
              </span>
              <span className="text-xs font-bold text-amber-600">คนในระบบ</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full w-full" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>ช่างที่ได้เกรด A+/S</span>
            <strong className="text-amber-700 font-bold">
              {technicianMetrics.filter((m) => m.grade === 'S' || m.grade === 'A+').length} คน
            </strong>
          </div>
        </div>
      </div>

      {/* Tab 1: Technician Leaderboard Table */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base">ตารางประเมินผลงานและจัดอันดับช่าง (Technician KPI Leaderboard)</h3>
            </div>
            <span className="text-xs text-slate-300">
              ประเมินจาก QC Pass Rate 45% + On-Time 35% + Completion 20%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="py-3 px-4 w-12 text-center">อันดับ</th>
                  <th className="py-3 px-4 min-w-[180px]">ช่างผู้รับผิดชอบ</th>
                  <th className="py-3 px-3 text-center">เกรดผลงาน</th>
                  <th className="py-3 px-3 text-center">คะแนนรวม KPI</th>
                  <th className="py-3 px-3 text-center">จำนวนงานทั้งหมด</th>
                  <th className="py-3 px-3 text-center">เสร็จสิ้น (FINISH)</th>
                  <th className="py-3 px-3 text-center">กำลังทำ</th>
                  <th className="py-3 px-4 text-center">QC Pass Rate</th>
                  <th className="py-3 px-4 text-center">ส่งตรงเวลา</th>
                  <th className="py-3 px-3 text-center">งานด่วน</th>
                  <th className="py-3 px-3 text-center">เฉลี่ย (วัน)</th>
                  <th className="py-3 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicianMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลช่างตามเงื่อนไขตัวกรอง
                    </td>
                  </tr>
                ) : (
                  technicianMetrics.map((tech, idx) => {
                    const isTop1 = idx === 0 && tech.name !== 'ยังไม่ระบุช่าง';
                    const isTop2 = idx === 1 && tech.name !== 'ยังไม่ระบุช่าง';
                    const isTop3 = idx === 2 && tech.name !== 'ยังไม่ระบุช่าง';

                    return (
                      <tr
                        key={tech.name}
                        className={`hover:bg-blue-50/50 transition-colors ${
                          isTop1 ? 'bg-amber-50/40' : idx % 2 === 1 ? 'bg-slate-50/40' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center">
                          {isTop1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs inline-flex items-center justify-center shadow-2xs">
                              🥇
                            </span>
                          ) : isTop2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs inline-flex items-center justify-center">
                              🥈
                            </span>
                          ) : isTop3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700/30 text-amber-900 font-black text-xs inline-flex items-center justify-center">
                              🥉
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-500">#{idx + 1}</span>
                          )}
                        </td>

                        {/* Tech Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block text-sm">
                                {tech.name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {tech.totalQuantity} ชิ้นงานที่รับผิดชอบ
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Grade */}
                        <td className="py-3.5 px-3 text-center">
                          {renderGradeBadge(tech.grade)}
                        </td>

                        {/* KPI Score */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-base font-black text-slate-900">
                              {tech.performanceScore}
                            </span>
                            <span className="text-[10px] text-slate-400">/100</span>
                          </div>
                        </td>

                        {/* Total Jobs */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                          {tech.totalJobs} งาน
                        </td>

                        {/* Finished */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            {tech.finishedJobs}
                          </span>
                        </td>

                        {/* In Progress */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                            {tech.inProgressJobs}
                          </span>
                        </td>

                        {/* QC Pass Rate */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`font-black text-xs ${
                                tech.passRate >= 90
                                  ? 'text-emerald-700'
                                  : tech.passRate >= 70
                                  ? 'text-blue-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {tech.passRate}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (ผ่าน {tech.passQcJobs} / แก้ {tech.editQcJobs})
                            </span>
                          </div>
                        </td>

                        {/* On-Time Rate */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold ${
                              tech.onTimeRate >= 90
                                ? 'text-emerald-700'
                                : tech.onTimeRate >= 75
                                ? 'text-blue-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {tech.onTimeRate}%
                          </span>
                        </td>

                        {/* Urgent */}
                        <td className="py-3.5 px-3 text-center">
                          {tech.urgentJobs > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              {tech.urgentJobs} งาน 🔥
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Turnaround Days */}
                        <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                          {tech.avgTurnaroundDays > 0 ? `${tech.avgTurnaroundDays} วัน` : '-'}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTechnicianName(tech.name);
                              setActiveTab('details');
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-all"
                          >
                            <span>ดูงาน</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Visual Charts & Analytics */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Bar Chart of Technician Performance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  เปรียบเทียบผลงานและสถานะงานของช่าง (Technician Workload & Quality)
                </h3>
                <p className="text-xs text-slate-500">จำนวนงานที่ผ่าน QC, ส่งแก้, และกำลังทำ</p>
              </div>
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="h-72 w-full">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="ผ่าน QC (Pass)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ส่งแก้ (Edit)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="กำลังทำ (Progress)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  ไม่มีข้อมูลสำหรับแสดงกราฟ
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: QC Inspection Result Breakdown (Pie Chart) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  สัดส่วนผลการตรวจสอบคุณภาพ (QC Inspection Results)
                </h3>
                <p className="text-xs text-slate-500">อัตราส่วนงานผ่าน QC เทียบกับงานที่ต้องแก้ไข</p>
              </div>
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="h-72 w-full flex items-center justify-center">
              {qcPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qcPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {qcPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs">ไม่มีข้อมูล QC สำหรับแสดงผล</div>
              )}
            </div>
          </div>

          {/* Chart 3: KPI Score Comparison Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  คะแนนสมรรถนะช่างรายบุคคล (Technician KPI Score 0-100)
                </h3>
                <p className="text-xs text-slate-500">คำนวณถ่วงน้ำหนักตามสูตรมาตรฐานโรงงาน</p>
              </div>
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <div className="h-72 w-full">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="คะแนน KPI (%)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  ไม่มีข้อมูลช่าง
                </div>
              )}
            </div>
          </div>

          {/* Chart 4: Overall Work Status Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  สถานะความคืบหน้ารวมทั้งหมด (Overall Work Progress)
                </h3>
                <p className="text-xs text-slate-500">สัดส่วนงานที่เสร็จสิ้นสมบูรณ์ vs งานที่อยู่ระหว่างทำ</p>
              </div>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div className="h-72 w-full flex items-center justify-center">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs">ไม่มีข้อมูลสถานะ</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Job List under Selected Filter */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base">
                รายการงาน Modify ในกลุ่ม KPI ({filteredJobs.length} รายการ)
              </h3>
            </div>
            {selectedTechnicianName !== 'ALL' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold">
                ช่าง: {selectedTechnicianName}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="p-3 w-28">รหัสงาน</th>
                  <th className="p-3">ลูกค้า / โครงการ</th>
                  <th className="p-3 min-w-[140px]">ช่างผู้ทำ</th>
                  <th className="p-3 text-center">ความเร่งด่วน</th>
                  <th className="p-3 min-w-[200px]">รายละเอียดที่ให้ Modify</th>
                  <th className="p-3">วันที่ส่งมอบ/เริ่ม</th>
                  <th className="p-3">กำหนดส่งคืน</th>
                  <th className="p-3 text-center">ผลตรวจ QC</th>
                  <th className="p-3 text-center">สถานะงาน</th>
                  <th className="p-3 text-center">ตรงเวลา?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      ไม่พบรายการงานตามตัวกรองนี้
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const onTime = isJobOnTime(job);
                    return (
                      <tr key={job.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {job.id}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{job.customer}</span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                            {job.project}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {job.technician || <span className="text-slate-400 font-normal">ยังไม่ระบุ</span>}
                        </td>
                        <td className="p-3 text-center">
                          {job.urgencyLevel === 'VERY_URGENT' ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold border border-red-200">
                              ด่วนมาก 🔥
                            </span>
                          ) : job.urgencyLevel === 'URGENT' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                              ด่วน ⚡
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              ปกติ
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="line-clamp-2 text-slate-700">{job.modifyDetails}</span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {formatDateDisplay(job.engineerHandoverDate)}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {formatDateDisplay(job.estimatedReturnDate)}
                        </td>
                        <td className="p-3 text-center">
                          {job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                              PASS
                            </span>
                          ) : job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
                              EDIT/แก้
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              รอตรวจ
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {job.finishStatus === 'FINISH' ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                              FINISH
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                              IN PROGRESS
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {onTime === true ? (
                            <span className="text-emerald-700 font-bold">✓ ตรงเวลา</span>
                          ) : onTime === false ? (
                            <span className="text-rose-700 font-bold">✗ ล่าช้า</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
