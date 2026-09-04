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
  Calculator,
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
import {
  getStoredTechnicians,
  parseTechnicians,
  formatTechniciansList,
} from '../utils/technicianStore';
import { ModifyDateEstimatorModal } from './ModifyDateEstimatorModal';

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
  const [isEstimatorModalOpen, setIsEstimatorModalOpen] = useState(false);

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

  const handleSelectWorkType = (type: 'GENERAL' | 'PAINTING') => {
    setWorkType(type);
    const newCalc = calculateEstimatedCompletion(baseDate, job.quantity, type);
    setEstimatedReturnDate(newCalc.calculatedDate);
  };

  const handleSelectInspectionResult = (res: 'WAITING' | 'COMPLETE' | 'EDIT') => {
    setInspectionResult(res);
    const today = getCurrentDateFormatted();
    if (res === 'COMPLETE') {
      if (!inspectionDate) setInspectionDate(today);
      setFinishStatus('FINISH');
    } else if (res === 'EDIT') {
      if (!inspectionDate) setInspectionDate(today);
      setFinishStatus('IN_PROGRESS');
      if (!engineerHandoverDate) setEngineerHandoverDate(today);
    } else if (res === 'WAITING') {
      // WAITING is only active when Finish Status is FINISH
      setFinishStatus('FINISH');
    }
  };

  const handleSelectFinishStatus = (status: ModifyJobItem['finishStatus']) => {
    setFinishStatus(status);
    const today = getCurrentDateFormatted();
    if (status === 'FINISH') {
      // If not marked COMPLETE or EDIT yet, mark as WAITING for QC
      if (inspectionResult !== 'COMPLETE' && inspectionResult !== 'EDIT') {
        setInspectionResult('WAITING');
      }
    } else if (status === 'IN_PROGRESS') {
      if (!engineerHandoverDate) {
        setEngineerHandoverDate(today);
        const autoCalc = calculateEstimatedCompletion(today, job.quantity, workType);
        if (!estimatedReturnDate) setEstimatedReturnDate(autoCalc.calculatedDate);
      }
      if (inspectionResult === 'WAITING' || inspectionResult === 'COMPLETE') {
        setInspectionResult('');
      }
    } else if (status === 'PENDING' || status === 'CANCELLED') {
      if (inspectionResult === 'WAITING' || inspectionResult === 'COMPLETE') {
        setInspectionResult('');
      }
    }
  };

  const handleQuickComplete = () => {
    const today = getCurrentDateFormatted();
    setInspectionDate(today);
    setInspectionResult('COMPLETE');
    setFinishStatus('FINISH');
  };

  const handleQuickEdit = () => {
    const today = getCurrentDateFormatted();
    setInspectionDate(today);
    setInspectionResult('EDIT');
    setFinishStatus('IN_PROGRESS');
    if (!engineerHandoverDate) setEngineerHandoverDate(today);
  };

  const handleQuickWaiting = () => {
    setFinishStatus('FINISH');
    setInspectionResult('WAITING');
  };

  const handleQuickHandover = () => {
    const today = getCurrentDateFormatted();
    setEngineerHandoverDate(today);
    setFinishStatus('IN_PROGRESS');
    const autoCalc = calculateEstimatedCompletion(today, job.quantity, workType);
    setEstimatedReturnDate(autoCalc.calculatedDate);
    if (!shipmentDate) {
      setShipmentDate(autoCalc.calculatedDate);
    }
    if (inspectionResult === 'WAITING' || inspectionResult === 'COMPLETE') {
      setInspectionResult('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-blue-500/30 text-blue-200 font-mono font-bold border border-blue-400/30">
                {job.id}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">อัปเดตสถานะงาน Modify</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              ลูกค้า: <strong className="text-white">{job.customer || '-'}</strong> | SO: <strong className="text-white">{job.saleSoNo || '-'}</strong> | จำนวน: <strong className="text-blue-300">{job.quantity}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="p-3 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="text-slate-500 font-bold self-center mr-1">ปุ่มลัด:</span>
          <button
            type="button"
            onClick={handleQuickHandover}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            ⚙️ เริ่มงานวันนี้
          </button>
          <button
            type="button"
            onClick={handleQuickWaiting}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            ⏳ รอตรวจ (WAITING)
          </button>
          <button
            type="button"
            onClick={handleQuickComplete}
            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            ✅ ตรวจ COMPLETE & FINISH
          </button>
          <button
            type="button"
            onClick={handleQuickEdit}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            ⚠️ ตรวจ EDIT (ส่งแก้)
          </button>
          <button
            type="button"
            onClick={() => setIsEstimatorModalOpen(true)}
            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-950 rounded-xl font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1 ml-auto"
          >
            <Calculator className="w-3.5 h-3.5 text-blue-700" />
            <span>⚡ คำนวณวันเวลา (+7 วัน)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-5 flex-1 text-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  ช่างผู้ทำ / ผู้รับผิดชอบ (Technician)
                </label>
                <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.2 rounded">
                  3 ช่างหลัก: ฟารอส, ช่างรักษ์, มีน
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  placeholder="เช่น ฟารอส, ช่างรักษ์, มีน"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold text-slate-800"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Quick chips for selecting technicians */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-500 font-medium">กดเลือกช่าง:</span>
                {getStoredTechnicians().map((t) => {
                  const selectedTechs = parseTechnicians(technician);
                  const isSelected = selectedTechs.some((st) => st.toLowerCase() === t.name.toLowerCase());

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        let next: string[];
                        if (isSelected) {
                          next = selectedTechs.filter((st) => st.toLowerCase() !== t.name.toLowerCase());
                        } else {
                          next = [...selectedTechs, t.name];
                        }
                        setTechnician(formatTechniciansList(next));
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#2c241c] text-white border-[#2c241c] shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-slate-400'}`} />
                      <span>{t.name}</span>
                      {isSelected && <span className="text-[9px] text-amber-300">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ประเภทงาน (Work Type)
              </label>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectWorkType('GENERAL')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    workType !== 'PAINTING'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ทั่วไป
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectWorkType('PAINTING')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    workType === 'PAINTING'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🎨 ทำสี
                </button>
              </div>
            </div>
          </div>

          {/* ระดับความเร่งด่วน (Urgency Status) */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-slate-700">สถานะความเร่งด่วน:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {URGENCY_OPTIONS.map((opt) => {
                  const isSelected = (urgencyLevel || 'NORMAL') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgencyLevel(opt.value)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? opt.value === 'VERY_URGENT'
                            ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                            : opt.value === 'URGENT'
                            ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                            : 'bg-slate-800 text-white shadow-xs ring-2 ring-slate-400'
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  วันที่ช่างรับสินค้า
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
                    className="text-[10px] text-blue-700 hover:text-blue-900 font-bold bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer"
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
                  ประมาณการส่งมอบคืน
                </label>
                <button
                  type="button"
                  onClick={handleApplyCalculatedReturn}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="คำนวณจากเกณฑ์จำนวน"
                >
                  <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                  <span>+{calculated.workingDays} วัน</span>
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
                  Shipment Date (กำหนดส่ง)
                </label>
                <button
                  type="button"
                  onClick={handleSyncShipmentWithEstimate}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="อ้างอิงจากวันประมาณการส่งมอบคืน"
                >
                  <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                  <span>ตามวันประมาณการ</span>
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
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                ผลการตรวจสอบ (Inspection Result)
              </label>
              <span className="text-[11px] text-slate-500">
                {finishStatus === 'FINISH' ? (
                  <span className="text-amber-800 font-bold">⚡ งาน FINISH แล้ว: สถานะ WAITING พร้อมรอตรวจ QC</span>
                ) : (
                  <span className="text-slate-400">สถานะ WAITING จะแสดงเมื่อสถานะงานเป็น FINISH</span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectInspectionResult('WAITING')}
                className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  finishStatus === 'FINISH' && (inspectionResult === 'WAITING' || inspectionResult === 'PENDING' || !inspectionResult)
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/50'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>⏳ WAITING</span>
                  <span className="text-[11px] font-normal opacity-90">(รอตรวจ)</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">
                  {finishStatus === 'FINISH' ? 'งานเสร็จแล้ว รอ QC ตรวจสอบ' : 'คลิกเพื่อตั้งค่าเป็น FINISH & รอตรวจ'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectInspectionResult('COMPLETE')}
                className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  inspectionResult === 'COMPLETE' || inspectionResult === 'PASS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>✅ COMPLETE</span>
                  <span className="text-[11px] font-normal opacity-90">(ตรวจผ่าน QC)</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">ผ่านการตรวจสอบคุณภาพ</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectInspectionResult('EDIT')}
                className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  inspectionResult === 'EDIT' || inspectionResult === 'REJECT'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>⚠️ EDIT</span>
                  <span className="text-[11px] font-normal opacity-90">(ส่งกลับแก้ไข)</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">ไม่ผ่าน QC ส่งกลับให้ช่างแก้ไข</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              สถานะงาน (Finish Status) - คลิกเปลี่ยนสถานะได้
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
              <button
                type="button"
                onClick={() => handleSelectFinishStatus('PENDING')}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
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
                onClick={() => handleSelectFinishStatus('IN_PROGRESS')}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  finishStatus === 'IN_PROGRESS'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>⚙️ IN_PROGRESS</span>
                <span className="text-[10px] opacity-80 font-normal">กำลังดำเนินการ</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFinishStatus('FINISH')}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  finishStatus === 'FINISH'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>✅ FINISH</span>
                <span className="text-[10px] opacity-80 font-normal">เสร็จสมบูรณ์ (รอ QC)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFinishStatus('CANCELLED')}
                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
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

          {/* Live Status Preview Banner */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">สรุปสถานะที่จะบันทึก:</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">สถานะงาน:</span>
                <span
                  className={`px-3 py-1 rounded-lg font-bold text-xs shadow-2xs ${
                    finishStatus === 'FINISH'
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/40'
                      : finishStatus === 'IN_PROGRESS'
                      ? 'bg-amber-500 text-white ring-2 ring-amber-400/40'
                      : finishStatus === 'CANCELLED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {finishStatus === 'FINISH'
                    ? '🟢 เสร็จสมบูรณ์ (FINISH)'
                    : finishStatus === 'IN_PROGRESS'
                    ? '🟡 กำลังดำเนินการ (IN PROGRESS)'
                    : finishStatus === 'CANCELLED'
                    ? '🚫 ยกเลิก (CANCELLED)'
                    : '⚪ รอดำเนินการ (PENDING)'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">ผล QC:</span>
                <span
                  className={`px-3 py-1 rounded-lg font-bold text-xs shadow-2xs ${
                    inspectionResult === 'COMPLETE' || inspectionResult === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : inspectionResult === 'EDIT' || inspectionResult === 'REJECT'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : finishStatus === 'FINISH'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {inspectionResult === 'COMPLETE' || inspectionResult === 'PASS'
                    ? '✅ ตรวจผ่าน (QC Pass)'
                    : inspectionResult === 'EDIT' || inspectionResult === 'REJECT'
                    ? '⚠️ ส่งกลับแก้ไข (QC Edit)'
                    : finishStatus === 'FINISH'
                    ? '⏳ รอตรวจ (WAITING QC)'
                    : '- ยังไม่ถึงขั้นตรวจ (รอช่าง FINISH) -'}
                </span>
              </div>
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
              className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* Date Estimator Modal */}
      <ModifyDateEstimatorModal
        isOpen={isEstimatorModalOpen}
        onClose={() => setIsEstimatorModalOpen(false)}
        initialSoDate={job.requestDate || getCurrentDateFormatted()}
        initialQuantity={job.quantity}
        initialWorkType={workType === 'PAINTING' ? 'PAINTING' : 'GENERAL'}
        onApply={(calculated) => {
          setEngineerHandoverDate(calculated.receiveDate);
          setEstimatedReturnDate(calculated.estimatedReturnDate);
          setShipmentDate(calculated.shipmentDate);
          setWorkType(calculated.workType);
          if (calculated.receiveDate && finishStatus === 'PENDING') {
            setFinishStatus('IN_PROGRESS');
          }
        }}
      />
    </div>
  );
};
