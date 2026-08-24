import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Wrench,
  UserCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Filter,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  formatDateDisplay,
  formatThaiFullDate,
  getUrgencyDisplay,
  calculateEstimatedCompletion,
  getCurrentDateFormatted,
} from '../utils/formatters';

interface PrintStatusReportModalProps {
  jobs: ModifyJobItem[];
  isOpen: boolean;
  initialStatus?: string;
  currentUserEmail?: string;
  onClose: () => void;
}

export const PrintStatusReportModal: React.FC<PrintStatusReportModalProps> = ({
  jobs,
  isOpen,
  initialStatus = 'ALL',
  currentUserEmail = 'tawatchai.works@gmail.com',
  onClose,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);

  // Sync initial status when modal opens
  React.useEffect(() => {
    if (initialStatus) {
      setSelectedStatus(initialStatus);
    }
  }, [initialStatus, isOpen]);

  // Filter jobs based on selected status
  const reportJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (selectedStatus === 'ALL') return true;
      if (selectedStatus === 'IN_PROGRESS') {
        return (
          job.finishStatus === 'IN_PROGRESS' ||
          (Boolean(job.engineerHandoverDate) && job.finishStatus !== 'FINISH' && job.finishStatus !== 'CANCELLED')
        );
      }
      if (selectedStatus === 'COMPLETE' || selectedStatus === 'PASS') {
        return job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
      }
      if (selectedStatus === 'EDIT' || selectedStatus === 'REJECT') {
        return job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
      }
      if (selectedStatus === 'WAITING') {
        return job.inspectionResult === 'WAITING' || job.inspectionResult === 'PENDING' || !job.inspectionResult;
      }
      if (selectedStatus === 'FINISH') {
        return job.finishStatus === 'FINISH';
      }
      return true;
    });
  }, [jobs, selectedStatus]);

  const getJobEstimatedDate = (item: ModifyJobItem): string => {
    if (item.estimatedReturnDate && item.estimatedReturnDate.trim() !== '' && item.estimatedReturnDate !== '-') {
      return formatDateDisplay(item.estimatedReturnDate);
    }
    const baseDate = item.engineerHandoverDate || item.requestDate || item.createdAt || getCurrentDateFormatted();
    const calc = calculateEstimatedCompletion(
      baseDate,
      item.quantity || 1,
      item.workTypes || item.workType || 'GENERAL'
    );
    return formatDateDisplay(calc.calculatedDate);
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Overall Statistics for report summary header
  const totalCount = jobs.length;
  const finishCount = jobs.filter((j) => j.finishStatus === 'FINISH').length;
  const inProgressCount = jobs.filter(
    (j) =>
      j.finishStatus === 'IN_PROGRESS' ||
      (Boolean(j.engineerHandoverDate) && j.finishStatus !== 'FINISH' && j.finishStatus !== 'CANCELLED')
  ).length;
  const passCount = jobs.filter((j) => j.inspectionResult === 'COMPLETE' || j.inspectionResult === 'PASS').length;
  const editCount = jobs.filter((j) => j.inspectionResult === 'EDIT' || j.inspectionResult === 'REJECT').length;
  const waitingCount = jobs.filter(
    (j) => j.inspectionResult === 'WAITING' || j.inspectionResult === 'PENDING' || !j.inspectionResult
  ).length;

  const getStatusTitle = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'รายงานสถานะ: รอดำเนินการ / อยู่กับ Engineer (IN PROGRESS)';
      case 'FINISH':
        return 'รายงานสถานะ: งานเสร็จสิ้นสมบูรณ์ 100% (FINISH)';
      case 'COMPLETE':
      case 'PASS':
        return 'รายงานสถานะ: ผ่านการตรวจสอบคุณภาพ (QC COMPLETE / PASS)';
      case 'EDIT':
      case 'REJECT':
        return 'รายงานสถานะ: ส่งกลับแก้ไขปรับปรุง (QC EDIT / REJECT)';
      case 'WAITING':
        return 'รายงานสถานะ: รอการตรวจสอบคุณภาพ (WAITING QC)';
      default:
        return 'รายงานสรุปแผนงานดัดแปลงแก้ไขทุกสถานะ (ALL MODIFY MASTER SCHEDULE)';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return {
          label: '🟡 รอดำเนินการ',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'FINISH':
        return {
          label: '🟢 เสร็จสิ้น (FINISH)',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      case 'COMPLETE':
      case 'PASS':
        return {
          label: '✅ ตรวจผ่าน (COMPLETE)',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      case 'EDIT':
      case 'REJECT':
        return {
          label: '⚠️ ส่งกลับแก้ไข (EDIT)',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
        };
      case 'WAITING':
        return {
          label: '⏳ รอตรวจ (WAITING)',
          bg: 'bg-slate-200 text-slate-800 border-slate-300',
        };
      default:
        return {
          label: '📋 ทุกสถานะงาน',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
        };
    }
  };

  const currentBadge = getStatusBadge(selectedStatus);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm overflow-hidden print:p-0 print:bg-white print:static print:overflow-visible">
      {/* 1. Modal Control Toolbar (Hidden on Print) */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>A4 Print Preview - รายงานสรุปสถานะงาน Modify</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                ขนาด A4 มาตรฐาน
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              กำลังแสดงรายงาน: <strong className="text-slate-200">{getStatusTitle(selectedStatus)}</strong> ({reportJobs.length} รายการ)
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Selection Dropdown */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl px-2.5 py-1 border border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-white border-none outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-slate-900 text-white">📋 ทุกสถานะงาน (All Jobs)</option>
              <option value="IN_PROGRESS" className="bg-slate-900 text-white">🟡 รอดำเนินการ (In Progress)</option>
              <option value="FINISH" className="bg-slate-900 text-white">🟢 เสร็จสมบูรณ์ (Finish)</option>
              <option value="COMPLETE" className="bg-slate-900 text-white">✅ ตรวจผ่าน (QC Complete/Pass)</option>
              <option value="EDIT" className="bg-slate-900 text-white">⚠️ ส่งกลับแก้ไข (QC Edit)</option>
              <option value="WAITING" className="bg-slate-900 text-white">⏳ รอตรวจ (Waiting QC)</option>
            </select>
          </div>

          {/* Orientation Toggle: Landscape or Portrait */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                orientation === 'landscape'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ↔ แนวนอน (Landscape)
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                orientation === 'portrait'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ↕ แนวตั้ง (Portrait)
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
              title="ย่อขนาด"
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-slate-300 text-[11px]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.3, z + 0.1))}
              title="ขยายขนาด"
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ A4 (Print / PDF)</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="ปิดหน้าต่าง"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Preview Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-900/90 print:p-0 print:bg-white print:overflow-visible">
        {/* A4 Sheet Paper */}
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
          className={`${
            orientation === 'landscape'
              ? 'a4-preview-landscape w-[297mm] min-h-[210mm]'
              : 'a4-preview-canvas w-[210mm] min-h-[297mm]'
          } bg-white text-slate-900 shadow-2xl border border-slate-300 p-8 font-sans print:shadow-none print:border-none print:w-full print:p-4 print:my-0 flex flex-col justify-between`}
        >
          <div>
            {/* Top Document Letterhead */}
            <div className="border-b-2 border-slate-900 pb-3 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black tracking-widest text-slate-950 uppercase bg-slate-100 px-3 py-0.5 rounded-lg border border-slate-300 font-mono">
                      LUMENCRAFT
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      FACTORY MASTER REPORT & QC SCHEDULE
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-tight">
                    {getStatusTitle(selectedStatus)}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    LUMENCRAFT • ตารางบันทึกข้อมูลงานดัดแปลงแก้ไขและผลการตรวจเช็ค (Google Sheets Data Source)
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block p-2 border-2 border-slate-900 rounded-xl bg-slate-50 text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">วันที่ออกรายงาน</span>
                    <span className="text-xs font-bold text-slate-900 block font-mono">
                      {formatThaiFullDate(new Date().toISOString().split('T')[0])}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ผู้พิมพ์: <strong className="font-mono text-slate-800">{currentUserEmail}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Summary Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs mb-3.5">
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">งานทั้งหมด</span>
                <span className="font-black text-blue-950 text-sm">{totalCount} รายการ</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">รอดำเนินการ</span>
                <span className="font-black text-amber-700 text-sm">{inProgressCount} รายการ</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">งานเสร็จสิ้น (FINISH)</span>
                <span className="font-black text-emerald-700 text-sm">{finishCount} รายการ</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">QC ตรวจผ่าน (PASS)</span>
                <span className="font-black text-emerald-800 text-sm">{passCount} รายการ</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">QC ส่งกลับแก้ไข</span>
                <span className="font-black text-rose-700 text-sm">{editCount} รายการ</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">QC รอตรวจ</span>
                <span className="font-black text-slate-700 text-sm">{waitingCount} รายการ</span>
              </div>
            </div>

            {/* Report Table */}
            {reportJobs.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-300 rounded-xl my-4">
                <p className="text-slate-500 text-xs font-semibold">
                  ไม่มีรายการคำของาน Modify ในสถานะที่เลือก
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] font-bold">
                      <th className="p-2 border-r border-slate-700 w-8 text-center">#</th>
                      <th className="p-2 border-r border-slate-700 min-w-[90px]">Job ID</th>
                      <th className="p-2 border-r border-slate-700 min-w-[80px]">ความเร่งด่วน</th>
                      <th className="p-2 border-r border-slate-700 min-w-[95px]">Sale SO No.</th>
                      <th className="p-2 border-r border-slate-700 min-w-[130px]">ลูกค้า & โครงการ</th>
                      <th className="p-2 border-r border-slate-700 min-w-[80px]">Sale</th>
                      <th className="p-2 border-r border-slate-700 min-w-[85px]">ช่างผู้ทำ</th>
                      <th className="p-2 border-r border-slate-700 min-w-[95px]">ผู้สร้างงาน</th>
                      <th className="p-2 border-r border-slate-700 min-w-[85px]">ส่งมอบ Engineer</th>
                      <th className="p-2 border-r border-slate-700 min-w-[85px] text-amber-300">วันประมาณการ</th>
                      <th className="p-2 border-r border-slate-700 min-w-[75px]">ตรวจวันที่</th>
                      <th className="p-2 border-r border-slate-700 min-w-[85px] text-center">ผลตรวจ QC</th>
                      <th className="p-2 text-center min-w-[80px]">สถานะ Finish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportJobs.map((job, idx) => {
                      const isRowComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                      const isRowEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                      const isRowFinish = job.finishStatus === 'FINISH';
                      const urgency = getUrgencyDisplay(job.urgencyLevel);
                      const estDateDisplay = getJobEstimatedDate(job);

                      return (
                        <tr
                          key={job.id || idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500 font-bold">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-900 whitespace-nowrap">
                            {job.id}
                          </td>
                          <td className="p-2 border-r border-slate-200 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold inline-block border ${
                                urgency.level === 'VERY_URGENT'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : urgency.level === 'URGENT'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {urgency.icon} {urgency.label}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {job.saleSoNo || '-'}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <div className="font-bold text-slate-900 line-clamp-1">{job.customer || '-'}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{job.project || '-'}</div>
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium text-slate-800">
                            {job.sale || '-'}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                            {job.technician || '-'}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono text-[10px] text-blue-800">
                            {job.createdBy || 'tawatchai.works@gmail.com'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                            {formatDateDisplay(job.engineerHandoverDate)}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-amber-900 whitespace-nowrap bg-amber-50/50">
                            {estDateDisplay}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                            {formatDateDisplay(job.inspectionDate)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${
                                isRowComplete
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : isRowEdit
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {job.inspectionResult || 'WAITING'}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${
                                isRowFinish
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : job.finishStatus === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {job.finishStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Official Signature Footer */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-slate-800 text-center text-xs mt-6">
            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-900">ผู้จัดทำรายงาน / Prepared By</span>
              <span className="block text-[11px] text-slate-600 mt-4">({currentUserEmail})</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./.......</span>
            </div>

            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-900">หัวหน้าฝ่ายผลิต / Production Supervisor</span>
              <span className="block text-[11px] text-slate-600 mt-4">(...................................................)</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./.......</span>
            </div>

            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-900">ผู้จัดการฝ่าย QC / QC Manager</span>
              <span className="block text-[11px] text-slate-600 mt-4">(...................................................)</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./.......</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
