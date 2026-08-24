import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Calendar,
  Zap,
  UserCheck,
  Palette,
  CheckCircle2,
  Clock,
  Wrench,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  getCurrentDateFormatted,
  calculateEstimatedCompletion,
  detectIsPaintingJob,
  formatDateDisplay,
  addWorkingDays,
} from '../utils/formatters';

interface StartWorkModalProps {
  job: ModifyJobItem | null;
  isOpen: boolean;
  isLoading: boolean;
  onConfirmStart: (updatedJob: ModifyJobItem) => Promise<void>;
  onClose: () => void;
}

export const StartWorkModal: React.FC<StartWorkModalProps> = ({
  job,
  isOpen,
  isLoading,
  onConfirmStart,
  onClose,
}) => {
  const [startDate, setStartDate] = useState('');
  const [workType, setWorkType] = useState<'GENERAL' | 'PAINTING' | string>('GENERAL');
  const [technician, setTechnician] = useState('');
  const [syncShipment, setSyncShipment] = useState(true);
  const [customEstimatedReturn, setCustomEstimatedReturn] = useState('');

  useEffect(() => {
    if (job) {
      const defaultStart = job.engineerHandoverDate || getCurrentDateFormatted();
      const detectedType =
        job.workType || (detectIsPaintingJob(job.modifyDetails) ? 'PAINTING' : 'GENERAL');
      setStartDate(defaultStart);
      setWorkType(detectedType);
      setTechnician(job.technician || '');

      const calc = calculateEstimatedCompletion(defaultStart, job.quantity, detectedType);
      setCustomEstimatedReturn(job.estimatedReturnDate || calc.calculatedDate);
      setSyncShipment(true);
    }
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  // Auto calculate completion based on selected startDate and workType
  const calculation = calculateEstimatedCompletion(
    startDate || getCurrentDateFormatted(),
    job.quantity,
    workType
  );

  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    const newCalc = calculateEstimatedCompletion(newDate, job.quantity, workType);
    setCustomEstimatedReturn(newCalc.calculatedDate);
  };

  const handleWorkTypeChange = (newType: 'GENERAL' | 'PAINTING') => {
    setWorkType(newType);
    const newCalc = calculateEstimatedCompletion(startDate, job.quantity, newType);
    setCustomEstimatedReturn(newCalc.calculatedDate);
  };

  const handleSetQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    handleStartDateChange(dateStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    const returnDate = customEstimatedReturn || calculation.calculatedDate;
    const updated: ModifyJobItem = {
      ...job,
      engineerHandoverDate: startDate,
      workType,
      technician: technician.trim() || job.technician,
      estimatedReturnDate: returnDate,
      shipmentDate: syncShipment ? returnDate : job.shipmentDate || returnDate,
      finishStatus: 'IN_PROGRESS',
    };

    await onConfirmStart(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-900/40 text-amber-100 font-mono font-bold">
                  {job.id}
                </span>
                <h3 className="text-base font-bold text-white">เริ่มปฏิบัติงาน (Start Work)</h3>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                กำหนดวันเริ่มงานของ Engineer เพื่อเปลี่ยนสถานะเป็น "กำลังดำเนินการ"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Job Info Summary */}
        <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 text-xs">
          <div className="grid grid-cols-2 gap-2 text-slate-700">
            <div>
              <span className="text-slate-500 font-medium block">ลูกค้า:</span>
              <strong className="text-slate-900 font-bold">{job.customer}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">SO No:</span>
              <strong className="text-slate-900 font-bold">{job.saleSoNo || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">จำนวนชิ้นงาน:</span>
              <strong className="text-blue-700 font-bold">{job.quantity || '1'}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">วันที่ Request:</span>
              <strong className="text-slate-900">{formatDateDisplay(job.requestDate)}</strong>
            </div>
          </div>
          {job.modifyDetails && (
            <div className="mt-2 pt-2 border-t border-amber-200/60 text-slate-700 line-clamp-2">
              <span className="text-slate-500 font-medium mr-1">รายละเอียด:</span>
              <span>{job.modifyDetails}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800">
          {/* Work Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ประเภทงาน (Work Type)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleWorkTypeChange('GENERAL')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  workType !== 'PAINTING'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Modify ทั่วไป</span>
              </button>
              <button
                type="button"
                onClick={() => handleWorkTypeChange('PAINTING')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  workType === 'PAINTING'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>🎨 งานทำสี (Painting)</span>
              </button>
            </div>
          </div>

          {/* Start Date & Quick Shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                วันที่เริ่มปฏิบัติงาน (Start Work Date) *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(0)}
                  className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-md transition-colors"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(-1)}
                  className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                >
                  เมื่อวาน
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(1)}
                  className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                >
                  พรุ่งนี้
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-amber-400 focus:border-amber-600 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-hidden font-bold text-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              * ข้อมูลนี้จะบันทึกลงช่อง <strong>"ส่งมอบชิ้นงานให้ engineer วันที่"</strong>
            </p>
          </div>

          {/* Technician Name */}
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
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-medium text-slate-800"
              />
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Auto Estimated Calculation Box */}
          <div className="p-3.5 bg-gradient-to-br from-amber-50 to-blue-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                คำนวณวันประมาณการส่งมอบคืน:
              </span>
              <span className="font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md">
                {calculation.workingDays} วันทำการ ({workType === 'PAINTING' ? 'งานทำสี' : 'ทั่วไป'})
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex-1">
                <label className="block text-[11px] text-slate-600 mb-1">
                  ประมาณการส่งมอบคืนวันที่:
                </label>
                <input
                  type="date"
                  value={customEstimatedReturn}
                  onChange={(e) => setCustomEstimatedReturn(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-amber-200/50">
              <input
                type="checkbox"
                id="syncShipmentCheck"
                checked={syncShipment}
                onChange={(e) => setSyncShipment(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="syncShipmentCheck" className="text-xs text-slate-700 cursor-pointer">
                อัปเดต <strong>Shipment Date</strong> ให้ตรงกับวันประมาณการนี้ด้วย
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading || !startDate}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-98 rounded-xl shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isLoading ? 'กำลังบันทึก...' : 'บันทึกเริ่มปฏิบัติงาน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
