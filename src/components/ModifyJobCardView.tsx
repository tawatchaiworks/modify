import React, { useState, useMemo } from 'react';
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
  ChevronLeft,
  ChevronDown,
  Palette,
  Play,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  formatDateDisplay,
  detectIsPaintingJob,
  calculateWorkingDaysElapsed,
  getUrgencyDisplay,
  getWorkTypeDisplay,
} from '../utils/formatters';
import { SearchStatusPopup } from './SearchStatusPopup';

interface ModifyJobCardViewProps {
  jobs: ModifyJobItem[];
  onEdit: (job: ModifyJobItem) => void;
  onQuickStatus: (job: ModifyJobItem) => void;
  onUpdateStatus?: (job: ModifyJobItem, newStatus: string) => Promise<void> | void;
  onStartWork?: (job: ModifyJobItem) => void;
  onViewTicket: (job: ModifyJobItem) => void;
  onDelete: (job: ModifyJobItem) => void;
  onAddNew: () => void;
}

export const ModifyJobCardView: React.FC<ModifyJobCardViewProps> = ({
  jobs,
  onEdit,
  onQuickStatus,
  onUpdateStatus,
  onStartWork,
  onViewTicket,
  onDelete,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const popupMatchedJobs = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.trim().toLowerCase();
    return jobs.filter((job) => {
      const soMatch = job.saleSoNo && String(job.saleSoNo).toLowerCase().includes(query);
      const projectMatch = job.project && String(job.project).toLowerCase().includes(query);
      const customerMatch = job.customer && String(job.customer).toLowerCase().includes(query);
      const idMatch = job.id && String(job.id).toLowerCase().includes(query);
      const requesterMatch = job.requester && String(job.requester).toLowerCase().includes(query);
      const modifyMatch = job.modifyDetails && String(job.modifyDetails).toLowerCase().includes(query);
      return soMatch || projectMatch || customerMatch || idMatch || requesterMatch || modifyMatch;
    });
  }, [jobs, searchTerm]);

  const filteredJobs = useMemo(() => {
    const list = jobs.filter((job) => {
      if (!searchTerm.trim()) return true;
      const query = searchTerm.trim().toLowerCase();
      return (
        (job.id && String(job.id).toLowerCase().includes(query)) ||
        (job.customer && String(job.customer).toLowerCase().includes(query)) ||
        (job.saleSoNo && String(job.saleSoNo).toLowerCase().includes(query)) ||
        (job.project && String(job.project).toLowerCase().includes(query)) ||
        (job.requester && String(job.requester).toLowerCase().includes(query)) ||
        (job.modifyDetails && String(job.modifyDetails).toLowerCase().includes(query))
      );
    });

    // Sort latest first (by id or rowNumber descending)
    return list.sort((a, b) => {
      const valA = a.id || '';
      const valB = b.id || '';
      return valA < valB ? 1 : -1;
    });
  }, [jobs, searchTerm]);

  // Reset to page 1 if filters or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / (pageSize || 15)));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedJobs = useMemo(() => {
    if (pageSize === 0) return filteredJobs; // 0 means show all
    const start = (effectivePage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, effectivePage, pageSize]);

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
    <div className="space-y-4">
      {/* Search Header for Cards */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onFocus={() => {
              if (searchTerm.trim()) setIsSearchPopupOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsSearchPopupOpen(true);
              }
            }}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchPopupOpen(Boolean(e.target.value.trim()));
            }}
            placeholder="ค้นหา SO No., ชื่อโครงการ, ลูกค้า (เช่น SO-2026, New Line)..."
            className="w-full pl-9 pr-28 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-medium"
          />

          <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchPopupOpen(false);
                }}
                title="ล้างคำค้นหา"
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSearchPopupOpen(true)}
              title="เปิดหน้าต่างค้นหาและสถานะงานขนาดเต็มจอ"
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-2xs"
            >
              <Search className="w-3 h-3 text-white" />
              <span>ค้นหาสถานะ</span>
            </button>
          </div>

          {/* Live Full-Page Search Status Screen */}
          <SearchStatusPopup
            searchTerm={searchTerm}
            matchedJobs={popupMatchedJobs}
            allJobs={jobs}
            isOpen={isSearchPopupOpen}
            onClose={() => setIsSearchPopupOpen(false)}
            onSearchChange={(term) => setSearchTerm(term)}
            onSelectJob={(job) => {
              setSearchTerm(job.saleSoNo || job.project || job.id);
              setIsSearchPopupOpen(false);
            }}
            onQuickStatus={onQuickStatus}
            onViewTicket={onViewTicket}
            onEditJob={onEdit}
            onAddNew={onAddNew}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-950 font-bold">แสดง:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs bg-transparent font-bold text-blue-900 outline-hidden cursor-pointer"
            >
              <option value={15}>15 ลำดับล่าสุด</option>
              <option value={30}>30 ลำดับ</option>
              <option value={50}>50 ลำดับ</option>
              <option value={0}>ทั้งหมด ({filteredJobs.length})</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onAddNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ สร้างคำขอ Modify</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {paginatedJobs.map((job) => {
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
                <div className="relative inline-flex items-center">
                  <select
                    value={job.finishStatus || 'PENDING'}
                    onChange={(e) => {
                      e.stopPropagation();
                      const val = e.target.value;
                      if (onUpdateStatus) {
                        onUpdateStatus(job, val);
                      } else {
                        onQuickStatus({ ...job, finishStatus: val });
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    title="คลิกเพื่อเปลี่ยนสถานะงาน Modify ทันที"
                    className={`appearance-none text-[10px] font-bold py-0.5 pl-2 pr-5 rounded-full border cursor-pointer transition-all shadow-2xs focus:outline-none focus:ring-1 active:scale-95 text-center ${
                      job.finishStatus === 'FINISH'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 ring-1 ring-emerald-600/20'
                        : job.finishStatus === 'IN_PROGRESS' || job.engineerHandoverDate
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400'
                        : job.finishStatus === 'CANCELLED'
                        ? 'bg-slate-500 hover:bg-slate-600 text-white border-slate-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    <option value="PENDING" className="bg-white text-slate-800 font-semibold">⏳ รอดำเนินการ</option>
                    <option value="IN_PROGRESS" className="bg-white text-amber-900 font-semibold">⚙️ กำลังดำเนินการ</option>
                    <option value="FINISH" className="bg-white text-emerald-900 font-semibold">✅ เสร็จสมบูรณ์</option>
                    <option value="CANCELLED" className="bg-white text-rose-900 font-semibold">🚫 ยกเลิก</option>
                  </select>
                  <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 pointer-events-none opacity-80" />
                </div>
                {(() => {
                  const isComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                  const isEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                  const isFinish = job.finishStatus === 'FINISH';
                  const isWaiting = isFinish && !isComplete && !isEdit;

                  if (isComplete) {
                    return (
                      <button
                        type="button"
                        onClick={() => onQuickStatus(job)}
                        title="คลิกเพื่อเปลี่ยนผลการตรวจ QC (COMPLETE)"
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300"
                      >
                        QC: COMPLETE
                      </button>
                    );
                  }
                  if (isEdit) {
                    return (
                      <button
                        type="button"
                        onClick={() => onQuickStatus(job)}
                        title="คลิกเพื่อเปลี่ยนผลการตรวจ QC (EDIT - ส่งกลับแก้ไข)"
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300"
                      >
                        QC: EDIT
                      </button>
                    );
                  }
                  if (isWaiting) {
                    return (
                      <button
                        type="button"
                        onClick={() => onQuickStatus(job)}
                        title="คลิกเพื่อเปลี่ยนผลการตรวจ QC (งานเสร็จ FINISH แล้ว รอการตรวจ QC)"
                        className="px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all hover:scale-105 active:scale-95 cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 animate-pulse shadow-2xs"
                      >
                        QC: WAITING
                      </button>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => onQuickStatus(job)}
                      title="คลิกเพื่ออัปเดตสถานะ (ปุ่ม WAITING จะแสดงเมื่อสถานะงานเป็น FINISH)"
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      QC: -
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
                <div className="mt-2 flex items-center justify-between flex-wrap gap-1.5 text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                  <div className="flex items-center flex-wrap gap-1">
                    <span>จำนวน: <strong className="text-blue-700">{job.quantity || '1'}</strong></span>
                    {getWorkTypeDisplay(job.workTypes || job.workType).matched.map((wt) => (
                      <span
                        key={wt.id}
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${wt.badgeClass}`}
                      >
                        {wt.icon} {wt.shortName}
                      </span>
                    ))}
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

      {/* Cards View Footer: 15 Latest Items Indicator & Pagination */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">
            แสดง{' '}
            {filteredJobs.length === 0
              ? '0'
              : `${(effectivePage - 1) * (pageSize || filteredJobs.length) + 1} - ${Math.min(
                  effectivePage * (pageSize || filteredJobs.length),
                  filteredJobs.length
                )}`}{' '}
            จากทั้งหมด <span className="font-bold text-blue-700">{filteredJobs.length}</span> รายการ
          </span>
          {pageSize > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[10px] font-bold border border-blue-200">
              <Clock className="w-3 h-3" />
              โชว์ {pageSize} ลำดับล่าสุด
            </span>
          )}
        </div>

        {totalPages > 1 && pageSize > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={effectivePage <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ก่อนหน้า</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (
                  totalPages <= 7 ||
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  Math.abs(pageNum - effectivePage) <= 1
                ) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        effectivePage === pageNum
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === 2 && effectivePage > 3) {
                  return <span key="dots-1" className="px-1 text-slate-400">...</span>;
                }
                if (pageNum === totalPages - 1 && effectivePage < totalPages - 2) {
                  return <span key="dots-2" className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={effectivePage >= totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 flex items-center gap-1 transition-all"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
