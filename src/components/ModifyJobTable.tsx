import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Printer,
  Edit,
  Trash2,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  Eye,
  Layers,
  ChevronDown,
  ChevronUp,
  Palette,
  Play,
  Calendar,
} from 'lucide-react';
import { ModifyJobItem } from '../types';
import {
  formatDateDisplay,
  detectIsPaintingJob,
  getJobProgressDetails,
  calculateWorkingDaysElapsed,
} from '../utils/formatters';

interface ModifyJobTableProps {
  jobs: ModifyJobItem[];
  isLoading: boolean;
  onEdit: (job: ModifyJobItem) => void;
  onQuickStatus: (job: ModifyJobItem) => void;
  onStartWork?: (job: ModifyJobItem) => void;
  onViewTicket: (job: ModifyJobItem) => void;
  onDelete: (job: ModifyJobItem) => void;
  onAddNew: () => void;
}

export const ModifyJobTable: React.FC<ModifyJobTableProps> = ({
  jobs,
  isLoading,
  onEdit,
  onQuickStatus,
  onStartWork,
  onViewTicket,
  onDelete,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [inspectionFilter, setInspectionFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'id' | 'requestDate' | 'customer' | 'shipmentDate'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search matches
      const query = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        job.id.toLowerCase().includes(query) ||
        (job.customer && job.customer.toLowerCase().includes(query)) ||
        (job.saleSoNo && job.saleSoNo.toLowerCase().includes(query)) ||
        (job.project && job.project.toLowerCase().includes(query)) ||
        (job.requester && job.requester.toLowerCase().includes(query)) ||
        (job.sale && job.sale.toLowerCase().includes(query)) ||
        (job.modifyDetails && job.modifyDetails.toLowerCase().includes(query)) ||
        (job.workDetails && job.workDetails.some((w) => w && w.toLowerCase().includes(query)));

      // Status filter
      const matchStatus =
        statusFilter === 'ALL' ||
        job.finishStatus === statusFilter;

      // Inspection filter
      const matchInspection =
        inspectionFilter === 'ALL' ||
        (inspectionFilter === 'COMPLETE' && (job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS')) ||
        (inspectionFilter === 'EDIT' && (job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT')) ||
        (inspectionFilter === 'WAITING' && (job.inspectionResult === 'WAITING' || job.inspectionResult === 'PENDING' || !job.inspectionResult));

      return matchSearch && matchStatus && matchInspection;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [jobs, searchTerm, statusFilter, inspectionFilter, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCSV = () => {
    if (jobs.length === 0) return;
    const headers = [
      'Job ID',
      'วันที่ Request',
      'เดือนที่ Request',
      'เวลาที่ Request',
      'ผู้ส่งคำขอ',
      'Sale',
      'Sale So No.',
      'Customer',
      'Project',
      'Shipment Date',
      'รายละเอียดที่ให้ Modify',
      'จำนวน',
      'ช่างผู้ทำ',
      'ส่งมอบ Engineer วันที่',
      'ประมาณการส่งคืนวันที่',
      'ตรวจสอบวันที่',
      'ผลการตรวจสอบ',
      'สถานะ Finish',
      'หมายเหตุ',
    ];

    const rows = filteredJobs.map((j) => [
      `"${j.id}"`,
      `"${j.requestDate || ''}"`,
      `"${j.requestMonth || ''}"`,
      `"${j.requestTime || ''}"`,
      `"${j.requester || ''}"`,
      `"${j.sale || ''}"`,
      `"${j.saleSoNo || ''}"`,
      `"${j.customer || ''}"`,
      `"${j.project || ''}"`,
      `"${j.shipmentDate || ''}"`,
      `"${(j.modifyDetails || '').replace(/"/g, '""')}"`,
      `"${j.quantity || ''}"`,
      `"${j.technician || ''}"`,
      `"${j.engineerHandoverDate || ''}"`,
      `"${j.estimatedReturnDate || ''}"`,
      `"${j.inspectionDate || ''}"`,
      `"${j.inspectionResult || ''}"`,
      `"${j.finishStatus || ''}"`,
      `"${(j.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modify_jobs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา Job ID, ลูกค้า, เลข SO, Project, ผู้ส่งคำขอ, รายละเอียด Modify..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">สถานะ Finish:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent font-semibold text-slate-800 outline-hidden"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="PENDING">Pending (รอดำเนินการ)</option>
              <option value="IN_PROGRESS">In Progress (กำลังทำ)</option>
              <option value="FINISH">Finish (เสร็จแล้ว)</option>
              <option value="CANCELLED">Cancelled (ยกเลิก)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-500 font-medium">ผลตรวจ:</span>
            <select
              value={inspectionFilter}
              onChange={(e) => setInspectionFilter(e.target.value)}
              className="text-xs bg-transparent font-semibold text-slate-800 outline-hidden"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="COMPLETE">COMPLETE (ตรวจผ่าน)</option>
              <option value="EDIT">EDIT (ส่งกลับแก้ไข)</option>
              <option value="WAITING">WAITING (รอตรวจ)</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={jobs.length === 0}
            title="ส่งออกเป็น CSV"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header Row with all key columns */}
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-3.5 text-center w-12">#</th>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Job ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('requestDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>วัน/เวลา Request</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('customer')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ลูกค้า & SO No.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">ผู้ส่งคำขอ / Sale</th>
                <th className="py-3 px-3">รายละเอียด Modify & จำนวน</th>
                <th className="py-3 px-3">ช่างผู้ทำ & กำหนดเสร็จ</th>
                <th
                  onClick={() => handleSort('shipmentDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ส่งมอบ Engineer / Shipment</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">ผลการตรวจ</th>
                <th className="py-3 px-3 text-center">สถานะ Finish</th>
                <th className="py-3 px-4 text-right">การกระทำ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">
                        {searchTerm ? 'ไม่พบรายการคำขอที่ตรงกับเงื่อนไขค้นหา' : 'ยังไม่มีรายการคำของาน Modify'}
                      </p>
                      <button
                        onClick={onAddNew}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        + สร้างคำขอ Modify รายการแรก
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => {
                  const isExpanded = expandedRow === job.id;
                  const has10Lines = job.workDetails && job.workDetails.some((l) => l && l.trim());

                  return (
                    <React.Fragment key={job.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors group">
                        {/* Index */}
                        <td className="py-3.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                          {job.rowNumber ? `#${job.rowNumber}` : idx + 1}
                        </td>

                        {/* Job ID */}
                        <td className="py-3.5 px-3.5">
                          <button
                            type="button"
                            onClick={() => onViewTicket(job)}
                            className="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 text-left"
                          >
                            <span>{job.id}</span>
                          </button>
                          {job.project && (
                            <span className="block text-[11px] text-slate-500 truncate max-w-[130px]" title={job.project}>
                              {job.project}
                            </span>
                          )}
                        </td>

                        {/* Request Date / Time */}
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-900 block">{formatDateDisplay(job.requestDate)}</span>
                          <span className="text-[11px] text-slate-500 block">
                            {job.requestTime ? `${job.requestTime} น.` : ''} ({job.requestMonth || '-'})
                          </span>
                        </td>

                        {/* Customer & SO No */}
                        <td className="py-3.5 px-3.5">
                          <span className="font-bold text-slate-900 block truncate max-w-[170px]" title={job.customer}>
                            {job.customer || '-'}
                          </span>
                          {job.saleSoNo && (
                            <span className="text-[11px] font-mono text-slate-500 block">
                              SO: {job.saleSoNo}
                            </span>
                          )}
                        </td>

                        {/* Requester & Sale */}
                        <td className="py-3.5 px-3">
                          <div className="truncate max-w-[120px]">
                            <span className="text-slate-900 font-semibold block truncate">ผู้ขอ: {job.requester || '-'}</span>
                            <span className="text-[11px] text-slate-500 block truncate">Sale: {job.sale || '-'}</span>
                          </div>
                        </td>

                        {/* Modify Details & Quantity */}
                        <td className="py-3.5 px-3">
                          <div className="max-w-[190px]">
                            <span className="text-slate-900 font-medium line-clamp-1" title={job.modifyDetails}>
                              {job.modifyDetails || '-'}
                            </span>
                            <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[10px] border border-blue-200">
                                {job.quantity || '1'}
                              </span>
                              {(job.workType === 'PAINTING' || detectIsPaintingJob(job.modifyDetails)) && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-md text-[9px] border border-purple-200">
                                  <Palette className="w-2.5 h-2.5" />
                                  <span>ทำสี</span>
                                </span>
                              )}
                              {has10Lines && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedRow(isExpanded ? null : job.id)}
                                  className="text-[10px] text-slate-500 hover:text-blue-600 flex items-center gap-0.5 underline font-medium"
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  <span>10 บรรทัด</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Technician & Estimated Return */}
                        <td className="py-3.5 px-3">
                          <div className="text-[11px]">
                            <span className="font-semibold text-slate-900 block truncate max-w-[120px]" title={job.technician || 'ยังไม่ระบุ'}>
                              {job.technician ? `👨‍🔧 ${job.technician}` : <span className="text-slate-400 font-normal">- ไม่ระบุช่าง -</span>}
                            </span>
                            {job.estimatedReturnDate ? (
                              <span className="text-amber-800 font-semibold block">
                                ส่งคืน: {formatDateDisplay(job.estimatedReturnDate)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] block">- ยังไม่กำหนดวันเสร็จ -</span>
                            )}
                          </div>
                        </td>

                        {/* Handover / Start Date & Shipment */}
                        <td className="py-3.5 px-3">
                          <div className="text-[11px] space-y-0.5">
                            {job.engineerHandoverDate ? (
                              <div className="text-slate-700">
                                <span className="text-slate-500">เริ่มงาน: </span>
                                <strong className="text-blue-900 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  {formatDateDisplay(job.engineerHandoverDate)}
                                </strong>
                                {job.finishStatus !== 'FINISH' && (
                                  <span className="block text-[10px] text-amber-700 font-medium mt-0.5">
                                    (ทำมาแล้ว {calculateWorkingDaysElapsed(job.engineerHandoverDate)} วัน)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors"
                              >
                                <Play className="w-2.5 h-2.5 fill-amber-800 text-amber-800" />
                                <span>เริ่มปฏิบัติงาน</span>
                              </button>
                            )}
                            <span className="block text-slate-500 text-[10px]">
                              Shipment: <strong className="text-slate-700 font-medium">{formatDateDisplay(job.shipmentDate)}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Inspection Result (WAITING / COMPLETE / EDIT) */}
                        <td className="py-3.5 px-3 text-center">
                          {(() => {
                            const isComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                            const isEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                            const label = isComplete ? 'COMPLETE' : isEdit ? 'EDIT' : (job.inspectionResult || 'WAITING');
                            return (
                              <button
                                type="button"
                                onClick={() => onQuickStatus(job)}
                                title="คลิกเพื่อเปลี่ยนผลการตรวจสอบ QC (WAITING / COMPLETE / EDIT)"
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                    : isEdit
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {isEdit && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                {!isComplete && !isEdit && <Clock className="w-3 h-3 text-slate-500" />}
                                <span>{label}</span>
                              </button>
                            );
                          })()}
                          {job.inspectionDate && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {formatDateDisplay(job.inspectionDate)}
                            </span>
                          )}
                        </td>

                        {/* Finish Status with Start Date Indicator */}
                        <td className="py-3.5 px-3 text-center">
                          {job.finishStatus === 'FINISH' ? (
                            <button
                              type="button"
                              onClick={() => onQuickStatus(job)}
                              title="คลิกเพื่อเปลี่ยนสถานะงาน (ปรับกลับหรือแก้ไข)"
                              className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer ring-2 ring-emerald-600/20 hover:ring-emerald-600"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-100 group-hover:rotate-12 transition-transform" />
                              <span>FINISH</span>
                            </button>
                          ) : job.finishStatus === 'IN_PROGRESS' || job.engineerHandoverDate ? (
                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => onQuickStatus(job)}
                                title="คลิกเพื่อเปลี่ยนสถานะงาน"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-2xs transition-all cursor-pointer"
                              >
                                <Clock className="w-3 h-3 animate-pulse" />
                                <span>กำลังดำเนินการ</span>
                              </button>
                              {job.engineerHandoverDate && (
                                <span className="text-[10px] text-amber-900 font-semibold mt-0.5">
                                  เริ่ม: {formatDateDisplay(job.engineerHandoverDate)}
                                </span>
                              )}
                            </div>
                          ) : job.finishStatus === 'CANCELLED' ? (
                            <button
                              type="button"
                              onClick={() => onQuickStatus(job)}
                              title="คลิกเพื่อเปลี่ยนสถานะงาน"
                              className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-400 hover:bg-slate-500 active:scale-95 text-white transition-all cursor-pointer"
                            >
                              CANCELLED
                            </button>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onQuickStatus(job)}
                                title="คลิกเพื่อเปลี่ยนสถานะงาน"
                                className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                              >
                                PENDING
                              </button>
                              <button
                                type="button"
                                onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline"
                              >
                                <Play className="w-2.5 h-2.5 fill-amber-700" />
                                <span>กดเริ่มงาน</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {job.finishStatus !== 'FINISH' && (
                              <button
                                type="button"
                                onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                                title="เริ่มปฏิบัติงาน / เลือกวันเริ่มงาน"
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors font-bold"
                              >
                                <Play className="w-4 h-4 fill-amber-600" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewTicket(job)}
                              title="ดูใบสั่งงาน / พิมพ์"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickStatus(job)}
                              title="อัปเดตสถานะเร็ว"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEdit(job)}
                              title="แก้ไขข้อมูลทั้งหมด"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(job)}
                              title="ลบคำขอนี้จาก Google Sheet"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded 10-Line Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={10} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                                <span>รายละเอียดงาน 10 บรรทัด ({job.id}):</span>
                                {job.remarks && (
                                  <span className="text-slate-500 font-normal">
                                    หมายเหตุ: <strong className="text-slate-700">{job.remarks}</strong>
                                  </span>
                                )}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {Array.from({ length: 10 }).map((_, i) => {
                                  const text = job.workDetails?.[i] || '';
                                  return (
                                    <div key={i} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {i + 1}
                                      </span>
                                      <span className={text ? 'text-slate-800 font-medium' : 'text-slate-300 italic'}>
                                        {text || '(ว่าง)'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
