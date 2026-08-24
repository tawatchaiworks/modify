import React, { useState } from 'react';
import {
  X,
  Printer,
  CheckSquare,
  Square,
  Wrench,
  FileText,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  UserCheck,
  Building,
  User,
  Calendar,
  Briefcase,
  ShieldCheck,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import { formatDateDisplay, formatThaiFullDate } from '../utils/formatters';

interface PrintJobTicketProps {
  job: ModifyJobItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintJobTicket: React.FC<PrintJobTicketProps> = ({
  job,
  isOpen,
  onClose,
}) => {
  // Preview zoom level: 0.75 | 0.9 | 1.0 | 1.15
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [previewMode, setPreviewMode] = useState<'a4' | 'fit'>('a4');

  if (!isOpen || !job) return null;

  const handlePrint = () => {
    window.print();
  };

  const isComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
  const isEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
  const isFinish = job.finishStatus === 'FINISH';
  const isInProgress = job.finishStatus === 'IN_PROGRESS';

  // Status Stamp styling based on actual status
  const getStatusStamp = () => {
    if (isFinish) {
      return {
        text: 'APPROVED / FINISH',
        subtext: 'งานเสร็จสมบูรณ์ 100%',
        color: 'text-emerald-700 border-emerald-600 bg-emerald-50/70',
        dot: 'bg-emerald-500',
      };
    }
    if (isComplete) {
      return {
        text: 'QC PASSED / COMPLETE',
        subtext: 'ผ่านการตรวจสอบคุณภาพ',
        color: 'text-emerald-700 border-emerald-600 bg-emerald-50/70',
        dot: 'bg-emerald-500',
      };
    }
    if (isEdit) {
      return {
        text: 'QC REVISE / EDIT REQUIRED',
        subtext: 'ต้องนำไปแก้ไขปรับปรุง',
        color: 'text-rose-700 border-rose-600 bg-rose-50/70',
        dot: 'bg-rose-500',
      };
    }
    if (isInProgress) {
      return {
        text: 'IN PRODUCTION / IN PROGRESS',
        subtext: 'กำลังดำเนินการในสายผลิต',
        color: 'text-amber-700 border-amber-600 bg-amber-50/70',
        dot: 'bg-amber-500',
      };
    }
    return {
      text: 'QUEUED / PENDING',
      subtext: 'รอเริ่มงาน / รอตรวจเช็ค',
      color: 'text-slate-700 border-slate-500 bg-slate-50/70',
      dot: 'bg-slate-400',
    };
  };

  const statusStamp = getStatusStamp();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm overflow-hidden print:p-0 print:bg-white print:static print:overflow-visible">
      {/* 1. Modal Top Toolbar (Hidden on Print) */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">
                A4 Print Preview - ใบสั่งงาน Modify
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {job.id}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              สถานะปัจจุบัน: <strong className="text-slate-200">{job.finishStatus}</strong> | QC: <strong className="text-slate-200">{job.inspectionResult || 'WAITING'}</strong>
            </p>
          </div>
        </div>

        {/* Preview Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
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
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              title="ขยายขนาด"
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              title="ขนาด 100% A4 มาตรฐาน"
              className="ml-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-white"
            >
              A4 100%
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setPreviewMode('a4')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                previewMode === 'a4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 แผ่น A4
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('fit')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                previewMode === 'fit'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📱 พอดีจอ
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

      {/* 2. Scrollable Preview Canvas Wrapper */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-900/90 print:p-0 print:bg-white print:overflow-visible">
        {/* The A4 Canvas Sheet */}
        <div
          style={{
            transform: previewMode === 'a4' ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
          className={`${
            previewMode === 'a4'
              ? 'a4-preview-canvas w-[210mm] min-h-[297mm] my-2'
              : 'w-full max-w-4xl my-auto'
          } bg-white text-slate-900 rounded-none sm:rounded-sm shadow-2xl border border-slate-300 p-8 sm:p-10 font-sans print:shadow-none print:border-none print:w-full print:p-4 print:my-0 flex flex-col justify-between`}
        >
          <div>
            {/* Top Document Header / Factory Info */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                      FACTORY WORK ORDER & QC DOCUMENT
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      ISO A4 STANDARD
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 leading-tight">
                    ใบคำของานดัดแปลงแก้ไข (Modify Job Request)
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ระบบบันทึกตาราง Modify & QC Tracking (Google Sheets Database)
                  </p>
                </div>

                {/* Top Right: JOB ID & Barcode simulation */}
                <div className="text-right border-2 border-slate-900 rounded-xl p-2.5 bg-slate-50 shrink-0 min-w-[170px]">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">JOB ID / รหัสงาน</span>
                  <span className="text-lg font-mono font-black text-blue-950 block">{job.id}</span>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                    {job.saleSoNo && <span className="font-bold text-slate-800">SO: {job.saleSoNo}</span>}
                    {job.rowNumber && <span>(Row #{job.rowNumber})</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Official Status Stamp / Seal */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg border-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 ${statusStamp.color}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${statusStamp.dot} animate-pulse`} />
                  <span>{statusStamp.text}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{statusStamp.subtext}</span>
                  <span className="text-[11px] text-slate-500">
                    พิมพ์เมื่อ: {formatThaiFullDate(new Date().toISOString().split('T')[0])}
                  </span>
                </div>
              </div>

              {/* Google Login Author Badge */}
              <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-[10px] text-slate-500 block">บันทึกโดย Google User:</span>
                  <span className="font-bold text-slate-900 font-mono text-[11px]">
                    {job.createdBy || 'tawatchai.works@gmail.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: 16 Field Specification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white border border-slate-300 rounded-xl text-xs mb-4 shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">1. วันที่ Request:</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {formatDateDisplay(job.requestDate)}
                </span>
                {job.requestTime && (
                  <span className="text-[10px] text-slate-500 block">เวลา: {job.requestTime} น.</span>
                )}
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">2. เดือนที่ Request:</span>
                <span className="font-bold text-slate-900 text-sm block">{job.requestMonth || '-'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">3. ผู้ส่งคำขอ:</span>
                <span className="font-bold text-slate-900 text-sm block">{job.requester || '-'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">4. Sale (เซลล์):</span>
                <span className="font-bold text-slate-900 text-sm block text-indigo-900">{job.sale || '-'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">5. Sale So No.:</span>
                <span className="font-mono font-bold text-slate-900 text-sm block text-blue-900">
                  {job.saleSoNo || '-'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">6. Customer (ลูกค้า):</span>
                <span className="font-bold text-slate-900 text-sm block truncate" title={job.customer}>
                  {job.customer || '-'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">7. Project (โครงการ):</span>
                <span className="font-bold text-slate-900 text-sm block truncate" title={job.project}>
                  {job.project || '-'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">8. Shipment Date:</span>
                <span className="font-bold text-slate-900 text-sm block text-purple-950">
                  {formatDateDisplay(job.shipmentDate)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">9. จำนวน (Quantity):</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-blue-900 text-sm">{job.quantity || '-'}</span>
                  {job.workType === 'PAINTING' && (
                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                      🎨 ทำสี
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">10. ช่างผู้ทำ/รับผิดชอบ:</span>
                <span className="font-black text-slate-900 text-sm block text-amber-900">
                  {job.technician || '-'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">11. ส่งมอบ Engineer วันที่:</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {formatDateDisplay(job.engineerHandoverDate)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">12. ประมาณการส่งคืน:</span>
                <span className="font-bold text-amber-900 text-sm block">
                  {formatDateDisplay(job.estimatedReturnDate)}
                </span>
              </div>
            </div>

            {/* Section 2: รายละเอียดงาน 10 บรรทัด & จำนวนชิ้น (Work Details 1-10 & Quantities Checklist) */}
            <div className="border border-slate-300 rounded-xl p-3 mb-4 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>รายละเอียดงาน 10 รายการ & จำนวนชิ้น (Work Details & Quantity Checklist)</span>
                </h4>
                <span className="text-[10px] text-slate-500">
                  สำหรับช่างผู้ปฏิบัติงานและวิศวกรตรวจสอบ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const text = job.workDetails?.[idx] || '';
                  const qty = job.workDetailQuantities?.[idx];
                  const hasContent = Boolean(text && text.trim());
                  const hasQty = qty !== undefined && qty !== '' && String(qty).trim() !== '';

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 py-1 px-2 rounded border ${
                        hasContent ? 'border-slate-200 bg-slate-50/70' : 'border-dashed border-slate-200 text-slate-300'
                      }`}
                    >
                      <span className="w-5 h-5 rounded bg-slate-200/80 text-slate-800 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-300">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                        <span className={hasContent ? 'text-slate-900 font-medium truncate' : 'text-slate-300 italic'}>
                          {text || '-'}
                        </span>
                        {hasQty && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] shrink-0 border border-emerald-300">
                            {String(qty).includes('ชิ้น') || String(qty).includes('ชุด') ? qty : `${qty} ชิ้น`}
                          </span>
                        )}
                      </div>
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: รายละเอียดที่ให้ Modify */}
            <div className="border border-slate-300 rounded-xl p-3 mb-4 bg-amber-50/40">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-amber-200 pb-1.5 mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-700" />
                <span>รายละเอียดที่ให้ Modify (Modification Instructions & Requirements)</span>
              </h4>
              <p className="text-xs text-slate-900 font-medium whitespace-pre-wrap leading-relaxed min-h-[40px]">
                {job.modifyDetails || '- ไม่มีรายละเอียดระบุ -'}
              </p>
            </div>

            {/* Section 4: ตรวจสอบและสถานะปิดงาน */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border border-slate-300 rounded-xl text-xs mb-4 bg-slate-50/50">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">13. ตรวจสอบวันที่:</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {formatDateDisplay(job.inspectionDate)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">14. ผลการตรวจสอบ (QC):</span>
                <div className="mt-0.5">
                  <span
                    className={`font-black px-2.5 py-0.5 rounded text-xs inline-block border ${
                      isComplete
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : isEdit
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {job.inspectionResult || 'WAITING'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">15. สถานะงาน (FINISH):</span>
                <div className="mt-0.5">
                  <span
                    className={`font-black px-2.5 py-0.5 rounded text-xs inline-block border ${
                      isFinish
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : isInProgress
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {job.finishStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: หมายเหตุ */}
            {job.remarks && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 mb-4">
                <strong className="text-slate-900">16. หมายเหตุ: </strong>
                <span>{job.remarks}</span>
              </div>
            )}
          </div>

          {/* Section 6: Official Signature Blocks for Factory Floor Approval */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-slate-800 text-center text-xs mt-6">
            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-900">ผู้ส่งคำขอ / Requester</span>
              <span className="block text-[11px] text-slate-600 mt-4">
                ({job.requester || '...........................................'})
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                วันที่ {job.requestDate ? formatDateDisplay(job.requestDate) : '...../...../.....'}
              </span>
            </div>

            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-900">ช่าง / Engineer ผู้ปฏิบัติงาน</span>
              <span className="block text-[11px] text-slate-600 mt-4">
                ({job.technician || '...........................................'})
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                วันที่ {job.engineerHandoverDate ? formatDateDisplay(job.engineerHandoverDate) : '...../...../.....'}
              </span>
            </div>

            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-900">ผู้ตรวจสอบ / QC Inspector</span>
              <span className="block text-[11px] text-slate-600 mt-4">
                (...................................................)
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                วันที่ {job.inspectionDate ? formatDateDisplay(job.inspectionDate) : '...../...../.....'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
