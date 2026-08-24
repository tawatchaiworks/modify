import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemDetails?: { label: string; value: string | number }[];
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  itemDetails,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className={`p-5 flex items-start gap-3.5 ${isDestructive ? 'bg-rose-50 border-b border-rose-100' : 'bg-slate-50 border-b border-slate-200'}`}>
          <div className={`p-2.5 rounded-xl shrink-0 ${isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
            {isDestructive ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-bold ${isDestructive ? 'text-rose-900' : 'text-slate-900'}`}>{title}</h3>
            <p className="text-sm text-slate-600 mt-0.5">{message}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Details Breakdown */}
        {itemDetails && itemDetails.length > 0 && (
          <div className="p-5 max-h-60 overflow-y-auto space-y-2 bg-slate-50/50 border-b border-slate-100 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              ข้อมูลที่ได้รับผลกระทบใน Google Sheets:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {itemDetails.map((item, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-slate-500 font-medium block">{item.label}</span>
                  <span className="text-slate-800 font-semibold truncate block mt-0.5">{item.value || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-white flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            } disabled:opacity-50`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
