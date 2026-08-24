import React from 'react';
import {
  Bell,
  AlertTriangle,
  Calendar,
  User,
  Building,
  FileText,
  Clock,
  X,
  CheckCircle2,
  ExternalLink,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import { formatDateDisplay } from '../utils/formatters';

interface DeliveryAlertModalProps {
  isOpen: boolean;
  alertJobs: ModifyJobItem[];
  onClose: () => void;
  onSelectJob?: (job: ModifyJobItem) => void;
}

export const DeliveryAlertModal: React.FC<DeliveryAlertModalProps> = ({
  isOpen,
  alertJobs,
  onClose,
  onSelectJob,
}) => {
  if (!isOpen || alertJobs.length === 0) return null;

  return (
    <div
      id="delivery-alert-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="delivery-alert-modal-container"
        className="bg-white rounded-3xl shadow-2xl border-2 border-rose-500/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Blinking / Pulsing Alert Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 p-4 sm:p-5 text-white relative overflow-hidden">
          {/* Subtle animated background glow */}
          <div className="absolute inset-0 bg-white/10 opacity-50 animate-pulse pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-lg animate-bounce">
                <Bell className="w-6 h-6 text-amber-200 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-rose-950 text-[11px] font-black tracking-wide uppercase animate-pulse shadow-xs">
                    ⚡ แจ้งเตือนด่วน (URGENT ALERT)
                  </span>
                  <span className="text-xs text-rose-100 font-semibold">
                    เหลือ 1 วันก่อนวันส่งมอบ
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
                  <span>แจ้งเตือนก่อนวันนัดส่งมอบงาน 1 วัน</span>
                  <span className="text-sm bg-rose-800/80 px-2.5 py-0.5 rounded-full font-bold">
                    {alertJobs.length} รายการ
                  </span>
                </h2>
              </div>
            </div>

            <button
              id="delivery-alert-top-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="ปิดหน้าต่างแจ้งเตือน (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pulsing Alert Banner Text */}
          <div className="mt-3.5 p-2.5 rounded-xl bg-rose-900/60 border border-rose-400/60 flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-200 animate-pulse shadow-inner">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              กรุณาเร่งรัดตรวจสอบความพร้อมของชิ้นงานและประสานงานฝ่ายที่เกี่ยวข้องก่อนส่งมอบวันพรุ่งนี้!
            </span>
          </div>
        </div>

        {/* Job Alert Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/70">
          {alertJobs.map((job, idx) => {
            const workTitle =
              (job.workDetails && job.workDetails.find((d) => d && d.trim() !== '')) ||
              job.modifyDetails ||
              job.id;

            const deliveryDateStr =
              job.shipmentDate ||
              job.estimatedReturnDate ||
              '-';

            return (
              <div
                key={job.id || idx}
                id={`delivery-alert-item-${job.id}`}
                className="bg-white rounded-2xl border-2 border-amber-300 hover:border-amber-400 shadow-md p-4 transition-all relative overflow-hidden"
              >
                {/* Top strip banner */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-black text-xs shadow-xs">
                      SO: {job.saleSoNo || job.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] animate-pulse">
                      ⏳ นัดส่งมอบ: {formatDateDisplay(deliveryDateStr)} (พรุ่งนี้)
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500">
                    รหัสงาน: {job.id}
                  </span>
                </div>

                {/* Main Job Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* 1. SO No. & Job Name */}
                  <div className="space-y-1 sm:col-span-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      <span>ชื่องาน / รายละเอียด Modify:</span>
                    </div>
                    <p className="text-slate-900 font-black text-sm leading-snug">
                      {workTitle}
                    </p>
                    {job.modifyDetails && job.modifyDetails !== workTitle && (
                      <p className="text-slate-600 text-[11px] line-clamp-2 mt-0.5">
                        {job.modifyDetails}
                      </p>
                    )}
                  </div>

                  {/* 2. Project Name */}
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      <span>ชื่อโครงการ / ลูกค้า:</span>
                    </div>
                    <p className="text-slate-900 font-bold text-xs truncate">
                      {job.project || job.customer || '-'}
                    </p>
                    {job.customer && job.project && job.customer !== job.project && (
                      <p className="text-slate-500 text-[10px] truncate">
                        ลูกค้า: {job.customer}
                      </p>
                    )}
                  </div>

                  {/* 3. Sale Name */}
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ชื่อเซลล์ (Sale Representative):</span>
                    </div>
                    <p className="text-slate-900 font-bold text-xs">
                      {job.sale || job.requester || '-'}
                    </p>
                    {job.requester && job.requester !== job.sale && (
                      <p className="text-slate-500 text-[10px]">
                        ผู้เปิดงาน: {job.requester}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Info: Quantity & Technician */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-3">
                    <span>
                      <strong>จำนวน:</strong> {job.quantity || '1 รายการ'}
                    </span>
                    {job.technician && (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Wrench className="w-3 h-3 text-slate-500" />
                        <strong>ช่าง:</strong> {job.technician}
                      </span>
                    )}
                  </div>

                  {onSelectJob && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectJob(job);
                        onClose();
                      }}
                      className="text-blue-700 hover:text-blue-900 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>ดูรายละเอียด & อัปเดตสถานะ</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>
              ระบบจะแสดงการแจ้งเตือนนี้ล่วงหน้า 1 วันก่อนวันนัดส่งมอบงาน
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="delivery-alert-close-btn"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>รับทราบ & ปิด (Close)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
