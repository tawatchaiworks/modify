import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  X,
  Calculator,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  getCurrentDateFormatted,
  formatDateThai,
  addWorkingDays,
  getWorkingDaysForQuantity,
  getDaysDifference,
  GENERAL_WORKING_DAYS_RULES,
  PAINTING_WORKING_DAYS_RULES,
} from '../utils/formatters';

interface ModifyDateEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSoDate?: string;
  initialQuantity?: number | string;
  initialWorkType?: 'GENERAL' | 'PAINTING';
  onApply?: (calculated: {
    soDate: string;
    receiveDate: string;
    estimatedReturnDate: string;
    shipmentDate: string;
    workingDays: number;
    workType: 'GENERAL' | 'PAINTING';
    quantity: number;
  }) => void;
}

export const ModifyDateEstimatorModal: React.FC<ModifyDateEstimatorModalProps> = ({
  isOpen,
  onClose,
  initialSoDate,
  initialQuantity = 10,
  initialWorkType = 'GENERAL',
  onApply,
}) => {
  const [soDate, setSoDate] = useState<string>(
    initialSoDate || getCurrentDateFormatted()
  );
  const [leadDays, setLeadDays] = useState<number>(10);
  const [workType, setWorkType] = useState<'GENERAL' | 'PAINTING'>(
    initialWorkType
  );
  const [quantity, setQuantity] = useState<number | string>(() => {
    const q = typeof initialQuantity === 'number' ? initialQuantity : parseInt(String(initialQuantity).replace(/[^\d]/g, ''), 10);
    return isNaN(q) || q <= 0 ? 10 : q;
  });
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const numericQuantity = typeof quantity === 'number' ? quantity : parseInt(String(quantity).replace(/[^\d]/g, ''), 10) || 1;

  // Calculation logic
  const calculated = useMemo(() => {
    const baseSoDate = soDate || getCurrentDateFormatted();
    // 1. วันที่รับของ/ส่งมอบให้ช่าง (+10 วันทำการหลังจากได้ SO)
    const receiveDate = addWorkingDays(baseSoDate, leadDays, includeSaturday);
    // 2. จำนวนวันทำการตามเกณฑ์
    const workingDays = getWorkingDaysForQuantity(numericQuantity, workType);
    // 3. วันประมาณการส่งมอบคืน (นับวันทำการ)
    const estimatedReturnDate = addWorkingDays(receiveDate, workingDays, includeSaturday);
    const shipmentDate = estimatedReturnDate;

    // 4. คำนวณวันรวม
    const totalWorkingDays = leadDays + workingDays;
    const totalCalendarDays = Math.max(1, getDaysDifference(baseSoDate, estimatedReturnDate));

    const rules = workType === 'PAINTING' ? PAINTING_WORKING_DAYS_RULES : GENERAL_WORKING_DAYS_RULES;
    const matchedRule = rules.find((r) => numericQuantity >= r.min && numericQuantity <= r.max);

    return {
      baseSoDate,
      receiveDate,
      workingDays,
      totalWorkingDays,
      totalCalendarDays,
      estimatedReturnDate,
      shipmentDate,
      matchedRule,
      isPainting: workType === 'PAINTING',
    };
  }, [soDate, leadDays, workType, numericQuantity, includeSaturday]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const text = `📊 ผลการประมาณการวันเวลาทำงาน Modify\n` +
      `------------------------------------\n` +
      `📅 วันที่ได้รับ SO: ${formatDateThai(calculated.baseSoDate)}\n` +
      `🚚 วันที่ส่งมอบช่าง (+${leadDays} วันทำการ): ${formatDateThai(calculated.receiveDate)}\n` +
      `⚙️ ประเภทงาน: ${workType === 'PAINTING' ? '🎨 งานทำสี (Painting)' : '🔧 งาน Modify ทั่วไป'}\n` +
      `📦 จำนวนชิ้นงาน: ${numericQuantity} ตัว\n` +
      `⏱️ ระยะเวลาทำงานของช่าง: ${calculated.workingDays} วันทำการ (${includeSaturday ? 'นับวันเสาร์' : 'หยุดเสาร์-อาทิตย์'})\n` +
      `🏁 ประมาณการส่งมอบคืน: ${formatDateThai(calculated.estimatedReturnDate)}\n` +
      `📦 กำหนดส่งสินค้า (Shipment Date): ${formatDateThai(calculated.shipmentDate)}\n` +
      `⏳ รวมระยะเวลาทั้งหมด: ${calculated.totalWorkingDays} วันทำการ (${calculated.totalCalendarDays} วันตามปฏิทิน)\n` +
      `   • วันเตรียมการส่งมอบช่าง: ${leadDays} วันทำการ\n` +
      `   • วันที่ช่างลงมือปฏิบัติงาน: ${calculated.workingDays} วันทำการ\n` +
      `------------------------------------`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        soDate: calculated.baseSoDate,
        receiveDate: calculated.receiveDate,
        estimatedReturnDate: calculated.estimatedReturnDate,
        shipmentDate: calculated.shipmentDate,
        workingDays: calculated.workingDays,
        workType,
        quantity: numericQuantity,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Calculator className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  เครื่องคำนวณประมาณการวันเวลา Modify
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                  Auto Estimator
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-slate-800">
          {/* Top Inputs Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Controls (Inputs) */}
            <div className="md:col-span-6 space-y-4">
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>ข้อมูลวันที่ & ชิ้นงาน</span>
                </h3>

                {/* วันที่ได้ SO */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่ได้รับ Sales Order (SO Date)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={soDate}
                      onChange={(e) => setSoDate(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-medium text-slate-800 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setSoDate(getCurrentDateFormatted())}
                      className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                    >
                      วันนี้
                    </button>
                  </div>
                </div>

                {/* Work Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ประเภทงาน Modify (Work Type)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWorkType('GENERAL')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        workType === 'GENERAL'
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">🔧</span>
                        {workType === 'GENERAL' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold">Modify ทั่วไป</div>
                        <div className="text-[11px] text-slate-500">
                          งานเปลี่ยน ใส่ ประกอบ
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkType('PAINTING')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        workType === 'PAINTING'
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">🎨</span>
                        {workType === 'PAINTING' && (
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold">งานทำสี (Painting)</div>
                        <div className="text-[11px] text-slate-500">
                          พ่นสี อบสี ชุบผิวชิ้นงาน (3-15 วัน)
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quantity Input (กรอกเองเท่านั้น) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      3. จำนวนชิ้นงาน (กรอกเองเท่านั้น)
                    </label>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      {numericQuantity} ตัว / ชิ้น
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuantity('');
                      } else {
                        const num = parseInt(val, 10);
                        setQuantity(isNaN(num) ? '' : Math.max(1, num));
                      }
                    }}
                    onBlur={() => {
                      if (quantity === '' || Number(quantity) <= 0) {
                        setQuantity(1);
                      }
                    }}
                    placeholder="กรอกจำนวนชิ้นงาน เช่น 10, 50, 100"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-bold text-slate-900 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <span>✍️ กรอกจำนวนชิ้นงานเพื่อคำนวณระยะเวลาทำงานตามเกณฑ์มาตรฐาน</span>
                  </p>
                </div>

                {/* Saturday Option */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    การนับวันทำการ:
                  </span>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeSaturday}
                      onChange={(e) => setIncludeSaturday(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>รวมวันเสาร์ด้วย (จันทร์ - เสาร์)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Side: Calculation Result Showcase */}
            <div className="md:col-span-6 flex flex-col space-y-4">
              {/* Highlight Result Card */}
              {/* Highlight Result Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700 relative overflow-hidden flex-1 flex flex-col justify-between">
                {/* Background decorative glow */}
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      ผลการคำนวณไทม์ไลน์
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        workType === 'PAINTING'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                      }`}
                    >
                      {workType === 'PAINTING' ? '🎨 งานทำสี' : '🔧 งาน Modify ทั่วไป'}
                    </span>
                  </div>

                  {/* Step Timeline Breakdown */}
                  <div className="space-y-2.5">
                    {/* Step 1 */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-[10px]">
                          1
                        </span>
                        <span className="text-slate-300">วันที่ได้รับ SO:</span>
                      </div>
                      <span className="font-bold text-white">
                        {formatDateThai(calculated.baseSoDate)}
                      </span>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                          2
                        </span>
                        <span className="text-slate-300">
                          ส่งมอบช่าง (+{leadDays} วันทำการ):
                        </span>
                      </div>
                      <span className="font-bold text-amber-300">
                        {formatDateThai(calculated.receiveDate)}
                      </span>
                    </div>

                    {/* Step 3 (Highlight Finish) */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-xs shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                          3
                        </span>
                        <div>
                          <div className="font-bold text-emerald-200">
                            ประมาณการส่งมอบคืนช่าง:
                          </div>
                          <div className="text-[10px] text-emerald-300/80">
                            (+{calculated.workingDays} วันทำการ)
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-emerald-300">
                        {formatDateThai(calculated.estimatedReturnDate)}
                      </span>
                    </div>
                  </div>

                  {/* Total Duration / Summary Showcase Box */}
                  <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-blue-500/15 to-indigo-500/15 border border-amber-400/35 shadow-inner space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>สรุปวันรวมทั้งหมด (Total Duration):</span>
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 font-mono">
                        รวม {calculated.totalWorkingDays} วันทำการ
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                        <span className="text-[10px] text-slate-300 block">วันทำการรวม (Working Days):</span>
                        <div className="text-base font-extrabold text-amber-300 flex items-baseline gap-1 mt-0.5">
                          <span>{calculated.totalWorkingDays}</span>
                          <span className="text-xs font-normal text-slate-300">วันทำการ</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          (เตรียมของ {leadDays} วัน + ช่าง {calculated.workingDays} วัน)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                        <span className="text-[10px] text-slate-300 block">วันปฏิทินรวม (Calendar Days):</span>
                        <div className="text-base font-extrabold text-blue-300 flex items-baseline gap-1 mt-0.5">
                          <span>{calculated.totalCalendarDays}</span>
                          <span className="text-xs font-normal text-slate-300">วัน</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate" title={`${formatDateThai(calculated.baseSoDate)} ถึง ${formatDateThai(calculated.estimatedReturnDate)}`}>
                          นับรวมวันหยุดเสาร์-อาทิตย์
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Action */}
                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-white/10"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">คัดลอกเรียบร้อย!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกข้อความสรุป</span>
                      </>
                    )}
                  </button>

                  {onApply && (
                    <button
                      type="button"
                      onClick={handleApply}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>นำไปใส่ในฟอร์ม</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>คำนวณวันทำการอัตโนมัติ ข้ามวันเสาร์-อาทิตย์และวันหยุด</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            {onApply && (
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>นำค่าไปใช้งาน</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
