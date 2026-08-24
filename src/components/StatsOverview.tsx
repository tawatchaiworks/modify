import React from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ClipboardList,
  AlertCircle,
  Printer,
  Award,
  BarChart3,
  Calendar,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  formatDateDisplay,
  calculateEstimatedCompletion,
  getCurrentDateFormatted,
  normalizeToISODate,
} from '../utils/formatters';

interface StatsOverviewProps {
  jobs: ModifyJobItem[];
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  onPrintStatusReport?: (status: string) => void;
  onOpenKpi?: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  jobs,
  selectedFilter,
  onSelectFilter,
  onPrintStatusReport,
  onOpenKpi,
}) => {
  const total = jobs.length;
  const finished = jobs.filter((j) => j.finishStatus === 'FINISH').length;
  const inProgress = jobs.filter(
    (j) =>
      j.finishStatus === 'IN_PROGRESS' ||
      (Boolean(jobHandover(j)) && j.finishStatus !== 'FINISH' && j.finishStatus !== 'CANCELLED')
  ).length;
  const completedQc = jobs.filter((j) => j.inspectionResult === 'COMPLETE' || j.inspectionResult === 'PASS').length;
  const editQc = jobs.filter((j) => j.inspectionResult === 'EDIT' || j.inspectionResult === 'REJECT').length;
  const waitingQc = jobs.filter(
    (j) => j.inspectionResult === 'WAITING' || j.inspectionResult === 'PENDING' || !j.inspectionResult
  ).length;
  const withEngineerDate = jobs.filter((j) => Boolean(j.engineerHandoverDate) && j.finishStatus !== 'FINISH').length;

  function jobHandover(j: ModifyJobItem) {
    return j.engineerHandoverDate;
  }

  const getJobEstimatedDateISO = (item: ModifyJobItem): string => {
    if (item.estimatedReturnDate && item.estimatedReturnDate.trim() !== '' && item.estimatedReturnDate !== '-') {
      const iso = normalizeToISODate(item.estimatedReturnDate);
      if (iso) return iso;
    }
    const baseDate = item.engineerHandoverDate || item.requestDate || item.createdAt || getCurrentDateFormatted();
    const calc = calculateEstimatedCompletion(
      baseDate,
      item.quantity || 1,
      item.workTypes || item.workType || 'GENERAL'
    );
    return calc.calculatedDate;
  };

  // Group active/pending jobs by estimated return date
  const todayISO = getCurrentDateFormatted();
  const activeJobs = jobs.filter((j) => j.finishStatus !== 'FINISH' && j.finishStatus !== 'CANCELLED');

  const estimatedDateGroups = React.useMemo(() => {
    const map = new Map<string, ModifyJobItem[]>();
    activeJobs.forEach((job) => {
      const dateISO = getJobEstimatedDateISO(job);
      if (!map.has(dateISO)) {
        map.set(dateISO, []);
      }
      map.get(dateISO)!.push(job);
    });

    const sortedKeys = Array.from(map.keys()).sort();
    return sortedKeys.map((dateISO) => ({
      dateISO,
      formattedDate: formatDateDisplay(dateISO),
      jobs: map.get(dateISO)!,
      isOverdue: dateISO < todayISO,
      isToday: dateISO === todayISO,
    }));
  }, [activeJobs, todayISO]);

  const statCards = [
    {
      id: 'ALL',
      title: 'งานทั้งหมด',
      count: total,
      icon: ClipboardList,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      activeColor: 'ring-2 ring-blue-600 bg-blue-50/80',
    },
    {
      id: 'IN_PROGRESS',
      title: 'รอดำเนินการ / กับ Engineer',
      count: inProgress,
      subtext: `${withEngineerDate} รายการระบุวันเริ่มงานแล้ว`,
      icon: Wrench,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      activeColor: 'ring-2 ring-amber-600 bg-amber-50/80',
    },
    {
      id: 'COMPLETE',
      title: 'ตรวจผ่าน (COMPLETE)',
      count: completedQc,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activeColor: 'ring-2 ring-emerald-600 bg-emerald-50/80',
    },
    {
      id: 'EDIT',
      title: 'ส่งกลับแก้ไข (EDIT)',
      count: editQc,
      icon: XCircle,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      activeColor: 'ring-2 ring-rose-600 bg-rose-50/80',
    },
    {
      id: 'FINISH',
      title: 'เสร็จสมบูรณ์ (FINISH)',
      count: finished,
      icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activeColor: 'ring-2 ring-indigo-600 bg-indigo-50/80',
    },
  ];

  const evaluatedQc = completedQc + editQc;
  const qcPassRate = evaluatedQc > 0 ? Math.round((completedQc / evaluatedQc) * 100) : 100;
  const completionRate = total > 0 ? Math.round((finished / total) * 100) : 0;

  return (
    <div className="space-y-3 mb-6">
      {/* 5 Main Stat Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isActive = selectedFilter === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => onSelectFilter(stat.id)}
              className={`p-3.5 rounded-2xl border transition-all text-left bg-white shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between group relative ${
                isActive ? stat.activeColor : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 line-clamp-1">{stat.title}</span>
                <div className="flex items-center gap-1">
                  {onPrintStatusReport && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintStatusReport(stat.id);
                      }}
                      title={`Print Preview ขนาด A4 รายงานสถานะ: ${stat.title}`}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className={`p-1.5 rounded-xl border ${stat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">{stat.count}</span>
                  {stat.subtext && (
                    <span className="block text-[11px] text-slate-500 mt-0.5">{stat.subtext}</span>
                  )}
                </div>
                <span className="text-[10px] text-blue-600 font-medium group-hover:underline">
                  คลิกกรอง
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated Delivery Dates Summary Panel (การประมาณการส่งมอบคืนวันที่) */}
      {estimatedDateGroups.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 border border-amber-200/90 rounded-2xl shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/70">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500 text-white font-bold shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span>ประมาณการส่งมอบคืนวันที่ (Estimated Delivery Schedule)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900 border border-amber-300">
                    {activeJobs.length} งานรอส่งมอบ
                  </span>
                </h3>
                <p className="text-[11px] text-amber-800">
                  กำหนดส่งมอบคืนที่คำนวณตามเกณฑ์วันทำการและจำนวนชิ้นงานของแต่ละรายการ
                </p>
              </div>
            </div>
          </div>

          {/* Date Chips Row */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {estimatedDateGroups.map((group) => {
              const soNumbers = group.jobs
                .map((j) => j.saleSoNo || j.customer || j.id)
                .filter(Boolean)
                .slice(0, 2)
                .join(', ');
              const remaining = group.jobs.length - 2;

              return (
                <div
                  key={group.dateISO}
                  className={`shrink-0 px-3 py-2 rounded-xl border text-xs transition-all flex flex-col gap-1 ${
                    group.isOverdue
                      ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-2xs'
                      : group.isToday
                      ? 'bg-amber-100/90 border-amber-400 text-amber-950 ring-2 ring-amber-400/40 shadow-2xs'
                      : 'bg-white border-amber-200/80 text-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold flex items-center gap-1">
                      {group.isOverdue && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                      <span className="text-slate-900">{group.formattedDate}</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                        group.isOverdue
                          ? 'bg-rose-200 text-rose-900'
                          : group.isToday
                          ? 'bg-amber-300 text-amber-950'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {group.jobs.length} งาน
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-600 truncate max-w-[170px]" title={group.jobs.map((j) => `${j.saleSoNo || j.id} (${j.customer})`).join(', ')}>
                    {group.isOverdue ? (
                      <span className="text-rose-700 font-semibold">⚠️ เกินกำหนดส่งมอบ</span>
                    ) : group.isToday ? (
                      <span className="text-amber-800 font-bold">⚡ ครบกำหนดวันนี้</span>
                    ) : (
                      <span>SO: {soNumbers}{remaining > 0 ? ` +${remaining}` : ''}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick KPI Strip */}
      {onOpenKpi && (
        <div
          onClick={onOpenKpi}
          className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-blue-900/60 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>KPI สมรรถนะช่าง & อัตราความสำเร็จ:</span>
                <span className="text-emerald-400 font-black">QC Pass {qcPassRate}%</span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-300">เสร็จสมบูรณ์ {completionRate}%</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200 group-hover:text-white font-medium flex items-center gap-1">
              <span>เปิดแดชบอร์ด KPI รายบุคคล & กราฟวิเคราะห์</span>
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
