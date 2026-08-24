import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  Save,
  Wrench,
  CheckCheck,
  XCircle,
  UserCheck,
  Zap,
  Palette,
} from 'lucide-react';
import { ModifyJobItem, JobUrgencyLevel } from '../types';
import {
  getCurrentDateFormatted,
  calculateEstimatedCompletion,
  detectIsPaintingJob,
  formatDateDisplay,
  parseUrgencyLevel,
  URGENCY_OPTIONS,
} from '../utils/formatters';

interface StatusUpdateModalProps {
  job: ModifyJobItem | null;
  isOpen: boolean;
  isLoading: boolean;
  onSave: (updatedJob: ModifyJobItem) => Promise<void>;
  onClose: () => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  job,
  isOpen,
  isLoading,
  onSave,
  onClose,
}) => {
  const [technician, setTechnician] = useState('');
  const [workType, setWorkType] = useState<'GENERAL' | 'PAINTING' | string>('GENERAL');
  const [urgencyLevel, setUrgencyLevel] = useState<JobUrgencyLevel>('NORMAL');
  const [shipmentDate, setShipmentDate] = useState('');
  const [engineerHandoverDate, setEngineerHandoverDate] = useState('');
  const [estimatedReturnDate, setEstimatedReturnDate] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionResult, setInspectionResult] = useState<ModifyJobItem['inspectionResult']>('WAITING');
  const [finishStatus, setFinishStatus] = useState<ModifyJobItem['finishStatus']>('PENDING');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (job) {
      setTechnician(job.technician || '');
      setWorkType(job.workType || (detectIsPaintingJob(job.modifyDetails) ? 'PAINTING' : 'GENERAL'));
      setUrgencyLevel(parseUrgencyLevel(job.urgencyLevel));
      setShipmentDate(job.shipmentDate || '');
      setEngineerHandoverDate(job.engineerHandoverDate || '');
      setEstimatedReturnDate(job.estimatedReturnDate || '');
      setInspectionDate(job.inspectionDate || '');
      setInspectionResult(job.inspectionResult || 'WAITING');
      setFinishStatus(job.finishStatus || 'PENDING');
      setRemarks(job.remarks || '');
    }
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  const baseDate = engineerHandoverDate || job.requestDate || getCurrentDateFormatted();
  const calculated = calculateEstimatedCompletion(baseDate, job.quantity, workType);

  const handleApplyCalculatedReturn = () => {
    setEstimatedReturnDate(calculated.calculatedDate);
    if (!shipmentDate || shipmentDate === estimatedReturnDate) {
      setShipmentDate(calculated.calculatedDate);
    }
  };

  const handleSyncShipmentWithEstimate = () => {
    const targetDate = estimatedReturnDate || calculated.calculatedDate;
    if (targetDate) {
      setShipmentDate(targetDate);
    }
  };

  const handleQuickComplete = () => {
    setInspectionDate(getCurrentDateFormatted());
    setInspectionResult('COMPLETE');
    setFinishStatus('FINISH');
  };

  const handleQuickEdit = () => {
    setInspectionDate(getCurrentDateFormatted());
    setInspectionResult('EDIT');
    setFinishStatus('IN_PROGRESS');
  };

  const handleQuickWaiting = () => {
    setInspectionResult('WAITING');
  };

  const handleQuickHandover = () => {
    const today = getCurrentDateFormatted();
    setEngineerHandoverDate(today);
    setFinishStatus('IN_PROGRESS');
    if (!estimatedReturnDate) {
      const autoCalc = calculateEstimatedCompletion(today, job.quantity, workType);
      setEstimatedReturnDate(autoCalc.calculatedDate);
      if (!shipmentDate) {
        setShipmentDate(autoCalc.calculatedDate);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ModifyJobItem = {
      ...job,
      technician,
      workType,
      urgencyLevel,
      shipmentDate,
      engineerHandoverDate,
      estimatedReturnDate,
      inspectionDate,
      inspectionResult,
      finishStatus,
      remarks,
    };
    await onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 font-mono font-bold">
                {job.id}
              </span>
              <h3 className="text-base font-bold text-white">อัปเดตสถานะงาน Modify</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 truncate max-w-sm">
              ลูกค้า: {job.customer} | SO: {job.saleSoNo || '-'} | จำนวน: {job.quantity}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium self-center mr-1">ปุ่มลัด:</span>
          <button
            type="button"
            onClick={handleQuickHandover}
            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-medium transition-colors"
          >
            ⚙️ เริ่มงานวันนี้
          </button>
          <button
            type="button"
            onClick={handleQuickWaiting}
            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
          >
            ⏳ รอตรวจ (WAITING)
          </button>
          <button
            type="button"
            onClick={handleQuickComplete}
            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold transition-colors"
          >
            ✅ ตรวจ COMPLETE & FINISH
          </button>
          <button
            type="button"
            onClick={handleQuickEdit}
            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg font-bold transition-colors"
          >
            ⚠️ ตรวจ EDIT (ส่งแก้)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ช่างผู้ทำ / ผู้รับผิดชอบ (Technician)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  placeholder="เช่น ช่างเอก, ช่างสมพร, ช่างวินัย"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold text-slate-800"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ประเภทงาน (Work Type)
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setWorkType('GENERAL')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                    workType !== 'PAINTING'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ทั่วไป
                </button>
                <button
                  type="button"
                  onClick={() => setWorkType('PAINTING')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                    workType === 'PAINTING'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🎨 ทำสี
                </button>
              </div>
            </div>
          </div>

          {/* ระดับความเร่งด่วน (Urgency Status) */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">สถานะความเร่งด่วน:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {URGENCY_OPTIONS.map((opt) => {
                  const isSelected = (urgencyLevel || 'NORMAL') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgencyLevel(opt.value)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? opt.value === 'VERY_URGENT'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : opt.value === 'URGENT'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-700 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  ชื่อผู้รับผิดชอบ / วันที่ส่งมอบงาน
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const today = getCurrentDateFormatted();
                      setEngineerHandoverDate(today);
                      setFinishStatus('IN_PROGRESS');
                      const autoCalc = calculateEstimatedCompletion(today, job.quantity, workType);
                      setEstimatedReturnDate(autoCalc.calculatedDate);
                    }}
                    className="text-[10px] text-blue-700 hover:text-blue-900 font-bold bg-blue-50 px-1.5 py-0.5 rounded"
                  >
                    เริ่มวันนี้
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={engineerHandoverDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setEngineerHandoverDate(val);
                  if (val && finishStatus === 'PENDING') {
                    setFinishStatus('IN_PROGRESS');
                  }
                  if (val) {
                    const autoCalc = calculateEstimatedCompletion(val, job.quantity, workType);
                    setEstimatedReturnDate(autoCalc.calculatedDate);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-bold text-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  ประมาณการส่งมอบคืนวันที่
                </label>
                <button
                  type="button"
                  onClick={handleApplyCalculatedReturn}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5"
                  title="คำนวณจากเกณฑ์จำนวน"
                >
                  <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                  <span>+ {calculated.workingDays} วันทำการ</span>
                </button>
              </div>
              <input
                type="date"
                value={estimatedReturnDate}
                onChange={(e) => setEstimatedReturnDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-amber-300 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-hidden font-semibold text-amber-950"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Shipment Date (กำหนดส่งมอบสินค้า)
                </label>
                <button
                  type="button"
                  onClick={handleSyncShipmentWithEstimate}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5"
                  title="อ้างอิงจากวันประมาณการส่งมอบคืน"
                >
                  <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                  <span>อ้างอิงวันประมาณการ</span>
                </button>
              </div>
              <input
                type="date"
                value={shipmentDate}
                onChange={(e) => setShipmentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ตรวจสอบวันที่
              </label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ผลการตรวจสอบ (Inspection Result)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInspectionResult('WAITING')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                    inspectionResult === 'WAITING' || inspectionResult === 'PENDING' || !inspectionResult
                      ? 'bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-400/40'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>⏳ WAITING</span>
                  <span className="text-[10px] opacity-80 font-normal">รอตรวจ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInspectionResult('COMPLETE');
                    if (!inspectionDate) setInspectionDate(getCurrentDateFormatted());
                    if (finishStatus !== 'FINISH') setFinishStatus('FINISH');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                    inspectionResult === 'COMPLETE' || inspectionResult === 'PASS'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>✅ COMPLETE</span>
                  <span className="text-[10px] opacity-80 font-normal">ผ่าน / ตรวจเสร็จ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInspectionResult('EDIT');
                    if (!inspectionDate) setInspectionDate(getCurrentDateFormatted());
                    if (finishStatus === 'FINISH') setFinishStatus('IN_PROGRESS');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                    inspectionResult === 'EDIT' || inspectionResult === 'REJECT'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-400/40'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>⚠️ EDIT</span>
                  <span className="text-[10px] opacity-80 font-normal">ส่งกลับแก้ไข</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              สถานะงาน (Finish Status) - คลิกเปลี่ยนสถานะได้
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFinishStatus('PENDING')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                  finishStatus === 'PENDING'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>⏳ PENDING</span>
                <span className="text-[10px] opacity-80 font-normal">รอดำเนินการ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFinishStatus('IN_PROGRESS');
                  if (!engineerHandoverDate) {
                    setEngineerHandoverDate(getCurrentDateFormatted());
                  }
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                  finishStatus === 'IN_PROGRESS'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>⚙️ IN_PROGRESS</span>
                <span className="text-[10px] opacity-80 font-normal">กำลังดำเนินงาน</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFinishStatus('FINISH');
                  if (!inspectionDate) {
                    setInspectionDate(getCurrentDateFormatted());
                  }
                  if (inspectionResult === 'WAITING' || !inspectionResult) {
                    setInspectionResult('PASS');
                  }
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                  finishStatus === 'FINISH'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>✅ FINISH</span>
                <span className="text-[10px] opacity-80 font-normal">เสร็จสมบูรณ์</span>
              </button>

              <button
                type="button"
                onClick={() => setFinishStatus('CANCELLED')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                  finishStatus === 'CANCELLED'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>🚫 CANCELLED</span>
                <span className="text-[10px] opacity-80 font-normal">ยกเลิก</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หมายเหตุ / บันทึกผลการแก้ไข
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="เช่น แก้ไขเสร็จเรียบร้อย ชิ้นงานผ่านสเปกตามแบบ..."
              className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>อัปเดตลง Google Sheet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
