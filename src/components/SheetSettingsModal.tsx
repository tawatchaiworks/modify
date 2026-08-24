import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  Plus,
  Link,
  Sparkles,
  CheckCircle,
  Database,
} from 'lucide-react';
import { GoogleSpreadsheetInfo } from '../types';

interface SheetSettingsModalProps {
  spreadsheet: GoogleSpreadsheetInfo | null;
  isOpen: boolean;
  isLoading: boolean;
  onCreateNewSheet: (title: string) => Promise<void>;
  onConnectExistingSheet: (sheetId: string) => Promise<void>;
  onReformatHeaders: () => Promise<void>;
  onClose: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  spreadsheet,
  isOpen,
  isLoading,
  onCreateNewSheet,
  onConnectExistingSheet,
  onReformatHeaders,
  onClose,
}) => {
  const [newTitle, setNewTitle] = useState('ตาราง modify');
  const [existingSheetIdOrUrl, setExistingSheetIdOrUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'create' | 'connect'>('current');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onCreateNewSheet(newTitle.trim());
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    let id = existingSheetIdOrUrl.trim();
    // Extract ID if user pasted full URL e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
    const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      id = match[1];
    }
    if (!id) {
      alert('กรุณากรอก Spreadsheet ID หรือ URL ให้ถูกต้อง');
      return;
    }
    await onConnectExistingSheet(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">การเชื่อมต่อ Google Sheets</h3>
              <p className="text-xs text-slate-300">ตั้งค่าและจัดการตารางเก็บข้อมูลงาน Modify</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-3 px-4 text-center transition-all ${
              activeTab === 'current'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ชีตปัจจุบัน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-4 text-center transition-all ${
              activeTab === 'create'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            สร้างชีตใหม่
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`flex-1 py-3 px-4 text-center transition-all ${
              activeTab === 'connect'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เชื่อมต่อด้วย Sheet ID
          </button>
        </div>

        {/* Tab 1: Current Sheet Info */}
        {activeTab === 'current' && (
          <div className="p-5 space-y-4 text-xs sm:text-sm">
            {spreadsheet ? (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-950">ชื่อไฟล์ชีต:</span>
                    <span className="font-bold text-emerald-900">{spreadsheet.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Sheet ID:</span>
                    <span className="font-mono text-xs text-slate-700 truncate max-w-[200px]">{spreadsheet.id}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-medium">Tab:</span>
                    <span className="font-semibold text-slate-800">{spreadsheet.sheetName}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={spreadsheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all"
                  >
                    <span>เปิด Google Sheet ในแท็บใหม่</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={onReformatHeaders}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>จัดรูปแบบหัวตาราง 16 คอลัมน์ (Format Headers)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <p>ยังไม่มี Google Sheet ที่เชื่อมต่อ</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create New Sheet */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ Google Spreadsheet ที่ต้องการสร้าง
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="เช่น ตาราง modify หรือ Modify Tracker 2026"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                ระบบจะสร้าง Google Sheet ใหม่ใน Google Drive ของคุณ พร้อมตั้งหัวตาราง 16 คอลัมน์และตรึงแถวหัวตารางให้อัตโนมัติ
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>สร้าง Google Sheet ใหม่</span>
            </button>
          </form>
        )}

        {/* Tab 3: Connect by ID */}
        {activeTab === 'connect' && (
          <form onSubmit={handleConnect} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ใส่ Google Sheet ID หรือ Full URL
              </label>
              <input
                type="text"
                required
                value={existingSheetIdOrUrl}
                onChange={(e) => setExistingSheetIdOrUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0... หรือ ID"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                คัดลอกลิงก์ Google Sheet ที่คุณต้องการเชื่อมต่อมาวางที่นี่
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Link className="w-4 h-4" />
              )}
              <span>เชื่อมต่อชีตนี้</span>
            </button>
          </form>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
