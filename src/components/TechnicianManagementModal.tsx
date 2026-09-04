import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Users,
  Wrench,
  Phone,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Shield,
  Layers,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  TechnicianProfile,
  getStoredTechnicians,
  addStoredTechnician,
  updateStoredTechnician,
  deleteStoredTechnician,
  resetStoredTechniciansToDefault,
  subscribeTechniciansChange,
  DEFAULT_TECHNICIANS,
  parseTechnicians,
} from '../utils/technicianStore';
import { getJobWorkflowStatus } from '../utils/formatters';

interface TechnicianManagementModalProps {
  isOpen: boolean;
  jobs: ModifyJobItem[];
  onClose: () => void;
  onSelectTechnician?: (techName: string) => void;
  onBatchRenameJobTechnician?: (oldName: string, newName: string) => Promise<void>;
}

export const TechnicianManagementModal: React.FC<TechnicianManagementModalProps> = ({
  isOpen,
  jobs,
  onClose,
  onSelectTechnician,
  onBatchRenameJobTechnician,
}) => {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>(() => getStoredTechnicians());
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedColor, setSelectedColor] = useState('#0284c7');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSkill, setEditSkill] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updateJobsOnRename, setUpdateJobsOnRename] = useState(true);

  // Delete Confirm State
  const [deletingTech, setDeletingTech] = useState<TechnicianProfile | null>(null);

  // Subscribe to changes
  useEffect(() => {
    setTechnicians(getStoredTechnicians());
    const unsub = subscribeTechniciansChange((updated) => {
      setTechnicians(updated);
    });
    return unsub;
  }, [isOpen]);

  // Color options for technician avatar
  const COLOR_OPTIONS = [
    { value: '#0284c7', label: 'Sky Blue', bg: 'bg-sky-600' },
    { value: '#d97706', label: 'Amber', bg: 'bg-amber-600' },
    { value: '#10b981', label: 'Emerald', bg: 'bg-emerald-600' },
    { value: '#8b5cf6', label: 'Purple', bg: 'bg-purple-600' },
    { value: '#e11d48', label: 'Rose', bg: 'bg-rose-600' },
    { value: '#475569', label: 'Slate', bg: 'bg-slate-600' },
  ];

  // Calculate workload stats per technician
  const techWorkloadMap = useMemo(() => {
    const map = new Map<string, { active: number; waitQc: number; pending: number; finish: number; total: number }>();

    jobs.forEach((job) => {
      const techList = parseTechnicians(job.technician);
      if (techList.length === 0) return;

      const wf = getJobWorkflowStatus(job);
      techList.forEach((tech) => {
        if (!map.has(tech)) {
          map.set(tech, { active: 0, waitQc: 0, pending: 0, finish: 0, total: 0 });
        }

        const entry = map.get(tech)!;
        entry.total++;
        if (wf.code === 'IN_PROGRESS') entry.active++;
        else if (wf.code === 'WAIT_QC') entry.waitQc++;
        else if (wf.code === 'PENDING') entry.pending++;
        else if (wf.code === 'FINISH') entry.finish++;
      });
    });

    return map;
  }, [jobs]);

  if (!isOpen) return null;

  const handleAddTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorMsg('กรุณากรอกชื่อช่าง');
      return;
    }

    try {
      addStoredTechnician(trimmed, newSkill, newPhone, selectedColor);
      setNewName('');
      setNewSkill('');
      setNewPhone('');
      setSuccessMsg(`เพิ่มช่าง "${trimmed}" เข้าระบบเรียบร้อยแล้ว`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเพิ่มช่าง');
    }
  };

  const handleStartEdit = (tech: TechnicianProfile) => {
    setEditingId(tech.id);
    setEditName(tech.name);
    setEditSkill(tech.skill || '');
    setEditPhone(tech.phone || '');
    setErrorMsg(null);
  };

  const handleSaveEdit = async (tech: TechnicianProfile) => {
    setErrorMsg(null);
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMsg('กรุณากรอกชื่อช่าง');
      return;
    }

    const oldName = tech.name;
    try {
      updateStoredTechnician(tech.id, {
        name: trimmed,
        skill: editSkill.trim(),
        phone: editPhone.trim(),
      });

      // If renamed and user wants to cascade rename jobs
      if (oldName !== trimmed && updateJobsOnRename && onBatchRenameJobTechnician) {
        await onBatchRenameJobTechnician(oldName, trimmed);
      }

      setEditingId(null);
      setSuccessMsg(`อัปเดตข้อมูลช่าง "${trimmed}" เรียบร้อยแล้ว`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลช่าง');
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingTech) return;
    try {
      deleteStoredTechnician(deletingTech.id);
      setSuccessMsg(`ลบรายชื่อช่าง "${deletingTech.name}" เรียบร้อยแล้ว`);
      setDeletingTech(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการลบช่าง');
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('ต้องการรีเซ็ตรายชื่อช่างกลับเป็นค่าเริ่มต้น 3 ท่าน (ช่างรักษ์, FAROS, MEEN) หรือไม่?')) {
      resetStoredTechniciansToDefault();
      setSuccessMsg('รีเซ็ตรายชื่อช่างเป็นค่าเริ่มต้น (ช่างรักษ์, FAROS, MEEN) สำเร็จ');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div
      id="technician-management-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fbf9f5] w-full max-w-3xl rounded-3xl shadow-2xl border border-[#ded7cc] overflow-hidden flex flex-col max-h-[92vh] my-auto text-[#2c241c]">
        {/* Modal Header */}
        <div className="bg-[#2c241c] text-[#fbf9f5] px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#43382c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>จัดการรายชื่อช่าง (Manage Technicians)</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-[#2c241c]">
                  {technicians.length} ท่าน
                </span>
              </h2>
              <p className="text-xs text-[#d1c7ba] mt-0.5">
                รายชื่อช่างผู้รับผิดชอบงาน Modify (3 ช่างหลัก: ฟารอส, ช่างรักษ์, มีน)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#d1c7ba] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="ปิดหน้านี้ (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts Banner */}
        {errorMsg && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: เพิ่มชื่อช่างใหม่ (Add Technician Card) */}
          <div className="bg-white rounded-2xl border border-[#ded7cc] p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-[#f0ede6]">
              <UserPlus className="w-4 h-4 text-amber-700" />
              <h3 className="text-sm font-black text-[#2c241c]">
                เพิ่มรายชื่อช่างใหม่ (+ Add New Technician)
              </h3>
            </div>

            <form onSubmit={handleAddTechnician} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-[#52473b] mb-1">
                    ชื่อช่าง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น ช่างรักษ์, FAROS, MEEN..."
                    className="w-full px-3 py-2 text-sm bg-[#faf8f5] border border-[#ded7cc] rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-hidden font-bold text-[#2c241c]"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-[#52473b] mb-1">
                    ความเชี่ยวชาญ / แผนก (Specialty / Skill)
                  </label>
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="เช่น กลึง CNC, เชื่อม TIG, ทำสี, ลบคม"
                    className="w-full px-3 py-2 text-sm bg-[#faf8f5] border border-[#ded7cc] rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-hidden font-medium text-[#2c241c]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-[#52473b] mb-1">
                    เบอร์โทรศัพท์ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="เช่น 081-xxx-xxxx"
                    className="w-full px-3 py-2 text-sm bg-[#faf8f5] border border-[#ded7cc] rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-hidden font-medium text-[#2c241c]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#685e52]">แท็กสี:</span>
                  <div className="flex items-center gap-1.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSelectedColor(c.value)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${c.bg} ${
                          selectedColor === c.value ? 'ring-2 ring-offset-2 ring-[#4a4036] scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.label}
                      >
                        {selectedColor === c.value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>บันทึกเพิ่มช่างใหม่</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: รายชื่อช่างปัจจุบันทั้งหมด (Technician Roster List) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#2c241c] flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-700" />
                <span>รายชื่อช่างในระบบทั้งหมด ({technicians.length} ท่าน)</span>
              </h3>
              <button
                type="button"
                onClick={handleResetDefault}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#7d7265] hover:text-[#2c241c] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตเป็น 3 ช่างเริ่มต้น (ฟารอส, ช่างรักษ์, มีน)</span>
              </button>
            </div>

            {technicians.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#ded7cc] p-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
                <h4 className="text-sm font-bold text-[#2c241c]">ยังไม่มีรายชื่อช่างในระบบ</h4>
                <p className="text-xs text-[#7d7265]">กดปุ่ม "รีเซ็ตเป็น 3 ช่างเริ่มต้น" หรือเพิ่มชื่อช่างใหม่ด้านบน</p>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  โหลด 3 ช่างเริ่มต้นทันที
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {technicians.map((tech, idx) => {
                  const isEditing = editingId === tech.id;
                  const stats = techWorkloadMap.get(tech.name) || { active: 0, waitQc: 0, pending: 0, finish: 0, total: 0 };
                  const isFree = stats.active === 0 && stats.pending === 0 && stats.waitQc === 0;

                  return (
                    <div
                      key={tech.id || tech.name}
                      className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                        isEditing ? 'border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-[#ded7cc] hover:border-[#b5aba0]'
                      }`}
                    >
                      {isEditing ? (
                        /* Inline Edit Mode */
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <div className="sm:col-span-4">
                              <label className="block text-[11px] font-bold text-[#685e52] mb-0.5">
                                ชื่อช่าง:
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-bold text-[#2c241c] outline-hidden focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <label className="block text-[11px] font-bold text-[#685e52] mb-0.5">
                                ความเชี่ยวชาญ:
                              </label>
                              <input
                                type="text"
                                value={editSkill}
                                onChange={(e) => setEditSkill(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#ded7cc] rounded-lg font-medium text-[#2c241c] outline-hidden focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-bold text-[#685e52] mb-0.5">
                                เบอร์โทร:
                              </label>
                              <input
                                type="text"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#ded7cc] rounded-lg font-medium text-[#2c241c] outline-hidden focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          </div>

                          {/* Cascade rename checkbox if name changed */}
                          {editName.trim() !== tech.name && (
                            <label className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={updateJobsOnRename}
                                onChange={(e) => setUpdateJobsOnRename(e.target.checked)}
                                className="rounded text-amber-600 focus:ring-0"
                              />
                              <span>อัปเดตเปลี่ยนชื่อช่างในใบสั่งงาน Modify เดิม ({stats.total} งาน) โดยอัตโนมัติ</span>
                            </label>
                          )}

                          <div className="flex items-center gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 text-xs font-bold text-[#52473b] hover:bg-[#ede9e1] rounded-lg cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(tech)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>บันทึกการแก้ไข</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal View Mode */
                        <>
                          <div className="flex items-start sm:items-center gap-3">
                            <div
                              style={{ backgroundColor: tech.color || '#4a4036' }}
                              className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs"
                            >
                              {tech.name.charAt(0)}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className={`text-sm font-black flex items-center gap-1.5 ${
                                  isFree ? 'text-emerald-600 animate-pulse font-extrabold' : 'text-[#2c241c]'
                                }`}>
                                  <span>{tech.name}</span>
                                  {isFree && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold not-italic animate-none">
                                      สถานะ: ว่าง
                                    </span>
                                  )}
                                </h4>
                                {['ช่างรักษ์', 'ฟารอส', 'meen', 'FAROS', 'MEEN'].includes(tech.name) && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                    ช่างหลัก
                                  </span>
                                )}

                                {/* Status badge */}
                                {isFree ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-400 ring-2 ring-emerald-400/40 flex items-center gap-1.5 animate-pulse shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    <span>🟢 สถานะ: ว่าง (0 งาน)</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span>⚙️ กำลังทำ {stats.active} งาน (ค้างรวม {stats.active + stats.pending + stats.waitQc} งาน)</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7d7265] mt-1">
                                {tech.skill ? (
                                  <span className="flex items-center gap-1 font-medium">
                                    <Wrench className="w-3 h-3 text-[#9e9384]" />
                                    <span>{tech.skill}</span>
                                  </span>
                                ) : (
                                  <span className="italic text-[#a89d8f]">ยังไม่ได้ระบุความเชี่ยวชาญ</span>
                                )}

                                {tech.phone && (
                                  <span className="flex items-center gap-1 text-[#685e52]">
                                    <Phone className="w-3 h-3 text-[#9e9384]" />
                                    <span>{tech.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right side actions */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {onSelectTechnician && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectTechnician(tech.name);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#ede9e1] hover:bg-[#ded7cc] text-[#2c241c] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                title="เปิดดูคิวงานของช่างท่านนี้"
                              >
                                <span>ดูคิวงาน</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartEdit(tech)}
                              className="p-1.5 rounded-lg text-[#685e52] hover:text-amber-800 hover:bg-amber-100/50 transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลชื่อช่าง"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingTech(tech)}
                              className="p-1.5 rounded-lg text-[#685e52] hover:text-rose-700 hover:bg-rose-100/50 transition-colors cursor-pointer"
                              title="ลบชื่อช่าง"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#ede9e1] px-5 sm:px-6 py-3.5 border-t border-[#ded7cc] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#7d7265] font-medium hidden sm:block">
            💡 รายชื่อช่างนี้จะถูกนำไปแสดงในหน้าคิวงานและช่องเลือกช่างตอนเปิดใบสั่งงาน
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-[#2c241c] hover:bg-[#1a1511] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs ml-auto"
          >
            ปิดหน้าต่าง (Close)
          </button>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      {deletingTech && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-rose-200 p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[#2c241c]">ยืนยันการลบรายชื่อช่าง</h4>
                <p className="text-xs text-rose-700 font-semibold">"{deletingTech.name}"</p>
              </div>
            </div>

            <p className="text-xs text-[#52473b] leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อช่าง <strong>"{deletingTech.name}"</strong> ออกจากระบบ?
              {(techWorkloadMap.get(deletingTech.name)?.total || 0) > 0 && (
                <span className="block mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium">
                  ⚠️ ช่างท่านนี้มีประวัติงานในระบบ {techWorkloadMap.get(deletingTech.name)?.total} รายการ (งานจะไม่ถูกลบ แต่จะแสดงเป็นชื่อเดิมหรือยังไม่ระบุช่าง)
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTech(null)}
                className="px-4 py-2 text-xs font-bold text-[#52473b] hover:bg-[#ede9e1] rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
