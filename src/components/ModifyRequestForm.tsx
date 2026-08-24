import React, { useState, useEffect } from 'react';
import {
  Save,
  X,
  Calendar,
  Clock,
  User,
  Briefcase,
  Building,
  Hash,
  Truck,
  ListOrdered,
  Wrench,
  Layers,
  CheckCircle,
  HelpCircle,
  Sparkles,
  FileText,
  AlertCircle,
  Zap,
  Info,
  UserCheck,
  Palette,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  getCurrentDateFormatted,
  getCurrentMonthFormatted,
  getCurrentTimeFormatted,
  generateJobId,
  getWorkingDaysForQuantity,
  calculateEstimatedCompletion,
  GENERAL_WORKING_DAYS_RULES,
  PAINTING_WORKING_DAYS_RULES,
  detectIsPaintingJob,
  formatDateDisplay,
  URGENCY_OPTIONS,
  parseUrgencyLevel,
} from '../utils/formatters';

interface ModifyRequestFormProps {
  initialData?: ModifyJobItem | null;
  existingCount: number;
  isLoading: boolean;
  isOpen: boolean;
  currentUserEmail?: string;
  onSave: (job: ModifyJobItem) => Promise<void>;
  onClose: () => void;
}

export const ModifyRequestForm: React.FC<ModifyRequestFormProps> = ({
  initialData,
  existingCount,
  isLoading,
  isOpen,
  currentUserEmail,
  onSave,
  onClose,
}) => {
  const activeLoginEmail = currentUserEmail || 'tawatchai.works@gmail.com';

  const [formData, setFormData] = useState<ModifyJobItem>({
    id: generateJobId(existingCount),
    requestDate: getCurrentDateFormatted(),
    requestMonth: getCurrentMonthFormatted(),
    requestTime: getCurrentTimeFormatted(),
    requester: '',
    sale: '',
    saleSoNo: '',
    customer: '',
    project: '',
    shipmentDate: '',
    workDetails: Array(10).fill(''),
    workDetailQuantities: Array(10).fill(''),
    modifyDetails: '',
    workType: 'GENERAL',
    urgencyLevel: 'NORMAL',
    quantity: 1,
    technician: '',
    createdBy: activeLoginEmail,
    engineerHandoverDate: '',
    estimatedReturnDate: '',
    inspectionDate: '',
    inspectionResult: 'WAITING',
    finishStatus: 'PENDING',
    remarks: '',
  });

  const [bulkWorkDetailsInput, setBulkWorkDetailsInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [showRuleGuide, setShowRuleGuide] = useState(false);
  const [ruleGuideTab, setRuleGuideTab] = useState<'GENERAL' | 'PAINTING'>('GENERAL');
  const [hasManuallySetWorkType, setHasManuallySetWorkType] = useState(false);

  // Auto-calculated suggestion based on quantity, workType and start date
  const currentWorkType = formData.workType || 'GENERAL';
  const baseStartDate = formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted();
  const calculatedEstimate = calculateEstimatedCompletion(
    baseStartDate,
    formData.quantity,
    currentWorkType
  );

  useEffect(() => {
    if (initialData) {
      const paddedWorkDetails = [...(initialData.workDetails || [])];
      const paddedWorkDetailQuantities = [...(initialData.workDetailQuantities || [])];
      while (paddedWorkDetails.length < 10) {
        paddedWorkDetails.push('');
      }
      while (paddedWorkDetailQuantities.length < 10) {
        paddedWorkDetailQuantities.push('');
      }
      const initialWorkType = initialData.workType || (detectIsPaintingJob(initialData.modifyDetails) ? 'PAINTING' : 'GENERAL');
      const initialUrgency = parseUrgencyLevel(initialData.urgencyLevel);
      setFormData({
        ...initialData,
        workType: initialWorkType,
        urgencyLevel: initialUrgency,
        workDetails: paddedWorkDetails.slice(0, 10),
        workDetailQuantities: paddedWorkDetailQuantities.slice(0, 10),
      });
      setRuleGuideTab(initialWorkType as 'GENERAL' | 'PAINTING');
      setHasManuallySetWorkType(!!initialData.workType);
      
      const bulkFormatted = paddedWorkDetails
        .map((text, i) => {
          if (!text) return '';
          const qty = paddedWorkDetailQuantities[i];
          return qty ? `${text} (จำนวน ${qty} ชิ้น)` : text;
        })
        .filter(Boolean)
        .join('\n');
      setBulkWorkDetailsInput(bulkFormatted);
    } else {
      const todayDate = getCurrentDateFormatted();
      const defaultEstimate = calculateEstimatedCompletion(todayDate, 1, 'GENERAL');

      setFormData({
        id: generateJobId(existingCount),
        requestDate: todayDate,
        requestMonth: getCurrentMonthFormatted(),
        requestTime: getCurrentTimeFormatted(),
        requester: '',
        sale: '',
        saleSoNo: '',
        customer: '',
        project: '',
        shipmentDate: defaultEstimate.calculatedDate,
        workDetails: Array(10).fill(''),
        workDetailQuantities: Array(10).fill(''),
        modifyDetails: '',
        workType: 'GENERAL',
        urgencyLevel: 'NORMAL',
        quantity: 1,
        technician: '',
        createdBy: activeLoginEmail,
        engineerHandoverDate: todayDate,
        estimatedReturnDate: defaultEstimate.calculatedDate,
        inspectionDate: '',
        inspectionResult: 'WAITING',
        finishStatus: 'PENDING',
        remarks: '',
      });
      setRuleGuideTab('GENERAL');
      setHasManuallySetWorkType(false);
      setBulkWorkDetailsInput('');
    }
  }, [initialData, existingCount, isOpen]);

  if (!isOpen) return null;

  const handleWorkDetailChange = (index: number, value: string) => {
    const updated = [...formData.workDetails];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, workDetails: updated }));
  };

  const handleWorkDetailQtyChange = (index: number, qtyValue: string) => {
    const updated = [...(formData.workDetailQuantities || Array(10).fill(''))];
    updated[index] = qtyValue;
    setFormData((prev) => ({ ...prev, workDetailQuantities: updated }));
  };

  const handleFillAllQuantities = () => {
    const mainQty = formData.quantity || '1';
    const updated = formData.workDetails.map((detail) => (detail.trim() ? mainQty : ''));
    setFormData((prev) => ({ ...prev, workDetailQuantities: updated }));
  };

  const handleApplyBulkWorkDetails = () => {
    const lines = bulkWorkDetailsInput.split('\n').filter((l) => l.trim().length > 0);
    const updatedTexts = Array(10).fill('');
    const updatedQtys = Array(10).fill('');

    lines.slice(0, 10).forEach((line, idx) => {
      let cleaned = line.replace(/^\d+[\.\:\)]\s*/, '').trim();
      let extractedQty = '';

      const matchQty = cleaned.match(/(?:\[จำนวน[:\s]*([^\]]+)\]|\(จำนวน[:\s]*([^\)]+)\)|\[([^\]]+)\]|\(([0-9]+(?:\s*ชิ้น|\s*pcs)?)\))/i);
      if (matchQty) {
        extractedQty = (matchQty[1] || matchQty[2] || matchQty[3] || matchQty[4] || '').trim();
        cleaned = cleaned.replace(matchQty[0], '').trim();
      }

      updatedTexts[idx] = cleaned;
      updatedQtys[idx] = extractedQty || (formData.quantity ? String(formData.quantity) : '');
    });

    setFormData((prev) => ({
      ...prev,
      workDetails: updatedTexts,
      workDetailQuantities: updatedQtys,
    }));
    setShowBulkInput(false);
  };

  const handleApplyCalculatedDate = () => {
    setFormData((prev) => ({
      ...prev,
      estimatedReturnDate: calculatedEstimate.calculatedDate,
      shipmentDate: calculatedEstimate.calculatedDate,
    }));
  };

  const handleSyncShipmentWithEstimate = () => {
    const targetDate = formData.estimatedReturnDate || calculatedEstimate.calculatedDate;
    if (targetDate) {
      setFormData((prev) => ({
        ...prev,
        shipmentDate: targetDate,
      }));
    }
  };

  const handleWorkTypeChange = (newType: 'GENERAL' | 'PAINTING') => {
    setHasManuallySetWorkType(true);
    setRuleGuideTab(newType);
    const calc = calculateEstimatedCompletion(
      formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted(),
      formData.quantity,
      newType
    );
    setFormData((prev) => {
      const isShipmentSynced = !initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate;
      return {
        ...prev,
        workType: newType,
        estimatedReturnDate: !initialData || !prev.estimatedReturnDate ? calc.calculatedDate : prev.estimatedReturnDate,
        shipmentDate: isShipmentSynced ? calc.calculatedDate : prev.shipmentDate,
      };
    });
  };

  const handleQuantityChange = (val: string) => {
    const newQty = val;
    const calc = calculateEstimatedCompletion(
      formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted(),
      newQty,
      formData.workType || 'GENERAL'
    );
    setFormData((prev) => {
      const isShipmentSynced = !initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate;
      return {
        ...prev,
        quantity: newQty,
        estimatedReturnDate: !initialData ? calc.calculatedDate : prev.estimatedReturnDate,
        shipmentDate: isShipmentSynced ? calc.calculatedDate : prev.shipmentDate,
      };
    });
  };

  const handleHandoverDateChange = (val: string) => {
    const calc = calculateEstimatedCompletion(
      val || formData.requestDate || getCurrentDateFormatted(),
      formData.quantity,
      formData.workType || 'GENERAL'
    );
    setFormData((prev) => {
      const isShipmentSynced = !initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate;
      return {
        ...prev,
        engineerHandoverDate: val,
        estimatedReturnDate: !initialData || !prev.estimatedReturnDate ? calc.calculatedDate : prev.estimatedReturnDate,
        shipmentDate: isShipmentSynced ? calc.calculatedDate : prev.shipmentDate,
      };
    });
  };

  const handleModifyDetailsChange = (val: string) => {
    // If user hasn't explicitly locked the work type, auto-detect if "ทำสี" is mentioned
    let newWorkType = formData.workType || 'GENERAL';
    if (!hasManuallySetWorkType) {
      if (detectIsPaintingJob(val)) {
        newWorkType = 'PAINTING';
        setRuleGuideTab('PAINTING');
      } else {
        newWorkType = 'GENERAL';
        setRuleGuideTab('GENERAL');
      }
    }

    const calc = calculateEstimatedCompletion(
      formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted(),
      formData.quantity,
      newWorkType
    );

    setFormData((prev) => {
      const isShipmentSynced = !initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate;
      return {
        ...prev,
        modifyDetails: val,
        workType: newWorkType,
        estimatedReturnDate: !initialData && !hasManuallySetWorkType ? calc.calculatedDate : prev.estimatedReturnDate,
        shipmentDate: isShipmentSynced && !hasManuallySetWorkType ? calc.calculatedDate : prev.shipmentDate,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requester.trim()) {
      alert('กรุณากรอกชื่อผู้ส่งคำขอ');
      return;
    }
    if (!formData.customer.trim()) {
      alert('กรุณากรอกชื่อลูกค้า (Customer)');
      return;
    }
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{initialData ? 'แก้ไขข้อมูลงาน Modify' : 'สร้างคำขอ Modify ใหม่'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-mono">
                  {formData.id}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                บันทึกลง Google Sheet ตาราง Modify ครบถ้วนทั้ง 16 ข้อมูลสำคัญ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-slate-800">
          {/* Section 1: ข้อมูลคำขอ (Request Metadata) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-200">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">1. ข้อมูลเวลาและผู้ส่งคำขอ (Request Info)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่ Request <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.requestDate}
                  onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เดือนที่ Request <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.requestMonth}
                  onChange={(e) => setFormData({ ...formData, requestMonth: e.target.value })}
                  placeholder="เช่น สิงหาคม 2026"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เวลาที่ Request <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.requestTime}
                  onChange={(e) => setFormData({ ...formData, requestTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ผู้ส่งคำขอ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.requester}
                    onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                    placeholder="ระบุชื่อผู้ส่งคำขอ"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Google Login / Creator badge */}
              <div className="sm:col-span-2 md:col-span-4 bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">ชื่อ login เข้าใช้งาน (Google):</span>
                  <span className="text-xs font-bold text-slate-900 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-mono flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    {formData.createdBy || activeLoginEmail}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  สิทธิ์การเพิ่มโดย: <strong className="text-emerald-700 font-mono">tawatchai.works@gmail.com</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: ข้อมูลการขายและลูกค้า (Sales & Project Details) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-200">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">2. ข้อมูลการขายและโครงการ (Sales & Customer)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sale (ผู้ดูแลการขาย)
                </label>
                <input
                  type="text"
                  value={formData.sale}
                  onChange={(e) => setFormData({ ...formData, sale: e.target.value })}
                  placeholder="เช่น สมชาย / ธนภัทร"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sale So No. (เลขที่ SO)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.saleSoNo}
                    onChange={(e) => setFormData({ ...formData, saleSoNo: e.target.value })}
                    placeholder="เช่น SO-2026-0894"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cutomer (ลูกค้า) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    placeholder="เช่น บริษัท สยามออโต้พาร์ท จำกัด"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project (ชื่อโครงการ / งาน)
                </label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="เช่น New Line Assembly Jig"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              {/* ประเภทงาน (Work Type) */}
              <div className="sm:col-span-2 lg:col-span-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-0.5">
                      ประเภทงาน (Work Type)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      เลือกประเภทงานเพื่อคำนวณวันเสร็จและประมาณการส่งมอบคืนตามเกณฑ์
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleWorkTypeChange('GENERAL')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        formData.workType !== 'PAINTING'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>งาน Modify ทั่วไป</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWorkTypeChange('PAINTING')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        formData.workType === 'PAINTING'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>🎨 งานทำสี (Painting)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ระดับความเร่งด่วน (Urgency Level / Status) */}
              <div className="sm:col-span-2 lg:col-span-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-0.5 flex items-center gap-1.5">
                      <span>สถานะระดับความเร่งด่วน (Urgency Status)</span>
                      <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Google Sheet</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      ระบุสถานะงานปกติ งานด่วน หรือด่วนมาก เพื่อซิงค์กับ Google Sheet และจัดการคิวงาน
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {URGENCY_OPTIONS.map((opt) => {
                      const isSelected = (formData.urgencyLevel || 'NORMAL') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, urgencyLevel: opt.value })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? opt.value === 'VERY_URGENT'
                                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-600/30'
                                : opt.value === 'URGENT'
                                ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/30'
                                : 'bg-slate-700 text-white shadow-xs ring-2 ring-slate-700/30'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Shipment Date (กำหนดส่งมอบสินค้า)
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncShipmentWithEstimate}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors"
                    title="คลิกเพื่ออ้างอิงจากวันประมาณการส่งมอบคืน"
                  >
                    <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                    <span>อ้างอิงวันประมาณการ ({formatDateDisplay(formData.estimatedReturnDate || calculatedEstimate.calculatedDate)})</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.shipmentDate}
                    onChange={(e) => setFormData({ ...formData, shipmentDate: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold text-slate-800"
                  />
                  <Truck className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    จำนวน (Quantity) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRuleGuide(!showRuleGuide)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      เกณฑ์วัน ({calculatedEstimate.workingDays} วัน - {formData.workType === 'PAINTING' ? 'งานทำสี' : 'ทั่วไป'})
                    </span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="เช่น 10 หรือ 50 ชิ้น"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-bold text-blue-900"
                  />
                  <Layers className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Collapsible Quantity Working Days Rule Guide */}
            {showRuleGuide && (
              <div className="mt-3.5 p-3.5 bg-slate-100/90 border border-slate-300 rounded-xl text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ตารางเกณฑ์คำนวณวันทำการตามจำนวนชิ้นงาน (Lead-Time Rules)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRuleGuide(false)}
                    className="text-slate-500 hover:text-slate-800 font-bold"
                  >
                    ปิด
                  </button>
                </div>

                {/* Tabs to switch rules */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setRuleGuideTab('GENERAL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      ruleGuideTab === 'GENERAL'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🔨 เกณฑ์งาน Modify ทั่วไป
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleGuideTab('PAINTING')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      ruleGuideTab === 'PAINTING'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🎨 เกณฑ์กรณีงานทำสี (Painting)
                  </button>
                </div>

                {/* Rules Display Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1 text-[11px]">
                  {(ruleGuideTab === 'PAINTING' ? PAINTING_WORKING_DAYS_RULES : GENERAL_WORKING_DAYS_RULES).map(
                    (rule, idx) => {
                      const parsed = parseInt(String(formData.quantity), 10);
                      const isCurrent =
                        !isNaN(parsed) &&
                        parsed >= rule.min &&
                        parsed <= rule.max &&
                        formData.workType === ruleGuideTab;
                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg border transition-all ${
                            isCurrent
                              ? ruleGuideTab === 'PAINTING'
                                ? 'bg-purple-600 text-white font-bold border-purple-600 shadow-xs'
                                : 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="font-semibold">{rule.min} - {rule.max} ชิ้น</div>
                          <div
                            className={
                              isCurrent
                                ? 'text-white'
                                : ruleGuideTab === 'PAINTING'
                                ? 'text-purple-700 font-bold'
                                : 'text-blue-700 font-bold'
                            }
                          >
                            👉 ใช้เวลา {rule.days} วันทำการ
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
                <p className="text-[10px] text-slate-500 pt-1">
                  * คำนวณเฉพาะวันทำการ (ข้ามวันเสาร์-อาทิตย์) โดยเริ่มนับจากวันที่ส่งมอบชิ้นงานให้ Engineer
                </p>
              </div>
            )}
          </div>

          {/* Section 3: รายละเอียดงาน 10 บรรทัด & จำนวนชิ้น (10-Line Work Breakdown & Quantities) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  3. รายละเอียดงาน 10 บรรทัด & จำนวนชิ้น (10-Line Work & Quantity Breakdown)
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleFillAllQuantities}
                  title="คัดลอกจำนวนชิ้นรวมจากส่วนที่ 2 มาใส่ในทุกรายการงานที่มีข้อความ"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                >
                  ⚡ ใส่จำนวน {formData.quantity || '1'} ทุกข้อ
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkInput(!showBulkInput)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 self-start sm:self-auto bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                >
                  {showBulkInput ? 'สลับเป็นแบบกรอกทีละบรรทัด' : 'วางข้อความหลายบรรทัด (Bulk Paste)'}
                </button>
              </div>
            </div>

            {showBulkInput ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  วางข้อความของคุณที่นี่ (สามารถระบุจำนวน เช่น <code>1. กัดร่อง 5 ชิ้น</code> หรือ <code>ตรวจ Jig (จำนวน 2 ชิ้น)</code> ได้):
                </p>
                <textarea
                  rows={8}
                  value={bulkWorkDetailsInput}
                  onChange={(e) => setBulkWorkDetailsInput(e.target.value)}
                  placeholder="บรรทัดที่ 1: ตรวจสอบขนาด Jig Base (จำนวน 2 ชิ้น)&#10;บรรทัดที่ 2: กัดร่องสล็อตเพิ่ม 2 mm - 2 ชิ้น&#10;บรรทัดที่ 3: เจาะรูต๊าปเกลียว M6 [4 ชิ้น]..."
                  className="w-full p-3 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleApplyBulkWorkDetails}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  นำไปใส่ใน 10 บรรทัด
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {formData.workDetails.map((detail, index) => {
                  const qtyValue = formData.workDetailQuantities?.[index] !== undefined
                    ? formData.workDetailQuantities[index]
                    : '';
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-300 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={detail}
                        onChange={(e) => handleWorkDetailChange(index, e.target.value)}
                        placeholder={`รายละเอียดงานข้อที่ ${index + 1}`}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs sm:text-sm bg-transparent border-0 focus:ring-0 outline-hidden text-slate-800 placeholder:text-slate-400"
                      />
                      <div className="flex items-center gap-1 shrink-0 border-l border-slate-200 pl-2 pr-1">
                        <input
                          type="text"
                          value={qtyValue}
                          onChange={(e) => handleWorkDetailQtyChange(index, e.target.value)}
                          placeholder="จำนวน"
                          title={`จำนวนชิ้นสำหรับรายการที่ ${index + 1}`}
                          className="w-16 sm:w-20 px-2 py-1 text-xs text-center font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden text-emerald-900 placeholder:text-slate-400"
                        />
                        <span className="text-[11px] text-slate-400 font-medium">ชิ้น</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: รายละเอียดที่ให้ Modify (Modification Requirements) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  4. รายละเอียดที่ให้ Modify (Modification Scope)
                </h3>
              </div>
              {formData.workType === 'PAINTING' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 self-start sm:self-auto">
                  <Palette className="w-3 h-3 text-purple-600" />
                  <span>งานทำสี (ระบบใช้เกณฑ์ 3, 4, 7, 10, 15 วันทำการ)</span>
                </span>
              )}
            </div>
            <div>
              <textarea
                rows={3}
                required
                value={formData.modifyDetails}
                onChange={(e) => handleModifyDetailsChange(e.target.value)}
                placeholder="ระบุจุดที่ต้องดัดแปลงแก้ไข, สเปกที่ต้องปรับปรุง, สาเหตุ, เครื่องมือหรือ Drawing อ้างอิง (หากระบุคำว่า ทำสี/พ่นสี ระบบจะเลือกเกณฑ์งานทำสีให้อัตโนมัติ)..."
                className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-hidden"
              />
            </div>
          </div>

          {/* Section 5: ช่างผู้ทำ, การส่งมอบ Engineer, ประมาณการเสร็จ และตรวจ QC */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  5. ช่างผู้รับผิดชอบ & ติดตามสถานะงาน (Technician & Tracking)
                </h3>
              </div>

              {/* Quick Auto-calculate banner */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleApplyCalculatedDate}
                  title="คลิกเพื่อใส่วันประมาณการที่คำนวณได้ลงในช่อง"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-all shadow-xs active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>คำนวณวันเสร็จ: {calculatedEstimate.calculatedDate ? formatDateDisplay(calculatedEstimate.calculatedDate) : '-'} ({calculatedEstimate.workingDays} วัน)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {/* ช่างผู้ทำ (Technician) */}
              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ช่างผู้ทำ / ผู้รับผิดชอบ (Technician)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.technician || ''}
                    onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                    placeholder="เช่น ช่างเอก, ช่างสมพร, ช่างวินัย"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold text-slate-800"
                  />
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* ชื่อผู้รับผิดชอบ / ส่งมอบงานให้ engineer วันที่ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้รับผิดชอบ / ส่งมอบงาน วันที่
                </label>
                <input
                  type="date"
                  value={formData.engineerHandoverDate}
                  onChange={(e) => handleHandoverDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              {/* ประมาณการส่งมอบคืนวันที่ */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    ประมาณการส่งมอบคืนวันที่
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold">
                    ⚡ {calculatedEstimate.workingDays} วันทำการ
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.estimatedReturnDate}
                    onChange={(e) => setFormData({ ...formData, estimatedReturnDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-amber-300 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-hidden font-semibold text-amber-950"
                  />
                </div>
              </div>

              {/* ตรวจสอบวันที่ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตรวจสอบวันที่ (Inspection Date)
                </label>
                <input
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              {/* ผลการตรวจสอบ (WAITING / COMPLETE / EDIT) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ผลการตรวจสอบ (Inspection Result)
                </label>
                <select
                  value={formData.inspectionResult}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inspectionResult: e.target.value as ModifyJobItem['inspectionResult'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold"
                >
                  <option value="WAITING">WAITING (รอตรวจ)</option>
                  <option value="COMPLETE">COMPLETE (ตรวจเสร็จสมบูรณ์ / ผ่าน)</option>
                  <option value="EDIT">EDIT (ส่งกลับแก้ไข / ปรับปรุง)</option>
                  <option value="PASS">PASS (ผ่านการตรวจสอบ - Legacy)</option>
                  <option value="REJECT">REJECT (ไม่ผ่าน / ส่งแก้ - Legacy)</option>
                  <option value="">- ยังไม่ระบุ -</option>
                </select>
              </div>

              {/* สถานะงาน */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สถานะงาน (FINNISH / STATUS) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.finishStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      finishStatus: e.target.value as ModifyJobItem['finishStatus'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-bold"
                >
                  <option value="PENDING">PENDING (รอดำเนินการ)</option>
                  <option value="IN_PROGRESS">IN PROGRESS (กำลังดำเนินงาน)</option>
                  <option value="FINISH">FINISH (เสร็จสมบูรณ์)</option>
                  <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
                </select>
              </div>

              {/* หมายเหตุ */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม (Remarks)
                </label>
                <input
                  type="text"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="เช่น ต้องทดสอบชิ้นงานกับเครื่องจริงก่อนส่งมอบ หรือเร่งด่วนพิเศษ"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              * ข้อมูลจะถูกจัดเก็บและซิงค์ไปยัง Google Sheet ตาราง modify ทันทีที่บันทึก
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{initialData ? 'บันทึกการแก้ไขลง Sheet' : 'บันทึกคำขอลง Google Sheet'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
