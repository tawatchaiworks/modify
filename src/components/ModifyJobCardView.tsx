import React from 'react';
import {
  Calendar,
  Clock,
  User,
  Building,
  Hash,
  Truck,
  Wrench,
  CheckCircle2,
  XCircle,
  Printer,
  Edit,
  Trash2,
  Layers,
  ChevronRight,
  Palette,
  Play,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  formatDateDisplay,
  detectIsPaintingJob,
  calculateWorkingDaysElapsed,
  getUrgencyDisplay,
} from '../utils/formatters';

interface ModifyJobCardViewProps {
  jobs: ModifyJobItem[];
  onEdit: (job: ModifyJobItem) => void;
  onQuickStatus: (job: ModifyJobItem) => void;
  onStartWork?: (job: ModifyJobItem) => void;
  onViewTicket: (job: ModifyJobItem) => void;
  onDelete: (job: ModifyJobItem) => void;
  onAddNew: () => void;
}

export const ModifyJobCardView: React.FC<ModifyJobCardViewProps> = ({
  jobs,
  onEdit,
  onQuickStatus,
  onStartWork,
  onViewTicket,
  onDelete,
  onAddNew,
}) => {
  if (jobs.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-slate-500 text-sm font-medium">ยังไม่มีรายการคำของาน Modify</p>
        <button
          onClick={onAddNew}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          + สร้างคำขอ Modify ใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => {
        const completedLines = (job.workDetails || []).filter((l) => l && l.trim()).length;

        return (
          <div
            key={job.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
          >
            {/* Card Header */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-blue-700 block">
                    {job.id}
                  </span>
                  {(() => {
                    const urgency = getUrgencyDisplay(job.urgencyLevel);
                    if (urgency.level === 'VERY_URGENT') {
                      return (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                          <span>🚨</span>
                          <span>ด่วนมาก</span>
                        </span>
                      );
                    }
                    if (urgency.level === 'URGENT') {
                      return (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                          <span>⚡</span>
                          <span>ด่วน</span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {job.requestDate ? formatDateDisplay(job.requestDate) : '-'} {job.requestTime ? `(${job.requestTime} น.)` : ''}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => onQuickStatus(job)}
                  title="คลิกเพื่อเปลี่ยนสถานะงาน"
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
                    job.finishStatus === 'FINISH'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-600/20'
                      : job.finishStatus === 'IN_PROGRESS' || job.engineerHandoverDate
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : job.finishStatus === 'CANCELLED'
                      ? 'bg-slate-400 hover:bg-slate-500 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {job.finishStatus === 'FINISH' ? '✓ FINISH' : job.finishStatus}
                </button>
                {(() => {
                  const isComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                  const isEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                  const label = isComplete ? 'COMPLETE' : isEdit ? 'EDIT' : (job.inspectionResult || 'WAITING');
                  return (
                    <button
                      type="button"
                      onClick={() => onQuickStatus(job)}
                      title="คลิกเพื่อเปลี่ยนผลการตรวจ QC (WAITING / COMPLETE / EDIT)"
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                        isComplete
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                          : isEdit
                          ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                      }`}
                    >
                      QC: {label}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4 space-y-3 flex-1 text-xs">
              {/* Customer & SO */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{job.customer || '-'}</h4>
                <div className="flex items-center gap-2 mt-1 text-slate-500">
                  {job.saleSoNo && <span>SO: <strong className="text-slate-700 font-mono">{job.saleSoNo}</strong></span>}
                  {job.project && <span className="truncate">| Proj: {job.project}</span>}
                </div>
              </div>

              {/* Modify Details */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 block mb-0.5">
                  รายละเอียดที่ให้ Modify:
                </span>
                <p className="text-slate-600 line-clamp-2 leading-relaxed">
                  {job.modifyDetails || '- ไม่มีรายละเอียด -'}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span>จำนวน: <strong className="text-blue-700">{job.quantity || '1'}</strong></span>
                    {(job.workType === 'PAINTING' || detectIsPaintingJob(job.modifyDetails)) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[9px]">
                        <Palette className="w-2.5 h-2.5" />
                        <span>ทำสี</span>
                      </span>
                    )}
                  </div>
                  <span>10 บรรทัด: <strong className="text-emerald-700">{completedLines}/10 ข้อ</strong></span>
                </div>
              </div>

              {/* Handover / Start & Return Dates */}
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">วันเริ่มงาน Engineer:</span>
                  {job.engineerHandoverDate ? (
                    <strong className="text-blue-900 font-bold bg-blue-100/70 px-1.5 py-0.5 rounded">
                      {formatDateDisplay(job.engineerHandoverDate)}
                    </strong>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors"
                    >
                      <Play className="w-2.5 h-2.5 fill-amber-800" />
                      <span>กดเริ่มงาน</span>
                    </button>
                  )}
                </div>

                {job.engineerHandoverDate && job.finishStatus !== 'FINISH' && (
                  <div className="flex items-center justify-between text-[10px] text-amber-800 font-medium">
                    <span>ระยะเวลาดำเนินการ:</span>
                    <span>ทำมาแล้ว {calculateWorkingDaysElapsed(job.engineerHandoverDate)} วันทำการ</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                  <span className="text-slate-500">ประมาณการส่งมอบคืน:</span>
                  <strong className="text-amber-800 font-bold">
                    {job.estimatedReturnDate ? formatDateDisplay(job.estimatedReturnDate) : '-'}
                  </strong>
                </div>
              </div>

              {/* Technician and Requester */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="truncate max-w-[140px]">
                  ช่าง: <strong className="text-slate-800">{job.technician || '-'}</strong>
                </span>
                <span className="truncate max-w-[140px]">
                  ผู้ขอ: <strong className="text-slate-700">{job.requester || '-'}</strong>
                </span>
              </div>
            </div>

            {/* Card Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onViewTicket(job)}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบสั่งงาน</span>
              </button>

              <div className="flex items-center gap-1">
                {job.finishStatus !== 'FINISH' && (
                  <button
                    type="button"
                    onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                    title="เริ่มปฏิบัติงาน / เลือกวันเริ่มงาน"
                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4 fill-amber-600" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onQuickStatus(job)}
                  title="อัปเดตสถานะเร็ว"
                  className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Wrench className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(job)}
                  title="แก้ไขข้อมูลทั้งหมด"
                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(job)}
                  title="ลบ"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
