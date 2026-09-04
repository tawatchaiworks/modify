import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Clock,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Edit,
  ExternalLink,
  ChevronRight,
  User,
  Building,
  Hash,
  Truck,
  Layers,
  Sparkles,
  ArrowLeft,
  Filter,
  Check,
  Calendar,
  AlertCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  getJobWorkflowStatus,
  formatDateDisplay,
  getUrgencyDisplay,
  getWorkTypeDisplay,
  getFinishStatusDisplay,
  JobWorkflowStep,
} from '../utils/formatters';

interface SearchStatusPopupProps {
  searchTerm: string;
  matchedJobs: ModifyJobItem[];
  allJobs?: ModifyJobItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (job: ModifyJobItem) => void;
  onQuickStatus?: (job: ModifyJobItem) => void;
  onViewTicket?: (job: ModifyJobItem) => void;
  onEditJob?: (job: ModifyJobItem) => void;
  onAddNew?: () => void;
  onSearchChange?: (term: string) => void;
}

export const SearchStatusPopup: React.FC<SearchStatusPopupProps> = ({
  searchTerm,
  matchedJobs,
  allJobs,
  isOpen,
  onClose,
  onSelectJob,
  onQuickStatus,
  onViewTicket,
  onEditJob,
  onAddNew,
  onSearchChange,
}) => {
  const [internalSearch, setInternalSearch] = useState(searchTerm);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'ALL' | JobWorkflowStep>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal search with prop
  useEffect(() => {
    setInternalSearch(searchTerm);
  }, [searchTerm]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const effectiveJobs = useMemo(() => {
    const source = allJobs && allJobs.length > 0 ? allJobs : matchedJobs;
    const query = internalSearch.trim().toLowerCase();

    if (!query) {
      return source;
    }

    return source.filter((job) => {
      const soMatch = job.saleSoNo && String(job.saleSoNo).toLowerCase().includes(query);
      const projectMatch = job.project && String(job.project).toLowerCase().includes(query);
      const customerMatch = job.customer && String(job.customer).toLowerCase().includes(query);
      const idMatch = job.id && String(job.id).toLowerCase().includes(query);
      const requesterMatch = job.requester && String(job.requester).toLowerCase().includes(query);
      const modifyMatch = job.modifyDetails && String(job.modifyDetails).toLowerCase().includes(query);
      const techMatch = job.technician && String(job.technician).toLowerCase().includes(query);
      const finishMatch =
        (job.finishStatus && String(job.finishStatus).toLowerCase().includes(query)) ||
        (query.includes('finish') && (job.finishStatus === 'FINISH' || job.inspectionResult === 'COMPLETE')) ||
        (query.includes('เสร็จ') && (job.finishStatus === 'FINISH' || job.inspectionResult === 'COMPLETE')) ||
        (query.includes('pending') && (job.finishStatus === 'PENDING' || !job.finishStatus)) ||
        (query.includes('รอ') && (job.finishStatus === 'PENDING' || !job.finishStatus || job.inspectionResult === 'WAITING')) ||
        (query.includes('progress') && job.finishStatus === 'IN_PROGRESS') ||
        (query.includes('ทำ') && job.finishStatus === 'IN_PROGRESS');
      return soMatch || projectMatch || customerMatch || idMatch || requesterMatch || modifyMatch || techMatch || finishMatch;
    });
  }, [allJobs, matchedJobs, internalSearch]);

  // Tab filtered jobs
  const displayJobs = useMemo(() => {
    if (activeWorkflowTab === 'ALL') {
      return effectiveJobs;
    }
    return effectiveJobs.filter((job) => {
      const wf = getJobWorkflowStatus(job);
      return wf.code === activeWorkflowTab;
    });
  }, [effectiveJobs, activeWorkflowTab]);

  // Metrics summary
  const metrics = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let waitQc = 0;
    let finish = 0;

    effectiveJobs.forEach((job) => {
      const wf = getJobWorkflowStatus(job);
      if (wf.code === 'PENDING') pending++;
      else if (wf.code === 'IN_PROGRESS') inProgress++;
      else if (wf.code === 'WAIT_QC') waitQc++;
      else if (wf.code === 'FINISH') finish++;
    });

    return { total: effectiveJobs.length, pending, inProgress, waitQc, finish };
  }, [effectiveJobs]);

  if (!isOpen) {
    return null;
  }

  const stages = [
    { key: 'PENDING', label: '1. รอดำเนินการ', icon: '⏳', count: metrics.pending, color: 'amber' },
    { key: 'IN_PROGRESS', label: '2. ดำเนินการ', icon: '⚙️', count: metrics.inProgress, color: 'blue' },
    { key: 'WAIT_QC', label: '3. รอ QC', icon: '🔍', count: metrics.waitQc, color: 'purple' },
    { key: 'FINISH', label: '4. Finish', icon: '✅', count: metrics.finish, color: 'emerald' },
  ];

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  return (
    <div
      id="search-status-full-page"
      className="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-[#f4f6f8] overflow-hidden animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <header className="px-4 sm:px-6 lg:px-8 py-3 bg-[#1e232d] text-white flex items-center justify-between border-b border-slate-700 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-4xl">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/80 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer shrink-0"
            title="กลับสู่หน้ารายการหลัก (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">กลับสู่หน้ารายการ</span>
            <span className="sm:hidden">กลับ</span>
          </button>

          <div className="h-6 w-px bg-slate-700 hidden sm:block shrink-0" />

          {/* Search Input in Top Bar */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={internalSearch}
              onChange={handleSearchInputChange}
              placeholder="ค้นหา SO No., ชื่อโครงการ, ลูกค้า, Job ID, ช่างผู้ทำ..."
              className="w-full pl-9 pr-9 py-1.5 text-xs sm:text-sm bg-slate-800/90 text-white placeholder:text-slate-400 border border-slate-600 rounded-xl focus:bg-slate-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-hidden font-medium"
            />
            {internalSearch && (
              <button
                type="button"
                onClick={() => {
                  setInternalSearch('');
                  if (onSearchChange) onSearchChange('');
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-2 shrink-0">
          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddNew();
              }}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <span>+ สร้างคำขอใหม่</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="ปิดหน้าต่างค้นหา (Esc)"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Full-Screen Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
        {/* Sub-header Banner, Search Input Box & KPI Quick Filter */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs shrink-0 space-y-3">
          <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex flex-wrap items-center gap-2">
                <span>ผลการค้นหาและติดตามสถานะงาน Modify</span>
                {internalSearch && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-mono font-bold">
                    "{internalSearch}"
                  </span>
                )}
                <span className="text-xs text-slate-500 font-normal">
                  (พบทั้งหมด {metrics.total} รายการ)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                พิมพ์คำค้นหาเพื่อกรอง SO No., รหัส Job, ลูกค้า, ชื่อโครงการ, หรือช่างผู้รับผิดชอบ
              </p>
            </div>

            {/* Filter Tabs by 4 Workflow Stages */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveWorkflowTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeWorkflowTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>ทั้งหมด</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  {metrics.total}
                </span>
              </button>

              {stages.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setActiveWorkflowTab(st.key as JobWorkflowStep)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeWorkflowTab === st.key
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{st.icon}</span>
                  <span>{st.label}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200/90 text-slate-800 text-[10px]">
                    {st.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search Suggestions & Chips */}
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              คำค้นหายอดนิยม:
            </span>
            {[
              { label: '🔥 งานด่วน', term: 'ด่วน' },
              { label: '🚨 ด่วนมาก', term: 'ด่วนมาก' },
              { label: '🎨 พ่นสี/ทำสี', term: 'สี' },
              { label: '⚡ ดัด/แปลง', term: 'ดัด' },
              { label: '⏳ รอดำเนินการ', term: 'รอดำเนินการ' },
              { label: '⚙️ กำลังทำ', term: 'IN_PROGRESS' },
              { label: '🔍 รอ QC', term: 'WAIT_QC' },
              { label: '✅ FINISH', term: 'FINISH' },
            ].map((chip) => (
              <button
                key={chip.term}
                type="button"
                onClick={() => {
                  setInternalSearch(chip.term);
                  if (onSearchChange) onSearchChange(chip.term);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  internalSearch.toLowerCase() === chip.term.toLowerCase()
                    ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {chip.label}
              </button>
            ))}
            {internalSearch && (
              <button
                type="button"
                onClick={() => {
                  setInternalSearch('');
                  if (onSearchChange) onSearchChange('');
                }}
                className="ml-auto text-rose-600 hover:text-rose-800 hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                ล้างคำค้นหา
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Job Cards Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-8 bg-[#f4f6f8]">
          <div className="max-w-[1920px] mx-auto space-y-4">
            {displayJobs.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-slate-200 shadow-2xs max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                  🔍
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    ไม่พบรายการงาน Modify ตามเงื่อนไขนี้
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    {internalSearch
                      ? `ไม่พบข้อมูลที่มี SO No., ชื่อโครงการ, ลูกค้า, หรือรหัสงานที่ตรงกับ "${internalSearch}" ในหมวดหมู่นี้`
                      : 'ยังไม่มีรายการงานในหมวดหมู่นี้'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {internalSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setInternalSearch('');
                        if (onSearchChange) onSearchChange('');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                    >
                      ล้างคำค้นหา
                    </button>
                  )}
                  {onAddNew && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAddNew();
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      + สร้างคำขอ Modify ใหม่
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayJobs.map((job) => {
                  const workflow = getJobWorkflowStatus(job);
                  const finishStatus = getFinishStatusDisplay(job.finishStatus);
                  const urgency = getUrgencyDisplay(job.urgencyLevel);
                  const workType = getWorkTypeDisplay(job.workTypes || job.workType);

                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400/80 transition-all flex flex-col justify-between"
                    >
                      {/* Top Row: SO Number + Job ID + Customer + Finish Status & Workflow Status Badges */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {job.saleSoNo ? (
                                <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-mono font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
                                  <Hash className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{job.saleSoNo}</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-mono">
                                  (ไม่มี SO No.)
                                </span>
                              )}

                              <span className="font-mono font-extrabold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                {job.id}
                              </span>

                              {urgency.level !== 'NORMAL' && (
                                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${urgency.badgeClass}`}>
                                  {urgency.icon} {urgency.label}
                                </span>
                              )}

                              {workType.hasPainting && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                                  🎨 งานทำสี
                                </span>
                              )}
                            </div>

                            {/* Customer & Project */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-800 pt-1">
                              <span className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                                <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>{job.customer || '- ไม่ระบุลูกค้า -'}</span>
                              </span>
                              {job.project && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-800 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 text-xs sm:text-sm">
                                    โครงการ: {job.project}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Prominent Finish Status Badge */}
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <div
                              className={`px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-2xs ${finishStatus.badgeClass}`}
                            >
                              <span className="text-base">{finishStatus.icon}</span>
                              <span>สถานะงาน: {finishStatus.label}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <span>ขั้นตอนงาน:</span>
                              <span className="font-bold text-slate-700">{workflow.label}</span>
                            </span>
                          </div>
                        </div>

                        {/* 4-Step Progress Flow Stepper */}
                        <div className="py-3">
                          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                            {stages.map((st, idx) => {
                              const isCurrent = workflow.code === st.key;
                              const isPassed = workflow.stepNumber > (idx + 1);

                              let stepClass = 'bg-slate-100 text-slate-400 border-slate-200';
                              if (isCurrent) {
                                if (st.key === 'FINISH') {
                                  stepClass = 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400/40';
                                } else if (st.key === 'WAIT_QC') {
                                  stepClass = 'bg-purple-600 text-white font-black shadow-xs ring-2 ring-purple-400/40';
                                } else if (st.key === 'IN_PROGRESS') {
                                  stepClass = 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400/40';
                                } else {
                                  stepClass = 'bg-amber-500 text-white font-black shadow-xs ring-2 ring-amber-400/40';
                                }
                              } else if (isPassed) {
                                stepClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                              }

                              return (
                                <div
                                  key={st.key}
                                  className={`px-2 py-1.5 rounded-xl border text-[11px] sm:text-xs text-center transition-all flex flex-col items-center justify-center gap-0.5 ${stepClass}`}
                                >
                                  <span className="text-xs sm:text-sm">{isPassed ? '✓' : st.icon}</span>
                                  <span className="truncate w-full font-bold">{st.label}</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span>{workflow.description}</span>
                          </p>
                        </div>

                        {/* Metadata Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 py-2.5 px-3 bg-slate-50/90 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[11px]">สถานะงาน (Finish):</span>
                            <span className="font-extrabold text-slate-900 block mt-0.5">
                              {finishStatus.label}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">ช่างผู้ทำ:</span>
                            <span className="font-bold text-slate-900 truncate block mt-0.5">
                              {job.technician ? `🛠️ ${job.technician}` : '- ยังไม่ระบุ -'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">วันที่ช่างรับสินค้า:</span>
                            <span className="font-bold text-slate-900 block mt-0.5">
                              {formatDateDisplay(job.engineerHandoverDate) || '- ยังไม่ได้รับ -'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">วันที่ขอ / ส่งมอบ:</span>
                            <span className="font-semibold text-slate-900 block mt-0.5">
                              {formatDateDisplay(job.requestDate)} {job.shipmentDate ? `➜ ${formatDateDisplay(job.shipmentDate)}` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">จำนวนชิ้นงาน:</span>
                            <span className="font-extrabold text-blue-900 block mt-0.5">
                              {job.quantity || '0'} ชิ้น
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">ผลตรวจ QC:</span>
                            <span className="font-bold text-slate-900 block mt-0.5">
                              {job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS'
                                ? '✅ ตรวจผ่าน'
                                : job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT'
                                ? '⚠️ ส่งกลับแก้ไข'
                                : job.finishStatus === 'FINISH'
                                ? '⏳ รอตรวจ (WAITING)'
                                : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Modify Details excerpt */}
                        {job.modifyDetails && (
                          <div className="mt-2.5 text-xs text-slate-700 bg-amber-50/60 p-2 rounded-lg border border-amber-200/70">
                            <span className="font-bold text-amber-900">รายละเอียดงาน: </span>
                            <span className="line-clamp-2">{job.modifyDetails}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Toolbar */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectJob(job);
                            onClose();
                          }}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>🔍 เปิดดูเฉพาะงานนี้ในตาราง</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          {onQuickStatus && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onQuickStatus(job);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>อัปเดตสถานะ</span>
                            </button>
                          )}

                          {onViewTicket && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onViewTicket(job);
                              }}
                              title="พิมพ์ใบสั่งงาน Modify (Ticket)"
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>ใบงาน</span>
                            </button>
                          )}

                          {onEditJob && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEditJob(job);
                              }}
                              title="แก้ไขข้อมูลคำขอนี้"
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-600" />
                              <span>แก้ไข</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Hint Bar */}
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ค้นหาแบบเรียลไทม์: พิมพ์เลข SO เช่น "SO-2026", รหัสงาน หรือชื่อช่าง เพื่อดูสถานะ 4 ขั้นตอนได้ทันที</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-600">กดปุ่ม Esc หรือคลิก "กลับสู่หน้ารายการ" เพื่อปิด</span>
          </div>
        </div>
      </div>
    </div>
  );
};
