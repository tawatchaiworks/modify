import React from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  LogOut,
  Settings,
  Search,
  X,
} from 'lucide-react';
import { GoogleSpreadsheetInfo } from '../types';

interface HeaderProps {
  user: User | null;
  spreadsheet: GoogleSpreadsheetInfo | null;
  isLoading: boolean;
  isAutoSyncing?: boolean;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  onRefresh: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSheetSettings: () => void;
  onOpenSearchStatus?: (term?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  spreadsheet,
  isLoading,
  isAutoSyncing = false,
  searchTerm = '',
  onSearchTermChange,
  onRefresh,
  onLogin,
  onLogout,
  onOpenSheetSettings,
  onOpenSearchStatus,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onOpenSearchStatus) {
        onOpenSearchStatus(searchTerm);
      }
    }
  };

  return (
    <header className="bg-[#f1f3f5] border-b border-slate-300 sticky top-0 z-30 shadow-sm">
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 sm:py-3.5 gap-3 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-lg bg-slate-950 text-amber-400 font-mono font-black text-xs sm:text-sm tracking-widest border border-amber-400/40 shadow-xs">
                  LUMENCRAFT
                </span>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                  ระบบบันทึกงาน Modify
                </h1>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 text-blue-800 border border-blue-300">
                  Google Sheet Sync
                </span>
              </div>
            </div>
          </div>

          {/* Center/Right Area: Direct Search Input Box & Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 md:justify-end">
            {/* Search Input Box with key-in capability (ช่องให้ key คำค้นหา) */}
            {onOpenSearchStatus && (
              <div className="relative flex items-center flex-1 max-w-md sm:max-w-xs lg:max-w-sm">
                <div className="relative w-full flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    id="header-search-status-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange?.(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ค้นหาสถานะ (SO, Job, ลูกค้า, ช่าง)..."
                    className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 placeholder:text-slate-400 outline-hidden shadow-2xs font-medium transition-all"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => onSearchTermChange?.('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="ล้างคำค้นหา"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  id="header-btn-search-status"
                  type="button"
                  onClick={() => onOpenSearchStatus(searchTerm)}
                  className="ml-1.5 sm:ml-2 flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all cursor-pointer shrink-0 border border-blue-500"
                  title="กดเพื่อค้นหาและติดตามสถานะงาน"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">ค้นหา</span>
                </button>
              </div>
            )}

            {/* Spreadsheet Status & Direct Link */}
            {user && spreadsheet && (
              <div className="hidden 2xl:flex items-center gap-2 bg-emerald-100/70 border border-emerald-300/90 px-3 py-1.5 rounded-xl text-xs text-emerald-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                  <span className="font-bold text-emerald-950">ชีต:</span>
                  <span className="truncate font-semibold">{spreadsheet.name}</span>
                </div>
                <a
                  href={spreadsheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="เปิดไฟล์ใน Google Sheets"
                  className="ml-0.5 p-1 hover:bg-emerald-200/70 rounded-lg text-emerald-800 hover:text-emerald-950 transition-colors inline-flex items-center gap-1 font-bold text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={onOpenSheetSettings}
                  title="เปลี่ยนหรือตั้งค่า Google Sheet"
                  className="p-1 hover:bg-emerald-200/70 rounded-lg text-emerald-800 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Refresh Button */}
            {user && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading || isAutoSyncing}
                title="ดึงข้อมูลล่าสุดจาก Google Sheet"
                className="p-2 text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-200/80 rounded-xl border border-slate-300 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            {user ? (
              /* User Dropdown / Sign Out */
              <div className="flex items-center gap-2 sm:gap-2.5 pl-1 sm:pl-2 border-l border-slate-300">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ring-2 ring-blue-500/30 object-cover shadow-2xs"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="hidden xl:block text-left">
                    <span className="text-xs font-extrabold text-slate-850 block leading-tight truncate max-w-[110px]">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 px-1.5 py-0.2 rounded border border-emerald-300 inline-block mt-0.5">
                      Owner Access
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Google Sign-in Material button */
              <button
                type="button"
                onClick={onLogin}
                className="flex items-center gap-2 px-3.5 py-1.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-850 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 shadow-xs hover:shadow transition-all cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>เข้าสู่ระบบ Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

