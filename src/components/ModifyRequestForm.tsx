import React, { useState, useEffect, useMemo } from 'react';
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
  Calculator,
  RefreshCw,
  Trash2,
  PlusCircle,
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
  WORK_TYPE_OPTIONS,
  parseWorkTypes,
  getWorkTypeDisplay,
  calculateWorkDetailsTotalQuantity,
  calculateQueueBasedEstimate,
} from '../utils/formatters';

interface ModifyRequestFormProps {
  initialData?: ModifyJobItem | null;
  existingCount: number;
  existingJobs?: ModifyJobItem[];
  isLoading: boolean;
  isOpen: boolean;
  currentUserEmail?: string;
  onSave: (job: ModifyJobItem) => Promise<void>;
  onClose: () => void;
}

export const ModifyRequestForm: React.FC<ModifyRequestFormProps> = ({
  initialData,
  existingCount,
  existingJobs = [],
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
    workTypes: ['GENERAL'],
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
  const [autoSyncQuantityFromItems, setAutoSyncQuantityFromItems] = useState(true);

  // Selected work types (1 or 2 items)
  const selectedWorkTypes = useMemo(() => {
    return parseWorkTypes(formData.workTypes || formData.workType);
  }, [formData.workTypes, formData.workType]);

  const workTypeDisplay = useMemo(() => {
    return getWorkTypeDisplay(selectedWorkTypes);
  }, [selectedWorkTypes]);

  // Calculate live sum of 10-line work details
  const breakdownQtyInfo = useMemo(() => {
    return calculateWorkDetailsTotalQuantity(formData.workDetailQuantities);
  }, [formData.workDetailQuantities]);

  // Base standalone calculation (ignoring queue)
  const baseStartDate = formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted();
  const calculatedEstimate = calculateEstimatedCompletion(
    baseStartDate,
    formData.quantity,
    selectedWorkTypes
  );

  // Queue calculation specifically for the currently entered technician
  const technicianQueueEstimate = useMemo(() => {
    return calculateQueueBasedEstimate(
      formData.technician,
      formData.engineerHandoverDate || formData.requestDate,
      formData.quantity,
      selectedWorkTypes,
      existingJobs,
      initialData?.id
    );
  }, [formData.technician, formData.engineerHandoverDate, formData.requestDate, formData.quantity, selectedWorkTypes, existingJobs, initialData?.id]);

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
      
      const parsedTypes = parseWorkTypes(initialData.workTypes || initialData.workType || (detectIsPaintingJob(initialData.modifyDetails) ? 'PAINTING' : 'GENERAL'));
      const initialUrgency = parseUrgencyLevel(initialData.urgencyLevel);
      const isPainting = parsedTypes.includes('PAINTING');

      // Check if item quantities sum should be reflected
      const sumInfo = calculateWorkDetailsTotalQuantity(paddedWorkDetailQuantities);
      const resolvedQty = initialData.quantity !== undefined && initialData.quantity !== ''
        ? initialData.quantity
        : sumInfo.hasAnyQty && sumInfo.totalQty > 0
        ? sumInfo.totalQty
        : 1;

      setFormData({
        ...initialData,
        workType: parsedTypes.join(', '),
        workTypes: parsedTypes,
        urgencyLevel: initialUrgency,
        quantity: resolvedQty,
        workDetails: paddedWorkDetails.slice(0, 10),
        workDetailQuantities: paddedWorkDetailQuantities.slice(0, 10),
      });
      setRuleGuideTab(isPainting ? 'PAINTING' : 'GENERAL');
      setHasManuallySetWorkType(Boolean(initialData.workType || initialData.workTypes));
      
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
      const defaultEstimate = calculateEstimatedCompletion(todayDate, 1, ['GENERAL']);

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
        workTypes: ['GENERAL'],
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
      setAutoSyncQuantityFromItems(true);
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
    const updatedQtys = [...(formData.workDetailQuantities || Array(10).fill(''))];
    updatedQtys[index] = qtyValue;

    const sumInfo = calculateWorkDetailsTotalQuantity(updatedQtys);

    setFormData((prev) => {
      // If autoSync is enabled and we have sum from items 1-10, update main quantity
      let newQuantity = prev.quantity;
      let newEstimatedReturnDate = prev.estimatedReturnDate;
      let newShipmentDate = prev.shipmentDate;

      if (autoSyncQuantityFromItems && sumInfo.hasAnyQty && sumInfo.totalQty > 0) {
        newQuantity = sumInfo.totalQty;
        const calc = calculateEstimatedCompletion(
          prev.engineerHandoverDate || prev.requestDate || getCurrentDateFormatted(),
          newQuantity,
          prev.workTypes || prev.workType || 'GENERAL'
        );
        if (!initialData || !prev.estimatedReturnDate) {
          newEstimatedReturnDate = calc.calculatedDate;
        }
        if (!initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate) {
          newShipmentDate = calc.calculatedDate;
        }
      }

      return {
        ...prev,
        workDetailQuantities: updatedQtys,
        quantity: newQuantity,
        estimatedReturnDate: newEstimatedReturnDate,
        shipmentDate: newShipmentDate,
      };
    });
  };

  // Sync main quantity with 10-line sum
  const handleApplySumToMainQuantity = () => {
    if (breakdownQtyInfo.hasAnyQty && breakdownQtyInfo.totalQty > 0) {
      handleQuantityChange(String(breakdownQtyInfo.totalQty));
    }
  };

  const handleFillAllQuantities = () => {
    const mainQty = formData.quantity || '1';
    const updated = formData.workDetails.map((detail) => (detail && detail.trim() ? mainQty : ''));
    setFormData((prev) => ({ ...prev, workDetailQuantities: updated }));
  };

  const handleClearAllQuantities = () => {
    setFormData((prev) => ({ ...prev, workDetailQuantities: Array(10).fill('') }));
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

    const sumInfo = calculateWorkDetailsTotalQuantity(updatedQtys);
    const newQuantity = sumInfo.hasAnyQty && sumInfo.totalQty > 0 ? sumInfo.totalQty : formData.quantity;

    const calc = calculateEstimatedCompletion(
      formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted(),
      newQuantity,
      selectedWorkTypes
    );

    setFormData((prev) => ({
      ...prev,
      workDetails: updatedTexts,
      workDetailQuantities: updatedQtys,
      quantity: newQuantity,
      estimatedReturnDate: !initialData ? calc.calculatedDate : prev.estimatedReturnDate,
      shipmentDate: !initialData || !prev.shipmentDate ? calc.calculatedDate : prev.shipmentDate,
    }));
    setShowBulkInput(false);
  };

  const handleApplyCalculatedDate = () => {
    const targetDate = technicianQueueEstimate.calculatedReturnDate || calculatedEstimate.calculatedDate;
    setFormData((prev) => {
      const isShipmentSynced = !initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate;
      return {
        ...prev,
        estimatedReturnDate: targetDate,
        shipmentDate: isShipmentSynced ? targetDate : prev.shipmentDate,
      };
    });
  };

  const handleSyncShipmentWithEstimate = () => {
    const targetDate = formData.estimatedReturnDate || technicianQueueEstimate.calculatedReturnDate || calculatedEstimate.calculatedDate;
    if (targetDate) {
      setFormData((prev) => ({
        ...prev,
        shipmentDate: targetDate,
      }));
    }
  };

  /**
   * Toggle work type selection (allows 1 or 2 options)
   */
  const handleToggleWorkType = (typeId: string) => {
    setHasManuallySetWorkType(true);
    let nextTypes: string[] = [...selectedWorkTypes];

    if (nextTypes.includes(typeId)) {
      // If already selected, only remove if more than 1 item remains
      if (nextTypes.length > 1) {
        nextTypes = nextTypes.filter((t) => t !== typeId);
      } else {
        // Keep at least 1 type
        return;
      }
    } else {
      // Adding new type
      if (nextTypes.length < 2) {
        nextTypes.push(typeId);
      } else {
        // Already 2 selected: replace the second one or shift
        nextTypes = [nextTypes[0], typeId];
      }
    }

    const isPainting = nextTypes.includes('PAINTING');
    setRuleGuideTab(isPainting ? 'PAINTING' : 'GENERAL');

    const calc = calculateEstimatedCompletion(
      formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted(),
      formData.quantity,
      nextTypes
    );

    setFormData((prev) => {
      const isShipmentSynced = !initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate;
      return {
        ...prev,
        workTypes: nextTypes,
        workType: nextTypes.join(', '),
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
      selectedWorkTypes
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
      selectedWorkTypes
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
    let nextTypes = [...selectedWorkTypes];
    if (!hasManuallySetWorkType) {
      if (detectIsPaintingJob(val)) {
        if (!nextTypes.includes('PAINTING')) {
          nextTypes = ['GENERAL', 'PAINTING'];
        }
        setRuleGuideTab('PAINTING');
      } else {
        nextTypes = ['GENERAL'];
        setRuleGuideTab('GENERAL');
      }
    }

    const calc = calculateEstimatedCompletion(
      formData.engineerHandoverDate || formData.requestDate || getCurrentDateFormatted(),
      formData.quantity,
      nextTypes
    );

    setFormData((prev) => {
      const isShipmentSynced = !initialData || !prev.shipmentDate || prev.shipmentDate === prev.estimatedReturnDate;
      return {
        ...prev,
        modifyDetails: val,
        workTypes: nextTypes,
        workType: nextTypes.join(', '),
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

    // Ensure workType and workTypes are synchronized
    const finalTypes = selectedWorkTypes.length > 0 ? selectedWorkTypes : ['GENERAL'];
    const updatedSubmission: ModifyJobItem = {
      ...formData,
      workTypes: finalTypes,
      workType: finalTypes.join(', '),
    };

    await onSave(updatedSubmission);
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
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-mono font-semibold text-blue-900"
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
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold"
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

              {/* ประเภทงาน (Work Type) Multi-Select 1-2 Options */}
              <div className="sm:col-span-2 lg:col-span-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>ประเภทงาน (Work Type)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        เลือกได้ 1 หรือ 2 ประเภท ({selectedWorkTypes.length}/2)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      คลิกเลือกเพื่อรวมงานได้ 1 หรือ 2 อย่าง (เช่น Modify ทั่วไป + ทำสี) ระบบจะคำนวณ Lead-Time ตามประเภทงานที่เลือก
                    </p>
                  </div>
                  {workTypeDisplay.hasPainting && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold">
                      <Palette className="w-3 h-3 text-purple-600" />
                      <span>ใช้เกณฑ์ทำสี (Painting Lead-Time)</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WORK_TYPE_OPTIONS.map((opt) => {
                    const isSelected = selectedWorkTypes.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleToggleWorkType(opt.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all border cursor-pointer ${
                          isSelected
                            ? `${opt.activeClass} border-transparent shadow-xs scale-[1.01]`
                            : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{opt.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-bold truncate">{opt.shortName}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                              }`}
                            >
                              {isSelected ? '✓ เลือกแล้ว' : '+ เลือก'}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 leading-normal ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
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

              {/* จำนวนสินค้าหลัก พร้อมการอ้างอิงยอดรวมจากข้อ 1-10 */}
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
                      เกณฑ์วัน ({calculatedEstimate.workingDays} วัน - {workTypeDisplay.hasPainting ? 'มีงานทำสี' : 'ทั่วไป'})
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
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-black text-blue-950"
                  />
                  <Layers className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Live notice if 10-line quantity sum is available */}
                {breakdownQtyInfo.hasAnyQty && breakdownQtyInfo.totalQty > 0 && (
                  <div className="mt-1.5 flex items-center justify-between bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-1 rounded-lg text-[11px]">
                    <span className="flex items-center gap-1 font-medium">
                      <Calculator className="w-3 h-3 text-emerald-600" />
                      <span>ยอดรวม 10 รายการ: <strong>{breakdownQtyInfo.totalQty} ชิ้น</strong></span>
                    </span>
                    {String(formData.quantity) !== String(breakdownQtyInfo.totalQty) ? (
                      <button
                        type="button"
                        onClick={handleApplySumToMainQuantity}
                        className="font-bold text-emerald-700 hover:text-emerald-900 underline hover:no-underline ml-1"
                      >
                        ⚡ ปรับให้ตรงกับ 10 ข้อ
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700">✓ อ้างอิงตรงกัน</span>
                    )}
                  </div>
                )}
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
                        (ruleGuideTab === 'PAINTING' ? workTypeDisplay.hasPainting : !workTypeDisplay.hasPainting);
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
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    3. รายละเอียดงาน 10 บรรทัด & จำนวนชิ้น (10-Line Work & Quantity Breakdown)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ระบุรายละเอียดงานและจำนวนชิ้นของแต่ละรายการ (ยอดรวมจะถูกนำไปอ้างอิงเป็นจำนวนสินค้าหลัก)
                  </p>
                </div>
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
                  onClick={handleClearAllQuantities}
                  title="ล้างจำนวนทุกข้อ"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                >
                  ล้างจำนวน
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
                  วางข้อความของคุณที่นี่ (สามารถระบุจำนวน เช่น <code>1. กัดร่อง 5 ชิ้น</code> หรือ <code>ตรวจ Jig (จำนวน 2 ชิ้น)</code> ได้ ระบบจะดึงจำนวนและรวมยอดให้อัตโนมัติ):
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
                  นำไปใส่ใน 10 บรรทัดและคำนวณยอดรวม
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
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
                            className="w-16 sm:w-20 px-2 py-1 text-xs text-center font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden text-emerald-950 placeholder:text-slate-400"
                          />
                          <span className="text-[11px] text-slate-400 font-medium">ชิ้น</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Card for 10-Line Breakdown */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>ยอดรวมจำนวนจาก 10 รายการ:</span>
                        <span className="text-sm font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300 font-mono">
                          {breakdownQtyInfo.totalQty} ชิ้น
                        </span>
                        <span className="text-[11px] text-slate-500">
                          (จาก {breakdownQtyInfo.countWithQty}/10 ข้อ)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        อ้างอิงเป็นจำนวนของสินค้าหลัก ({formData.quantity} ชิ้น) สำหรับคำนวณ Lead-Time และบันทึกลง Sheet
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleApplySumToMainQuantity}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>นำยอด {breakdownQtyInfo.totalQty} ชิ้น ไปใช้</span>
                    </button>
                  </div>
                </div>
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
              {workTypeDisplay.hasPainting && (
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

              {/* Quick Auto-calculate button */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleApplyCalculatedDate}
                  title="คลิกเพื่อใส่วันประมาณการที่คำนวณได้ลงในช่อง"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    คำนวณวันเสร็จ:{' '}
                    {technicianQueueEstimate.calculatedReturnDate
                      ? formatDateDisplay(technicianQueueEstimate.calculatedReturnDate)
                      : calculatedEstimate.calculatedDate
                      ? formatDateDisplay(calculatedEstimate.calculatedDate)
                      : '-'}
                    {' '}({technicianQueueEstimate.workingDays} วัน)
                  </span>
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
                    placeholder="พิมพ์ชื่อช่างผู้รับผิดชอบ..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-semibold text-slate-800"
                  />
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* รับสินค้าวันที่ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รับสินค้าวันที่
                </label>
                <input
                  type="date"
                  value={formData.engineerHandoverDate}
                  onChange={(e) => handleHandoverDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-medium text-slate-800"
                />
              </div>

              {/* ประมาณการส่งมอบคืนวันที่ */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    ประมาณการส่งมอบคืนวันที่
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold">
                    ⚡ {technicianQueueEstimate.workingDays} วันทำการ
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

