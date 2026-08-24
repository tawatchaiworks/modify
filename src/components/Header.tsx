import React from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Table,
  LayoutGrid,
  Calendar as CalendarIcon,
  LogOut,
  Sparkles,
  Settings,
  Database,
} from 'lucide-react';
import { GoogleSpreadsheetInfo, ViewMode } from '../types';

interface HeaderProps {
  user: User | null;
  spreadsheet: GoogleSpreadsheetInfo | null;
  viewMode: ViewMode;
  isLoading: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenNewForm: () => void;
  onRefresh: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSheetSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  spreadsheet,
  viewMode,
  isLoading,
  onViewModeChange,
  onOpenNewForm,
  onRefresh,
  onLogin,
  onLogout,
  onOpenSheetSettings,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  ระบบบันทึกงาน Modify
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Google Sheet Sync
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>ตารางบันทึกข้อมูลและติดตามสถานะงาน Modify ทั้ง 16 รายการ</span>
              </div>
            </div>
          </div>

          {/* Spreadsheet Status & Direct Link */}
          {user && spreadsheet && (
            <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-xs">
                <span className="font-medium text-emerald-950">ชีต:</span>
                <span className="truncate font-semibold">{spreadsheet.name}</span>
              </div>
              <a
                href={spreadsheet.url}
                target="_blank"
                rel="noopener noreferrer"
                title="เปิดไฟล์ใน Google Sheets"
                className="ml-1 p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 hover:text-emerald-900 transition-colors inline-flex items-center gap-1 font-medium"
              >
                <span>เปิด Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onOpenSheetSettings}
                title="เปลี่ยนหรือตั้งค่า Google Sheet"
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Controls & Auth */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher: Table, Cards, Calendar */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => onViewModeChange('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>ตาราง (Table)</span>
              </button>
              <button
                onClick={() => onViewModeChange('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>การ์ด (Cards)</span>
              </button>
              <button
                onClick={() => onViewModeChange('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>ปฏิทิน (Calendar)</span>
              </button>
            </div>

            {/* Refresh Button */}
            {user && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="รีเฟรชข้อมูลจาก Google Sheet"
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            {/* New Request Button */}
            <button
              onClick={onOpenNewForm}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-blue-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างคำขอ Modify</span>
            </button>

            {user ? (
              /* User Dropdown / Sign Out */
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full ring-2 ring-blue-500/20 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Google Sign-in Material button according to Skill requirements */
              <button
                type="button"
                onClick={onLogin}
                className="flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-xl border border-slate-300 shadow-xs hover:shadow-sm transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>เข้าสู่ระบบด้วย Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
