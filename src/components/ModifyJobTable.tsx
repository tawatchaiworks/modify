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
  ChevronLeft,
  ChevronRight,
  Palette,
  Play,
  Calendar,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  LayoutList,
  Columns,
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
  isOneDayBeforeDelivery,
  getJobWorkflowStatus,
} from '../utils/formatters';
import { SearchStatusPopup } from './SearchStatusPopup';

interface ModifyJobTableProps {
  jobs: ModifyJobItem[];
  isLoading: boolean;
  onEdit: (job: ModifyJobItem) => void;
  onQuickStatus: (job: ModifyJobItem) => void;
  onUpdateStatus?: (job: ModifyJobItem, newStatus: string) => Promise<void> | void;
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
  onUpdateStatus,
  onStartWork,
  onViewTicket,
  onPrintStatusReport,
  onDelete,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [inspectionFilter, setInspectionFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [density, setDensity] = useState<'compact' | 'standard' | 'spacious'>('standard');
  const [sortField, setSortField] = useState<
    | 'id'
    | 'workType'
    | 'urgencyLevel'
    | 'requestDate'
    | 'customer'
    | 'saleSoNo'
    | 'sale'
    | 'technician'
    | 'shipmentDate'
  >('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Search matches specifically for popup
  const popupMatchedJobs = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.trim().toLowerCase();
    return jobs.filter((job) => {
      const soMatch = job.saleSoNo && String(job.saleSoNo).toLowerCase().includes(query);
      const projectMatch = job.project && String(job.project).toLowerCase().includes(query);
      const customerMatch = job.customer && String(job.customer).toLowerCase().includes(query);
      const idMatch = job.id && String(job.id).toLowerCase().includes(query);
      const requesterMatch = job.requester && String(job.requester).toLowerCase().includes(query);
      const modifyMatch = job.modifyDetails && String(job.modifyDetails).toLowerCase().includes(query);
      return soMatch || projectMatch || customerMatch || idMatch || requesterMatch || modifyMatch;
    });
  }, [jobs, searchTerm]);

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
        (job.technician && String(job.technician).toLowerCase().includes(query)) ||
        (job.finishStatus && String(job.finishStatus).toLowerCase().includes(query)) ||
        (job.modifyDetails && String(job.modifyDetails).toLowerCase().includes(query)) ||
        (job.workDetails && job.workDetails.some((w) => w && String(w).toLowerCase().includes(query)));

      // Status filter (Supports raw finishStatus and specific status criteria)
      let matchStatus = true;
      if (statusFilter === 'PENDING') {
        matchStatus =
          (job.finishStatus === 'PENDING' || (!job.finishStatus && !job.engineerHandoverDate)) &&
          job.finishStatus !== 'FINISH' &&
          job.finishStatus !== 'IN_PROGRESS' &&
          job.finishStatus !== 'CANCELLED';
      } else if (statusFilter === 'IN_PROGRESS') {
        matchStatus =
          (job.finishStatus === 'IN_PROGRESS' || (Boolean(job.engineerHandoverDate) && job.finishStatus !== 'PENDING')) &&
          job.finishStatus !== 'FINISH' &&
          job.finishStatus !== 'CANCELLED';
      } else if (statusFilter === 'FINISH') {
        matchStatus =
          job.finishStatus === 'FINISH' &&
          (job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS');
      } else if (statusFilter === 'CANCELLED') {
        matchStatus = job.finishStatus === 'CANCELLED';
      } else if (statusFilter !== 'ALL') {
        const wfStatus = getJobWorkflowStatus(job);
        matchStatus = job.finishStatus === statusFilter || wfStatus.code === statusFilter;
      }

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
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'urgencyLevel') {
        const urgencyWeight: Record<string, number> = {
          VERY_URGENT: 3,
          URGENT: 2,
          NORMAL: 1,
        };
        valA = urgencyWeight[a.urgencyLevel || 'NORMAL'] || 1;
        valB = urgencyWeight[b.urgencyLevel || 'NORMAL'] || 1;
      } else if (sortField === 'workType') {
        valA = Array.isArray(a.workTypes) ? a.workTypes.join(',') : (a.workTypes || a.workType || '');
        valB = Array.isArray(b.workTypes) ? b.workTypes.join(',') : (b.workTypes || b.workType || '');
      }

      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [jobs, searchTerm, statusFilter, urgencyFilter, inspectionFilter, sortField, sortDirection]);

  // Reset to page 1 if filters or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, urgencyFilter, inspectionFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / (pageSize || 15)));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedJobs = useMemo(() => {
    if (pageSize === 0) return filteredJobs; // 0 means show all
    const start = (effectivePage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, effectivePage, pageSize]);

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
      'วันที่ช่างรับสินค้า',
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
        {/* Search Bar with Live Status Pop-up */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onFocus={() => {
              if (searchTerm.trim()) setIsSearchPopupOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsSearchPopupOpen(true);
              }
            }}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchPopupOpen(Boolean(e.target.value.trim()));
            }}
            placeholder="ค้นหา SO No., ชื่อโครงการ, ลูกค้า, Job ID (เช่น SO-2026, New Line)..."
            className="w-full pl-9 pr-28 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-medium"
          />

          <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchPopupOpen(false);
                }}
                title="ล้างคำค้นหา"
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSearchPopupOpen(true)}
              title="เปิดหน้าต่างค้นหาและสถานะงานขนาดเต็มจอ"
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-2xs"
            >
              <Search className="w-3 h-3 text-white" />
              <span>ค้นหาสถานะ</span>
            </button>
          </div>

          {/* Live Full-Page Search Status Screen */}
          <SearchStatusPopup
            searchTerm={searchTerm}
            matchedJobs={popupMatchedJobs}
            allJobs={jobs}
            isOpen={isSearchPopupOpen}
            onClose={() => setIsSearchPopupOpen(false)}
            onSearchChange={(term) => setSearchTerm(term)}
            onSelectJob={(job) => {
              setSearchTerm(job.saleSoNo || job.project || job.id);
              setIsSearchPopupOpen(false);
            }}
            onQuickStatus={onQuickStatus}
            onViewTicket={onViewTicket}
            onEditJob={onEdit}
            onAddNew={onAddNew}
          />
        </div>

        {/* Filter Dropdowns & View Density Controls */}
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
            <span className="text-xs text-slate-500 font-medium">สถานะงาน Modify:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent font-semibold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="PENDING">⏳ รอดำเนินการ (Pending)</option>
              <option value="IN_PROGRESS">⚙️ กำลังดำเนินการ (In Progress)</option>
              <option value="WAIT_QC">🔍 รอ QC ตรวจสอบ (Wait QC)</option>
              <option value="FINISH">✅ เสร็จสมบูรณ์ (Finish / ผ่าน QC)</option>
              <option value="CANCELLED">🚫 ยกเลิก (Cancelled)</option>
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

          {/* Limit / Page Size Selector (Default 15 Latest Items) */}
          <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-950 font-bold">แสดง:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs bg-transparent font-bold text-blue-900 outline-hidden cursor-pointer"
            >
              <option value={15}>15 ลำดับล่าสุด</option>
              <option value={30}>30 ลำดับ</option>
              <option value={50}>50 ลำดับ</option>
              <option value={0}>ทั้งหมด ({filteredJobs.length})</option>
            </select>
          </div>

          {/* Density Controls (Auto-Adjust table row height to fit different screen sizes) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200" title="ปรับระยะห่างตารางให้เหมาะกับขนาดหน้าจอ">
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                density === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="กะทัดรัด (สำหรับจอเล็กหรือดูข้อมูลเยอะ)"
            >
              กะทัดรัด
            </button>
            <button
              type="button"
              onClick={() => setDensity('standard')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                density === 'standard' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="มาตรฐาน (Auto-fit หน้าจอทั่วไป)"
            >
              มาตรฐาน
            </button>
            <button
              type="button"
              onClick={() => setDensity('spacious')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                density === 'spacious' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="โปร่งสบาย (สำหรับจอกว้าง)"
            >
              โปร่งสบาย
            </button>
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

      {/* Main Table - Fully Auto-Adjusting with Sticky Header and Key Columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto table-auto-container w-full max-h-[calc(100vh-250px)]">
          <table className="w-full text-left border-collapse min-w-[1240px] 2xl:min-w-full">
            {/* Sticky Header Row */}
            <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
              <tr className="border-b border-slate-800 uppercase text-[11px] font-bold tracking-wider">
                {/* Sticky # */}
                <th className="sticky left-0 z-30 bg-slate-900 py-3 px-2 text-center w-12 min-w-[48px] border-r border-slate-800">
                  #
                </th>
                {/* Sticky Job ID */}
                <th
                  onClick={() => handleSort('id')}
                  className="sticky left-[48px] z-30 bg-slate-900 py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors min-w-[100px] border-r border-slate-800 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-center gap-1">
                    <span>Job ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('workType')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>ประเภทงาน</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('urgencyLevel')}
                  className="py-3 px-2.5 cursor-pointer hover:bg-slate-800 transition-colors min-w-[115px] text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ความเร่งด่วน</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('requestDate')}
                  className="py-3 px-2.5 cursor-pointer hover:bg-slate-800 transition-colors min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    <span>วัน Request</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('customer')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>ลูกค้า & โครงการ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('saleSoNo')}
                  className="py-3 px-2.5 cursor-pointer hover:bg-slate-800 transition-colors min-w-[95px]"
                >
                  <div className="flex items-center gap-1">
                    <span>SO No.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sale')}
                  className="py-3 px-2.5 cursor-pointer hover:bg-slate-800 transition-colors min-w-[90px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Sale</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('technician')}
                  className="py-3 px-2.5 cursor-pointer hover:bg-slate-800 transition-colors min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>ช่างผู้ทำ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[170px] max-w-[280px]">รายละเอียดที่ให้ Modify</th>
                <th className="py-3 px-2 text-center w-14">จำนวน</th>
                <th className="py-3 px-2.5 min-w-[130px]">กำหนดส่งมอบ (Timeline)</th>
                <th className="py-3 px-2 text-center min-w-[110px]">ผลตรวจ QC</th>
                <th className="py-3 px-2.5 text-center min-w-[170px]">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <div className="flex items-center gap-1">
                      <span>สถานะงาน (Finish Status)</span>
                      <span className="text-[10px] text-amber-400 font-normal" title="คลิกเลือกเปลี่ยนสถานะได้ทันที">⚡</span>
                    </div>
                    <span className="text-[9px] text-amber-300 font-normal">คลิกเปลี่ยนสถานะได้</span>
                  </div>
                </th>
                {/* Sticky Action Header */}
                <th className="sticky right-0 z-30 bg-slate-900 py-3 px-3 text-right min-w-[135px] border-l border-slate-800 shadow-[-3px_0_6px_-1px_rgba(0,0,0,0.2)]">
                  จัดการ
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
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
                paginatedJobs.map((job, idx) => {
                  const isExpanded = expandedRow === job.id;
                  const isPainting = detectIsPaintingJob(job);
                  const completedLines = (job.workDetails || []).filter((l) => l && l.trim()).length;
                  const progress = getJobProgressDetails(job);
                  const elapsedDays = calculateWorkingDaysElapsed(job.engineerHandoverDate);
                  const rowSeqNumber = (effectivePage - 1) * (pageSize || filteredJobs.length) + idx + 1;

                  // Density padding & text sizing
                  const pyClass =
                    density === 'compact'
                      ? 'py-1.5'
                      : density === 'spacious'
                      ? 'py-3.5'
                      : 'py-2.5';
                  const fontSizeClass = density === 'compact' ? 'text-[11px]' : 'text-xs';
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';

                  return (
                    <React.Fragment key={job.id}>
                      <tr className={`hover:bg-blue-50/50 transition-colors group ${rowBg}`}>
                        {/* 1. Sticky ลำดับที่ */}
                        <td className={`sticky left-0 z-10 ${rowBg} group-hover:bg-blue-50/50 ${pyClass} px-2 text-center font-mono text-slate-500 font-bold text-[11px] border-r border-slate-200/60`}>
                          {rowSeqNumber}
                        </td>

                        {/* 2. Sticky Job ID */}
                        <td className={`sticky left-[48px] z-10 ${rowBg} group-hover:bg-blue-50/50 ${pyClass} px-3 border-r border-slate-200/60 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]`}>
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-blue-700 text-xs sm:text-sm">{job.id}</span>
                            {job.rowNumber && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Row #{job.rowNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. ประเภทงาน */}
                        <td className={`${pyClass} px-3 ${fontSizeClass}`}>
                          <div className="flex flex-col gap-1 items-start">
                            {(() => {
                              const wtDisplay = getWorkTypeDisplay(job.workTypes || job.workType);
                              if (wtDisplay.matched.length > 0) {
                                return wtDisplay.matched.map((wt) => (
                                  <span
                                    key={wt.id}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${wt.badgeClass}`}
                                  >
                                    <span>{wt.icon}</span>
                                    <span>{wt.shortName}</span>
                                  </span>
                                ));
                              }
                              if (isPainting) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-purple-50 text-purple-900 border-purple-300 whitespace-nowrap">
                                    <span>🎨</span>
                                    <span>งานพ่น/ทำสี</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200 whitespace-nowrap">
                                  <span>🔨</span>
                                  <span>Modify ทั่วไป</span>
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* 4. ระดับความเร่งด่วน */}
                        <td className={`${pyClass} px-2.5 text-center`}>
                          {(() => {
                            const urgency = getUrgencyDisplay(job.urgencyLevel);
                            if (urgency.level === 'VERY_URGENT') {
                              return (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs animate-pulse border border-rose-700 whitespace-nowrap">
                                  <span>🚨</span>
                                  <span>ด่วนมาก</span>
                                </span>
                              );
                            }
                            if (urgency.level === 'URGENT') {
                              return (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs border border-amber-600 whitespace-nowrap">
                                  <span>⚡</span>
                                  <span>งานด่วน</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                <span>ปกติ</span>
                              </span>
                            );
                          })()}
                        </td>

                        {/* 5. Request Date/Time & Requester */}
                        <td className={`${pyClass} px-2.5`}>
                          <div className="space-y-0.5">
                            <span className={`font-semibold text-slate-900 block ${fontSizeClass}`}>
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

                        {/* 6. Customer & Project */}
                        <td className={`${pyClass} px-3`}>
                          <div className="space-y-0.5 max-w-[160px] xl:max-w-[220px] 2xl:max-w-[300px]">
                            <span className={`font-bold text-slate-900 block truncate ${fontSizeClass}`} title={job.customer}>
                              {job.customer || '-'}
                            </span>
                            {job.project && (
                              <span className="text-[11px] text-slate-500 block truncate" title={job.project}>
                                {job.project}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. SO No. */}
                        <td className={`${pyClass} px-2.5`}>
                          {job.saleSoNo ? (
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 inline-block shadow-2xs whitespace-nowrap">
                              {job.saleSoNo}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">- ไม่มี -</span>
                          )}
                        </td>

                        {/* 8. Sale */}
                        <td className={`${pyClass} px-2.5`}>
                          <span className={`font-semibold text-slate-800 block truncate max-w-[100px] xl:max-w-[140px] ${fontSizeClass}`} title={job.sale}>
                            {job.sale || '-'}
                          </span>
                        </td>

                        {/* 9. Technician */}
                        <td className={`${pyClass} px-2.5`}>
                          {job.technician ? (
                            <div className={`flex items-center gap-1 font-bold text-slate-900 truncate max-w-[115px] xl:max-w-[150px] ${fontSizeClass}`} title={job.technician}>
                              <span className="text-blue-600 text-[11px]">🛠️</span>
                              <span className="truncate">{job.technician}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">- ยังไม่ระบุ -</span>
                          )}
                        </td>

                        {/* 10. Modify Details */}
                        <td className={`${pyClass} px-3`}>
                          <div className="max-w-[200px] xl:max-w-[260px] 2xl:max-w-[360px]">
                            <p className={`${fontSizeClass} text-slate-800 line-clamp-2 leading-relaxed`} title={job.modifyDetails}>
                              {job.modifyDetails || '- ไม่มีรายละเอียดระบุ -'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setExpandedRow(isExpanded ? null : job.id)}
                              className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              <Layers className="w-3 h-3" />
                              <span>{completedLines}/10 รายการย่อย</span>
                              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        </td>

                        {/* 11. Quantity */}
                        <td className={`${pyClass} px-2 text-center`}>
                          <span className={`font-bold text-slate-900 ${fontSizeClass} px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 inline-block`}>
                            {job.quantity || 1}
                          </span>
                        </td>

                        {/* 12. Timeline */}
                        <td className={`${pyClass} px-2.5`}>
                          <div className="space-y-0.5 text-xs min-w-[130px]">
                            {job.engineerHandoverDate ? (
                              <div className="flex items-center gap-1 text-slate-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className={fontSizeClass}>เริ่ม: <strong>{formatDateDisplay(job.engineerHandoverDate)}</strong></span>
                                {elapsedDays > 0 && job.finishStatus !== 'FINISH' && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded font-bold">
                                    {elapsedDays}ว.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors"
                              >
                                <Play className="w-2.5 h-2.5 fill-amber-800 text-amber-800" />
                                <span>เริ่มงาน</span>
                              </button>
                            )}
                            <span className="block text-slate-500 text-[10px]">
                              ส่งมอบ: <strong className="text-slate-700 font-medium">{formatDateDisplay(job.shipmentDate)}</strong>
                            </span>
                            {isOneDayBeforeDelivery(job) && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[9px] font-black animate-pulse">
                                <span>⚡</span>
                                <span>ส่งพรุ่งนี้</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 13. QC Result */}
                        <td
                          onClick={() => onQuickStatus(job)}
                          title="คลิกที่นี่เพื่อเปิดหน้าต่างอัปเดตผลตรวจ QC และสถานะงาน"
                          className={`${pyClass} px-2 text-center cursor-pointer hover:bg-emerald-50/60 transition-colors group/qccell`}
                        >
                          {(() => {
                            const isComplete = job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
                            const isEdit = job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
                            const isFinish = job.finishStatus === 'FINISH';
                            const isWaiting = isFinish && !isComplete && !isEdit;

                            if (isComplete) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickStatus(job);
                                  }}
                                  title="คลิกเพื่อเปลี่ยนผลการตรวจสอบ QC (สถานะปัจจุบัน: COMPLETE)"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 group-hover/qccell:bg-emerald-200 group-hover/qccell:scale-105 transition-all cursor-pointer shadow-2xs"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>COMPLETE</span>
                                </button>
                              );
                            }

                            if (isEdit) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickStatus(job);
                                  }}
                                  title="คลิกเพื่อเปลี่ยนผลการตรวจสอบ QC (สถานะปัจจุบัน: EDIT - ส่งกลับแก้ไข)"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 group-hover/qccell:bg-rose-200 group-hover/qccell:scale-105 transition-all cursor-pointer shadow-2xs"
                                >
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                  <span>EDIT</span>
                                </button>
                              );
                            }

                            if (isWaiting) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickStatus(job);
                                  }}
                                  title="คลิกเพื่อเปลี่ยนผลการตรวจสอบ QC (งานเสร็จ FINISH แล้ว รอการตรวจ QC)"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 group-hover/qccell:bg-amber-200 group-hover/qccell:scale-105 transition-all cursor-pointer shadow-2xs animate-pulse"
                                >
                                  <Clock className="w-2.5 h-2.5 text-amber-700" />
                                  <span>WAITING</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickStatus(job);
                                }}
                                title="คลิกเพื่ออัปเดตผลตรวจ QC"
                                className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 group-hover/qccell:text-slate-800 group-hover/qccell:bg-slate-200/70 transition-colors cursor-pointer"
                              >
                                <span>-</span>
                              </button>
                            );
                          })()}
                          {job.inspectionDate && (
                            <span className="block text-[9px] text-slate-400 mt-0.5">
                              {formatDateDisplay(job.inspectionDate)}
                            </span>
                          )}
                        </td>

                        {/* 14. Finish Status - Interactive Switcher with 4 options matching StatusUpdateModal */}
                        <td className={`${pyClass} px-2 text-center`}>
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="inline-flex items-center justify-center gap-1">
                              {/* Direct Finish Status Selector */}
                              <div className="relative inline-flex items-center">
                                <select
                                  value={job.finishStatus || 'PENDING'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const val = e.target.value;
                                    if (onUpdateStatus) {
                                      onUpdateStatus(job, val);
                                    } else {
                                      onQuickStatus({ ...job, finishStatus: val });
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  title="คลิกเพื่อเปลี่ยนสถานะงาน Finish Status ได้ทันที"
                                  className={`appearance-none text-[11px] font-bold py-1 pl-2.5 pr-6 rounded-full border cursor-pointer transition-all shadow-2xs focus:outline-none focus:ring-2 active:scale-95 text-center ${
                                    job.finishStatus === 'FINISH'
                                      ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 focus:ring-emerald-400/40 ring-1 ring-emerald-600/30'
                                      : job.finishStatus === 'IN_PROGRESS' || job.engineerHandoverDate
                                      ? 'bg-amber-500 text-white border-amber-400 hover:bg-amber-600 focus:ring-amber-400/40 ring-1 ring-amber-500/30'
                                      : job.finishStatus === 'CANCELLED'
                                      ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700 focus:ring-rose-400/40'
                                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-amber-50 hover:border-amber-300 focus:ring-slate-400/30'
                                  }`}
                                >
                                  <option value="PENDING" className="bg-white text-slate-800 font-semibold py-1">
                                    ⏳ PENDING (รอดำเนินการ)
                                  </option>
                                  <option value="IN_PROGRESS" className="bg-white text-amber-900 font-semibold py-1">
                                    ⚙️ IN_PROGRESS (กำลังดำเนินการ)
                                  </option>
                                  <option value="FINISH" className="bg-white text-emerald-900 font-semibold py-1">
                                    ✅ FINISH (เสร็จสมบูรณ์ / รอ QC)
                                  </option>
                                  <option value="CANCELLED" className="bg-white text-rose-900 font-semibold py-1">
                                    🚫 CANCELLED (ยกเลิก)
                                  </option>
                                </select>
                                <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-80" />
                              </div>

                              {/* Button to open full StatusUpdateModal */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickStatus(job);
                                }}
                                title="เปิดหน้าต่างอัปเดตสถานะงาน Modify (ปรับปรุง Timeline, ช่าง, ผลตรวจ QC)"
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-all cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Sub-badge for QC State or Start Work shortcut */}
                            {job.finishStatus === 'FINISH' ? (
                              <div className="flex items-center justify-center">
                                {job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS' ? (
                                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                                    ✓ ผ่าน QC แล้ว
                                  </span>
                                ) : job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT' ? (
                                  <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md animate-pulse">
                                    ⚠️ QC ส่งกลับแก้ไข
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                                    ⏳ รอตรวจ QC
                                  </span>
                                )}
                              </div>
                            ) : job.finishStatus === 'PENDING' || !job.finishStatus ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onStartWork) onStartWork(job);
                                  else if (onUpdateStatus) onUpdateStatus(job, 'IN_PROGRESS');
                                  else onQuickStatus(job);
                                }}
                                title="คลิกเพื่อเริ่มงานวันนี้"
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                              >
                                <Play className="w-2 h-2 fill-amber-700" />
                                <span>เริ่มงานวันนี้</span>
                              </button>
                            ) : null}
                          </div>
                        </td>

                        {/* 15. Sticky Action Column */}
                        <td className={`sticky right-0 z-10 ${rowBg} group-hover:bg-blue-50/50 ${pyClass} px-3 text-right border-l border-slate-200/60 shadow-[-3px_0_6px_-1px_rgba(0,0,0,0.05)]`}>
                          <div className="flex items-center justify-end gap-0.5">
                            {job.finishStatus !== 'FINISH' && (
                              <button
                                type="button"
                                onClick={() => onStartWork?.(job) || onQuickStatus(job)}
                                title="เริ่มปฏิบัติงาน / เลือกวันเริ่มงาน"
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors font-bold"
                              >
                                <Play className="w-3.5 h-3.5 fill-amber-600" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewTicket(job)}
                              title="ดูใบสั่งงานขนาด A4 / Print Preview"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickStatus(job)}
                              title="อัปเดตสถานะเร็ว"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEdit(job)}
                              title="แก้ไขข้อมูลทั้งหมด"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(job)}
                              title="ลบคำขอนี้จาก Google Sheet"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded 10-Line Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={15} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                                <span>รายละเอียดงาน ({job.id}):</span>
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

        {/* Table Footer: 15 Latest Items indicator & Pagination */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              แสดง{' '}
              {filteredJobs.length === 0
                ? '0'
                : `${(effectivePage - 1) * (pageSize || filteredJobs.length) + 1} - ${Math.min(
                    effectivePage * (pageSize || filteredJobs.length),
                    filteredJobs.length
                  )}`}{' '}
              จากทั้งหมด <span className="font-bold text-blue-700">{filteredJobs.length}</span> รายการ
            </span>
            {pageSize > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[10px] font-bold border border-blue-200">
                <Clock className="w-3 h-3" />
                โชว์ {pageSize} ลำดับล่าสุด
              </span>
            )}
          </div>

          {totalPages > 1 && pageSize > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={effectivePage <= 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>ก่อนหน้า</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  // Show current page and nearby pages if many
                  if (
                    totalPages <= 7 ||
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - effectivePage) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          effectivePage === pageNum
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 2 && effectivePage > 3) {
                    return <span key="dots-1" className="px-1 text-slate-400">...</span>;
                  }
                  if (pageNum === totalPages - 1 && effectivePage < totalPages - 2) {
                    return <span key="dots-2" className="px-1 text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={effectivePage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 flex items-center gap-1 transition-all"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
