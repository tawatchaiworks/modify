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
  getUrgencyDisplay,
  URGENCY_OPTIONS,
  getWorkTypeDisplay,
} from '../utils/formatters';

interface ModifyJobTableProps {
  jobs: ModifyJobItem[];
  isLoading: boolean;
  onEdit: (job: ModifyJobItem) => void;
  onQuickStatus: (job: ModifyJobItem) => void;
  onStartWork?: (job: ModifyJobItem) => void;
  onViewTicket: (job: ModifyJobItem) => void;
  onPrintStatusReport?: (status?: string) => void;
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
  onPrintStatusReport,
  onDelete,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [inspectionFilter, setInspectionFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'id' | 'requestDate' | 'customer' | 'shipmentDate'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search matches
      const query = (searchTerm || '').toLowerCase();
      const matchSearch =
        !searchTerm ||
        (job.id && String(job.id).toLowerCase().includes(query)) ||
        (job.customer && String(job.customer).toLowerCase().includes(query)) ||
        (job.saleSoNo && String(job.saleSoNo).toLowerCase().includes(query)) ||
        (job.project && String(job.project).toLowerCase().includes(query)) ||
        (job.requester && String(job.requester).toLowerCase().includes(query)) ||
        (job.sale && String(job.sale).toLowerCase().includes(query)) ||
        (job.modifyDetails && String(job.modifyDetails).toLowerCase().includes(query)) ||
        (job.workDetails && job.workDetails.some((w) => w && String(w).toLowerCase().includes(query)));

      // Status filter
      const matchStatus =
        statusFilter === 'ALL' ||
        job.finishStatus === statusFilter;

      // Urgency filter
      const currentUrgency = job.urgencyLevel || 'NORMAL';
      const matchUrgency =
        urgencyFilter === 'ALL' ||
        currentUrgency === urgencyFilter;

      // Inspection filter
      const matchInspection =
        inspectionFilter === 'ALL' ||
        (inspectionFilter === 'COMPLETE' && (job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS')) ||
        (inspectionFilter === 'EDIT' && (job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT')) ||
        (inspectionFilter === 'WAITING' && (job.inspectionResult === 'WAITING' || job.inspectionResult === 'PENDING' || !job.inspectionResult));

      return matchSearch && matchStatus && matchUrgency && matchInspection;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [jobs, searchTerm, statusFilter, urgencyFilter, inspectionFilter, sortField, sortDirection]);

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
      'ระดับความเร่งด่วน',
      'ช่างผู้ทำ',
      'ชื่อผู้รับผิดชอบ',
      'ประมาณการส่งคืนวันที่',
      'ตรวจสอบวันที่',
      'ผลการตรวจสอบ',
      'สถานะ Finish',
      'หมายเหตุ',
    ];

    const rows = filteredJobs.map((j) => {
      const urgencyText = j.urgencyLevel === 'VERY_URGENT' ? 'งานด่วนมาก' : j.urgencyLevel === 'URGENT' ? 'งานด่วน' : 'งานปกติ';
      return [
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
        `"${urgencyText}"`,
        `"${j.technician || ''}"`,
        `"${j.engineerHandoverDate || ''}"`,
        `"${j.estimatedReturnDate || ''}"`,
        `"${j.inspectionDate || ''}"`,
        `"${j.inspectionResult || ''}"`,
        `"${j.finishStatus || ''}"`,
        `"${(j.remarks || '').replace(/"/g, '""')}"`,
      ];
    });

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
          {/* Urgency Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-500 font-medium">ความเร่งด่วน:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="text-xs bg-transparent font-semibold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">ความเร่งด่วนทั้งหมด</option>
              <option value="NORMAL">☕ งานปกติ</option>
              <option value="URGENT">⚡ งานด่วน</option>
              <option value="VERY_URGENT">🚨 งานด่วนมาก</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">สถานะ Finish:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent font-semibold text-slate-800 outline-hidden cursor-pointer"
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
              className="text-xs bg-transparent font-semibold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="COMPLETE">COMPLETE (ตรวจผ่าน)</option>
              <option value="EDIT">EDIT (ส่งกลับแก้ไข)</option>
              <option value="WAITING">WAITING (รอตรวจ)</option>
            </select>
          </div>

          {/* Print A4 Report Preview */}
          {onPrintStatusReport && (
            <button
              type="button"
              onClick={() => onPrintStatusReport(statusFilter !== 'ALL' ? statusFilter : inspectionFilter !== 'ALL' ? inspectionFilter : 'ALL')}
              title="Print Preview ขนาด A4 ตามสถานะที่เลือก"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>พิมพ์รายงาน A4</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={jobs.length === 0}
            title="ส่งออกเป็น CSV"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
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
                <th className="py-3 px-3">Sale & ช่างผู้ทำ</th>
                <th className="py-3 px-3 min-w-[180px]">รายละเอียดที่ให้ Modify</th>
                <th className="py-3 px-2.5 text-center">จำนวน</th>
                <th className="py-3 px-3">กำหนดการส่งมอบ (Timeline)</th>
                <th className="py-3 px-3 text-center min-w-[110px]">ผลการตรวจ (QC)</th>
                <th className="py-3 px-3 text-center min-w-[125px]">สถานะงาน</th>
                <th className="py-3 px-4 text-right min-w-[150px]">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">ไม่พบรายการคำของาน Modify ที่ตรงกับเงื่อนไข</p>
                    <button
                      onClick={onAddNew}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                    >
                      + เพิ่มรายการคำขอใหม่
                    </button>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => {
                  const isExpanded = expandedRow === job.id;
                  const isPainting = detectIsPaintingJob(job);
                  const completedLines = (job.workDetails || []).filter((l) => l && l.trim()).length;
                  const progress = getJobProgressDetails(job);
                  const elapsedDays = calculateWorkingDaysElapsed(job.engineerHandoverDate);

                  return (
                    <React.Fragment key={job.id}>
                      <tr className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        {/* Row # */}
                        <td className="py-3.5 px-3.5 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Job ID & Type & Urgency Badge */}
                        <td className="py-3.5 px-3.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-700 text-sm">{job.id}</span>
                              {(() => {
                                const urgency = getUrgencyDisplay(job.urgencyLevel);
                                if (urgency.level === 'VERY_URGENT') {
                                  return (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-2xs animate-pulse">
                                      <span>🚨</span>
                                      <span>ด่วนมาก</span>
                                    </span>
                                  );
                                }
                                if (urgency.level === 'URGENT') {
                                  return (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                                      <span>⚡</span>
                                      <span>งานด่วน</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    ปกติ
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex items-center flex-wrap gap-1 mt-0.5">
                              {job.rowNumber && (
                                <span className="text-[10px] text-slate-600 font-mono">
                                  Row #{job.rowNumber}
                                </span>
                              )}
                              {getWorkTypeDisplay(job.workTypes || job.workType).matched.map((wt) => (
                                <span
                                  key={wt.id}
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${wt.badgeClass}`}
                                >
                                  {wt.icon} {wt.shortName}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Request Date/Time & Requester */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900 block">
                              {formatDateDisplay(job.requestDate)}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              {job.requestTime && <span>{job.requestTime} น.</span>}
                              {job.requester && (
                                <span className="text-slate-600 truncate max-w-[90px]" title={job.requester}>
                                  • {job.requester}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Customer & Project & Sale SO No */}
                        <td className="py-3.5 px-3.5">
                          <div className="space-y-0.5 max-w-[200px]">
                            <span className="font-bold text-slate-900 block truncate text-xs" title={job.customer}>
                              {job.customer || '-'}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {job.saleSoNo && (
                                <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                  SO: {job.saleSoNo}
                                </span>
                              )}
                              {job.project && (
                                <span className="text-[11px] text-slate-500 truncate max-w-[120px]" title={job.project}>
                                  {job.project}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Sale & Technician */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <div className="text-xs text-slate-700">
                              <span className="text-slate-400 text-[10px]">Sale: </span>
                              <strong className="text-slate-900 font-medium">{job.sale || '-'}</strong>
                            </div>
                            <div className="text-xs">
                              <span className="text-slate-400 text-[10px]">ช่าง: </span>
                              <strong className="text-slate-900 font-bold">{job.technician || '-'}</strong>
                            </div>
                          </div>
                        </td>

                        {/* Modify Details & 10 lines count */}
                        <td className="py-3.5 px-3">
                          <div className="max-w-[220px]">
                            <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed" title={job.modifyDetails}>
                              {job.modifyDetails || '- ไม่มีรายละเอียดระบุ -'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setExpandedRow(isExpanded ? null : job.id)}
                              className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                            >
                              <Layers className="w-3 h-3" />
                              <span>{completedLines}/10 รายการย่อย</span>
                              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-2.5 text-center">
                          <span className="font-bold text-slate-900 text-xs px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 inline-block">
                            {job.quantity || 1}
                          </span>
                        </td>

                        {/* Timeline */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1 text-xs min-w-[140px]">
                            {job.engineerHandoverDate ? (
                              <div className="flex items-center gap-1.5 text-slate-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>เริ่ม: <strong>{formatDateDisplay(job.engineerHandoverDate)}</strong></span>
                                {elapsedDays > 0 && job.finishStatus !== 'FINISH' && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded font-bold">
                                    {elapsedDays} วัน
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors"
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

                        {/* Finish Status */}
                        <td className="py-3.5 px-3 text-center">
                          {job.finishStatus === 'FINISH' ? (
                            <button
                              type="button"
                              onClick={() => onQuickStatus(job)}
                              title="คลิกเพื่อเปลี่ยนสถานะงาน"
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
                              title="ดูใบสั่งงานขนาด A4 / Print Preview"
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
                          <td colSpan={11} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                                <span>รายละเอียดงาน 10 บรรทัด & จำนวนชิ้น ({job.id}):</span>
                                {job.remarks && (
                                  <span className="text-[11px] text-slate-500 font-normal">
                                    หมายเหตุ: <strong className="text-slate-700">{job.remarks}</strong>
                                  </span>
                                )}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {Array.from({ length: 10 }).map((_, i) => {
                                  const text = job.workDetails?.[i] || '';
                                  const qty = job.workDetailQuantities?.[i];
                                  const hasQty = qty !== undefined && qty !== '' && String(qty).trim() !== '';

                                  return (
                                    <div
                                      key={i}
                                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${
                                        text ? 'bg-blue-50/40 border-blue-100 text-slate-900' : 'bg-slate-50 border-slate-100 text-slate-400 italic'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="font-mono font-bold text-[10px] w-4 h-4 rounded bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                                          {i + 1}
                                        </span>
                                        <span className="truncate">{text || '- ว่าง -'}</span>
                                      </div>
                                      {hasQty && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] shrink-0 border border-emerald-200">
                                          {String(qty).includes('ชิ้น') || String(qty).includes('ชุด') ? qty : `${qty} ชิ้น`}
                                        </span>
                                      )}
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
