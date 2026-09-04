import React from 'react';
import {
  Table,
  LayoutGrid,
  Calendar as CalendarIcon,
  BarChart3,
  Printer,
  Calculator,
  PlusCircle,
  Bell,
  ChevronRight,
  Sparkles,
  Search,
  Users,
} from 'lucide-react';
import { ViewMode } from '../types';

interface RightSidebarNavProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenNewForm: () => void;
  onOpenEstimator: () => void;
  onOpenPrintReport: () => void;
  onOpenSearch?: () => void;
  onOpenTechnicianQueue?: () => void;
  deliveryAlertCount?: number;
  onOpenDeliveryAlert?: () => void;
  totalJobsCount?: number;
}

export const RightSidebarNav: React.FC<RightSidebarNavProps> = ({
  viewMode,
  onViewModeChange,
  onOpenNewForm,
  onOpenEstimator,
  onOpenPrintReport,
  onOpenSearch,
  onOpenTechnicianQueue,
  deliveryAlertCount = 0,
  onOpenDeliveryAlert,
  totalJobsCount = 0,
  }) => {
  return (
    <aside
      id="right-sidebar-navigation"
      aria-label="เมนูควบคุมและมุมมอง"
      className="w-full lg:w-68 shrink-0 flex flex-col"
    >
      {/* กล่องเมนูและเครื่องมือ น้ำตาลเทา (Warm Taupe / Stone-Brown Container) */}
      <div className="bg-[#ede9e3] border border-[#d8d1c5] rounded-2xl shadow-sm p-3.5 flex flex-col gap-2.5 lg:sticky lg:top-24">
        {/* 1. สร้างคำขอ Modify (ซ่อนเมื่ออยู่หน้าปฏิทินตามคำสั่ง) */}
        {viewMode !== 'calendar' && (
          <button
            id="nav-btn-create-modify"
            type="button"
            onClick={onOpenNewForm}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4a4036] hover:bg-[#3d342b] text-[#fbf9f5] text-sm font-extrabold rounded-xl shadow-sm hover:shadow active:scale-98 transition-all cursor-pointer group border border-[#382f26]"
          >
            <PlusCircle className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-200 shrink-0" />
            <span className="tracking-wide">สร้างคำขอ Modify</span>
          </button>
        )}

        {/* 2. หัวข้อ: มุมมองและเครื่องมือ + จำนวนงาน */}
        <div className="px-2 pt-1 pb-1.5 flex items-center justify-between border-b border-[#ded7cc]">
          <span className="text-[12px] font-extrabold tracking-wider text-[#685e52] uppercase">
            มุมมองและเครื่องมือ
          </span>
          {totalJobsCount > 0 && (
            <span className="text-[11px] font-bold text-[#574c40] bg-[#dfd9cf] border border-[#cfc7bc] px-2 py-0.5 rounded-full shadow-2xs">
              {totalJobsCount} งาน
            </span>
          )}
        </div>

        {/* รายการเมนูเรียงลงมาตามลำดับ */}
        <div className="flex flex-col gap-1.5">
          {/* 3. ตาราง (Table) */}
          <button
            id="nav-tab-table"
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-[#2c241c] border border-[#cfc7bc] shadow-xs'
                : 'text-[#5a4f43] hover:bg-[#e4ded6] hover:text-[#2c241c] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-lg ${
                  viewMode === 'table'
                    ? 'bg-[#4a4036] text-amber-200'
                    : 'bg-[#ded7cc] text-[#5a4f43]'
                }`}
              >
                <Table className="w-4 h-4" />
              </div>
              <span>ตาราง (Table)</span>
            </div>
            {viewMode === 'table' ? (
              <span className="w-2 h-2 rounded-full bg-amber-600 ring-2 ring-amber-200" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#b0a79a]" />
            )}
          </button>

          {/* 4. การ์ด (Cards) */}
          <button
            id="nav-tab-cards"
            type="button"
            onClick={() => onViewModeChange('cards')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white text-[#2c241c] border border-[#cfc7bc] shadow-xs'
                : 'text-[#5a4f43] hover:bg-[#e4ded6] hover:text-[#2c241c] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-lg ${
                  viewMode === 'cards'
                    ? 'bg-[#4a4036] text-amber-200'
                    : 'bg-[#ded7cc] text-[#5a4f43]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </div>
              <span>การ์ด (Cards)</span>
            </div>
            {viewMode === 'cards' ? (
              <span className="w-2 h-2 rounded-full bg-amber-600 ring-2 ring-amber-200" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#b0a79a]" />
            )}
          </button>

          {/* 5. ปฏิทิน (Calendar) */}
          <button
            id="nav-tab-calendar"
            type="button"
            onClick={() => onViewModeChange('calendar')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white text-[#2c241c] border border-[#cfc7bc] shadow-xs'
                : 'text-[#5a4f43] hover:bg-[#e4ded6] hover:text-[#2c241c] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-lg ${
                  viewMode === 'calendar'
                    ? 'bg-[#4a4036] text-amber-200'
                    : 'bg-[#ded7cc] text-[#5a4f43]'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
              </div>
              <span>ปฏิทิน (Calendar)</span>
            </div>
            {viewMode === 'calendar' ? (
              <span className="w-2 h-2 rounded-full bg-amber-600 ring-2 ring-amber-200" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#b0a79a]" />
            )}
          </button>

          {/* 6. KPI ช่าง & อัตราสำเร็จ */}
          <button
            id="nav-tab-kpi"
            type="button"
            onClick={() => onViewModeChange('kpi')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'kpi'
                ? 'bg-white text-[#2c241c] border border-[#cfc7bc] shadow-xs'
                : 'text-[#5a4f43] hover:bg-[#e4ded6] hover:text-[#2c241c] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-lg ${
                  viewMode === 'kpi'
                    ? 'bg-[#4a4036] text-amber-200'
                    : 'bg-[#ded7cc] text-[#5a4f43]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>KPI ช่าง & อัตราสำเร็จ</span>
            </div>
            {viewMode === 'kpi' ? (
              <span className="w-2 h-2 rounded-full bg-amber-600 ring-2 ring-amber-200" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#b0a79a]" />
            )}
          </button>

          {/* 7. เช็คสถานะ & คิวงานช่าง (Technician Queue Tracker) */}
          {onOpenTechnicianQueue && (
            <button
              id="nav-btn-technician-queue"
              type="button"
              onClick={onOpenTechnicianQueue}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#2c241c] hover:text-white bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-700 hover:to-amber-800 border border-amber-300 hover:border-amber-700 shadow-2xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-600 text-white group-hover:bg-white group-hover:text-amber-800 transition-colors shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="leading-tight">เช็คสถานะ & คิวช่าง</span>
                  <span className="text-[10px] font-medium opacity-80 leading-tight">พิมพ์ชื่อดูคิวงาน</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-800 group-hover:text-white transition-colors" />
            </button>
          )}

          <div className="my-1 border-t border-[#ded7cc]" />

          {/* 8. ค้นหาสถานะงาน (Full Screen) */}
          {onOpenSearch && (
            <button
              id="nav-btn-search-status"
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#443a2f] hover:text-[#1f1913] bg-[#e4ded6] hover:bg-white border border-[#d3cbc0] hover:border-[#b8ae9f] shadow-2xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#cfc6b8] text-[#3d3326] group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <span>ค้นหาสถานะงาน</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#a19788] group-hover:text-[#4a4036] transition-colors" />
            </button>
          )}

          {/* 8. พิมพ์รายงาน A4 */}
          <button
            id="nav-btn-print-report"
            type="button"
            onClick={onOpenPrintReport}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#443a2f] hover:text-[#1f1913] bg-[#e4ded6] hover:bg-white border border-[#d3cbc0] hover:border-[#b8ae9f] shadow-2xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#cfc6b8] text-[#3d3326] group-hover:bg-[#4a4036] group-hover:text-amber-200 transition-colors">
                <Printer className="w-4 h-4" />
              </div>
              <span>พิมพ์รายงาน A4</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#a19788] group-hover:text-[#4a4036] transition-colors" />
          </button>

          {/* 9. คำนวณวันเวลา */}
          <button
            id="nav-btn-calculator"
            type="button"
            onClick={onOpenEstimator}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#443a2f] hover:text-[#1f1913] bg-[#e4ded6] hover:bg-white border border-[#d3cbc0] hover:border-[#b8ae9f] shadow-2xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#cfc6b8] text-[#3d3326] group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Calculator className="w-4 h-4" />
              </div>
              <span>คำนวณวันเวลา</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </button>

          {/* แจ้งเตือนส่งมอบ 1 วัน (ถ้ามี) */}
          {deliveryAlertCount > 0 && onOpenDeliveryAlert && (
            <button
              id="nav-btn-delivery-alert"
              type="button"
              onClick={onOpenDeliveryAlert}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 transition-all cursor-pointer shadow-xs animate-pulse mt-1"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/20 text-white">
                  <Bell className="w-4 h-4 animate-bounce" />
                </div>
                <span>เตือนส่งมอบ 1 วัน</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 text-xs font-black shadow-xs">
                {deliveryAlertCount}
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
