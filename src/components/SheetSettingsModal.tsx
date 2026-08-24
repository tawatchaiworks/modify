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
  Copy,
  Users,
  ShieldCheck,
  Share2,
  CloudUpload,
} from 'lucide-react';
import { GoogleSpreadsheetInfo } from '../types';

interface SheetSettingsModalProps {
  spreadsheet: GoogleSpreadsheetInfo | null;
  isOpen: boolean;
  isLoading: boolean;
  onCreateNewSheet: (title: string) => Promise<void>;
  onConnectExistingSheet: (sheetId: string) => Promise<void>;
  onReformatHeaders: () => Promise<void>;
  onSyncAllToSheet?: () => Promise<void>;
  onClose: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  spreadsheet,
  isOpen,
  isLoading,
  onCreateNewSheet,
  onConnectExistingSheet,
  onReformatHeaders,
  onSyncAllToSheet,
  onClose,
}) => {
  const [newTitle, setNewTitle] = useState('ตาราง modify');
  const [existingSheetIdOrUrl, setExistingSheetIdOrUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'create' | 'connect' | 'share'>('current');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 3000);
  };

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

  const appShareUrl = spreadsheet?.id
    ? `${window.location.origin}${window.location.pathname}?sheetId=${spreadsheet.id}`
    : window.location.href;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">การเชื่อมต่อ Google Sheets & สิทธิ์ผู้ใช้</h3>
              <p className="text-xs text-slate-300">ตารางฐานข้อมูลกลางและการใช้งานร่วมกันในทีม</p>
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
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-3 px-3 text-center whitespace-nowrap transition-all ${
              activeTab === 'current'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ชีตปัจจุบัน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-3 px-3 text-center whitespace-nowrap transition-all ${
              activeTab === 'share'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 การแชร์ & สิทธิ์ Owner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-3 text-center whitespace-nowrap transition-all ${
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
            className={`flex-1 py-3 px-3 text-center whitespace-nowrap transition-all ${
              activeTab === 'connect'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เชื่อมด้วย ID
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Tab 1: Current Sheet Info */}
          {activeTab === 'current' && (
            <div className="space-y-4 text-xs sm:text-sm">
              {spreadsheet ? (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-950">ชื่อไฟล์ชีต:</span>
                      <span className="font-bold text-emerald-900">{spreadsheet.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">Sheet ID:</span>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="font-mono text-xs text-slate-700 truncate max-w-[180px]">{spreadsheet.id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(spreadsheet.id, 'id')}
                          className="p-1 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded text-[11px] flex items-center gap-1"
                          title="Copy Sheet ID"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedText === 'id' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500 font-medium">Tab:</span>
                      <span className="font-semibold text-slate-800">{spreadsheet.sheetName}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-emerald-800 font-semibold bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Auto Sync ทุก 3 วินาที:
                      </span>
                      <span className="text-xs text-emerald-700 font-bold">เปิดใช้งาน (Active)</span>
                    </div>
                  </div>

                  {/* Quick Share Link Box */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      <span>ลิงก์แชร์เปิดแอปพร้อมเชื่อมต่อชีตนี้ทันที:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={appShareUrl}
                        className="w-full text-xs font-mono bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-slate-700 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(appShareUrl, 'url')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-2xs flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText === 'url' ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-700">
                      💡 ส่งลิงก์นี้ให้เพื่อนร่วมงาน (เช่น praewjurai@gmail.com) เมื่อเปิดลิงก์และล็อกอินจะเข้าถึงชีตเดียวกันทันที
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {onSyncAllToSheet && (
                      <button
                        type="button"
                        onClick={onSyncAllToSheet}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>อัปเดต / ซิงค์ข้อมูลทั้งหมดลง Google Sheet ตอนนี้</span>
                      </button>
                    )}

                    <a
                      href={spreadsheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold shadow-2xs transition-all"
                    >
                      <span>เปิด Google Sheet ในแท็บใหม่</span>
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                    </a>

                    <button
                      type="button"
                      onClick={onReformatHeaders}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all disabled:opacity-50 cursor-pointer"
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

          {/* Tab: Multi-user Sharing & Equal Permissions Info */}
          {activeTab === 'share' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">สิทธิ์การใช้งานแอปเท่าเทียมกัน (Full Owner Access)</h4>
                  <p className="text-emerald-800 mt-1 leading-relaxed">
                    ผู้ใช้ทุกคนที่เข้าสู่ระบบด้วย Google (เช่น <strong>tawatchai.works@gmail.com</strong>, <strong>praewjurai@gmail.com</strong> หรือทีมงานคนอื่นๆ) 
                    จะมีสิทธิ์ในการ <strong>ดู, สร้างคำขอ, แก้ไข, อัปเดตสถานะด่วน, พิมพ์ใบงาน A4 และส่งออกข้อมูล</strong> ได้เต็มรูปแบบเท่าเทียมกันทุกคน
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>วิธีตั้งค่าให้ทุกคนเห็นและอัปเดตข้อมูลชุดเดียวกัน 100%:</span>
                </h5>
                <ol className="list-decimal pl-4 space-y-2 text-slate-700 leading-relaxed">
                  <li>
                    <strong>แชร์สิทธิ์ใน Google Sheet:</strong> เปิดไฟล์ Google Sheet แล้วกดปุ่ม <strong>"แชร์ (Share)"</strong> ที่มุมขวาบน
                  </li>
                  <li>
                    <strong>เพิ่มอีเมลทีมงาน:</strong> พิมพ์อีเมลของเพื่อนร่วมงาน (เช่น <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-800">praewjurai@gmail.com</code>)
                  </li>
                  <li>
                    <strong>กำหนดสิทธิ์เป็น "ผู้แก้ไข (Editor)":</strong> เพื่อให้สามารถเขียนและอัปเดตข้อมูลลงชีตเดียวกันได้
                  </li>
                  <li>
                    <strong>ส่งลิงก์แอป:</strong> คัดลอกลิงก์แอปพร้อม Sheet ID ให้ทีมงานเปิด แล้วกดเข้าสู่ระบบ Google จะเชื่อมต่อข้อมูลเดียวกันทันที
                  </li>
                </ol>
              </div>

              {spreadsheet && (
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="text-[11px] text-slate-500 block">Sheet ID กลาง:</span>
                    <span className="font-mono font-bold text-slate-800 truncate block">{spreadsheet.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(spreadsheet.id, 'share_id')}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedText === 'share_id' ? 'คัดลอกแล้ว' : 'คัดลอก ID'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Create New Sheet */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
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
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ใส่ Google Sheet ID หรือ Full URL ของชีตที่แชร์ร่วมกัน
                </label>
                <input
                  type="text"
                  required
                  value={existingSheetIdOrUrl}
                  onChange={(e) => setExistingSheetIdOrUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0... หรือ Sheet ID"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  คัดลอกลิงก์หรือ ID ของ Google Sheet ที่แชร์มาจาก tawatchai.works@gmail.com หรือทีมงานมาวางที่นี่
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
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
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

