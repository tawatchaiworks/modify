import React from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { ModifyJobItem } from '../types';

interface StatsOverviewProps {
  jobs: ModifyJobItem[];
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  jobs,
  selectedFilter,
  onSelectFilter,
}) => {
  const total = jobs.length;
  const finished = jobs.filter((j) => j.finishStatus === 'FINISH').length;
  const inProgress = jobs.filter(
    (j) =>
      j.finishStatus === 'IN_PROGRESS' ||
      (Boolean(j.engineerHandoverDate) && j.finishStatus !== 'FINISH' && j.finishStatus !== 'CANCELLED')
  ).length;
  const completedQc = jobs.filter((j) => j.inspectionResult === 'COMPLETE' || j.inspectionResult === 'PASS').length;
  const editQc = jobs.filter((j) => j.inspectionResult === 'EDIT' || j.inspectionResult === 'REJECT').length;
  const waitingQc = jobs.filter(
    (j) => j.inspectionResult === 'WAITING' || j.inspectionResult === 'PENDING' || !j.inspectionResult
  ).length;
  const withEngineerDate = jobs.filter((j) => Boolean(j.engineerHandoverDate) && j.finishStatus !== 'FINISH').length;

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
      title: 'กำลังดำเนินการ / กับ Engineer',
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const isActive = selectedFilter === stat.id;
        return (
          <button
            key={stat.id}
            type="button"
            onClick={() => onSelectFilter(stat.id)}
            className={`p-3.5 rounded-2xl border transition-all text-left bg-white shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between ${
              isActive ? stat.activeColor : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 line-clamp-1">{stat.title}</span>
              <div className={`p-1.5 rounded-xl border ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{stat.count}</span>
              {stat.subtext && (
                <span className="block text-[11px] text-slate-500 mt-0.5">{stat.subtext}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
