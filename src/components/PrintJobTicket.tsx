import React from 'react';
import { X, Printer, CheckSquare, Square, Wrench, FileText } from 'lucide-react';
import { ModifyJobItem } from '../types';
import { formatDateDisplay } from '../utils/formatters';

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
  if (!isOpen || !job) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Topbar (hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm sm:text-base">ใบสั่งงาน / Modify Job Ticket</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-slate-900 font-sans print:p-4 print:overflow-visible">
          {/* Ticket Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-blue-800">
                  FACTORY & PRODUCTION WORK ORDER
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  ใบคำของานดัดแปลงแก้ไข (Modify Job Request)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  บันทึกข้อมูลตาราง Modify (Google Sheets Database)
                </p>
              </div>
              <div className="text-right border-2 border-slate-900 rounded-xl p-2.5 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">JOB ID / รหัสงาน</span>
                <span className="text-base sm:text-lg font-mono font-black text-blue-900 block">{job.id}</span>
                {job.rowNumber && (
                  <span className="text-[10px] text-slate-500 font-mono block">Sheet Row #{job.rowNumber}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Request & Sales Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs mb-4">
            <div>
              <span className="text-slate-500 font-medium block">วันที่ Request:</span>
              <span className="font-bold text-slate-900 text-sm">{formatDateDisplay(job.requestDate)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">เดือนที่ Request:</span>
              <span className="font-bold text-slate-900">{job.requestMonth || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">เวลาที่ Request:</span>
              <span className="font-bold text-slate-900">{job.requestTime || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">ผู้ส่งคำขอ:</span>
              <span className="font-bold text-slate-900 text-sm">{job.requester || '-'}</span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Sale:</span>
              <span className="font-bold text-slate-900">{job.sale || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Sale So No.:</span>
              <span className="font-bold text-slate-900 font-mono">{job.saleSoNo || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Cutomer (ลูกค้า):</span>
              <span className="font-bold text-slate-900 text-sm">{job.customer || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Project:</span>
              <span className="font-bold text-slate-900">{job.project || '-'}</span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Shipment Date:</span>
              <span className="font-bold text-slate-900">{formatDateDisplay(job.shipmentDate)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">จำนวน (Quantity):</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-black text-blue-900 text-sm">{job.quantity || '-'}</span>
                {job.workType === 'PAINTING' && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                    🎨 ทำสี
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">ช่างผู้ทำ / ผู้รับผิดชอบ:</span>
              <span className="font-black text-slate-900 text-sm">{job.technician || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">ผลการตรวจ:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                  job.inspectionResult === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : job.inspectionResult === 'REJECT'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {job.inspectionResult || 'WAITING'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">สถานะงาน (FINISH):</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                  job.finishStatus === 'FINISH'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {job.finishStatus}
              </span>
            </div>
          </div>

          {/* Section 2: รายละเอียดงาน 10 บรรทัด */}
          <div className="border border-slate-300 rounded-xl p-3 mb-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 mb-2.5 flex items-center justify-between">
              <span>รายละเอียดงาน 10 บรรทัด (Work Details 1-10)</span>
              <span className="text-[10px] font-normal text-slate-500">Checklist สำหรับช่าง / Engineer</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {Array.from({ length: 10 }).map((_, idx) => {
                const text = job.workDetails?.[idx] || '';
                return (
                  <div key={idx} className="flex items-start gap-2 py-1 border-b border-slate-100">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={text ? 'text-slate-900 font-medium' : 'text-slate-300 italic'}>
                        {text || '-'}
                      </span>
                    </div>
                    <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: รายละเอียดที่ให้ Modify */}
          <div className="border border-slate-300 rounded-xl p-3 mb-4 bg-amber-50/40">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-amber-200 pb-1.5 mb-2 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>รายละเอียดที่ให้ Modify (Modification Instructions)</span>
            </h4>
            <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
              {job.modifyDetails || '- ไม่มีรายละเอียดระบุ -'}
            </p>
          </div>

          {/* Section 4: การส่งมอบและผลการตรวจสอบ */}
          <div className="grid grid-cols-3 gap-3 p-3 border border-slate-300 rounded-xl text-xs mb-4">
            <div>
              <span className="text-slate-500 font-medium block">ส่งมอบชิ้นงานให้ Engineer:</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{formatDateDisplay(job.engineerHandoverDate)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">ประมาณการส่งมอบคืน:</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{formatDateDisplay(job.estimatedReturnDate)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">ตรวจสอบวันที่:</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{formatDateDisplay(job.inspectionDate)}</span>
            </div>
          </div>

          {job.remarks && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 mb-4">
              <span className="font-bold text-slate-900">หมายเหตุ: </span>
              {job.remarks}
            </div>
          )}

          {/* Section 5: Signature Blocks for Factory Flow */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-300 text-center text-xs mt-6">
            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-800">ผู้ส่งคำขอ / Requester</span>
              <span className="block text-[11px] text-slate-500 mt-4">({job.requester || '...........................................'})</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./.......</span>
            </div>

            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-800">ผู้รับงาน / Engineer</span>
              <span className="block text-[11px] text-slate-500 mt-4">(...................................................)</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./.......</span>
            </div>

            <div className="border-t border-dashed border-slate-400 pt-2">
              <span className="block font-bold text-slate-800">ผู้ตรวจสอบ / QC Inspector</span>
              <span className="block text-[11px] text-slate-500 mt-4">(...................................................)</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./.......</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
