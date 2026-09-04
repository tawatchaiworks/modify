import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  PlusCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  X,
  ExternalLink,
  Info,
  Sparkles,
  Layers,
  Wrench,
  Printer,
} from 'lucide-react';
import { ModifyJobItem, GoogleSpreadsheetInfo, ViewMode } from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  getStoredAccessToken,
} from './services/firebase';
import {
  findExistingSpreadsheet,
  createModifySpreadsheet,
  fetchModifyJobsFromSheet,
  fetchModifyJobsFromPublicSheet,
  appendModifyJobToSheet,
  updateModifyJobInSheet,
  deleteModifyJobFromSheet,
  syncAllJobsToSheet,
  setupSheetHeaders,
  saveSpreadsheetInfo,
  getSpreadsheetMetadata,
  getSavedSpreadsheetInfo,
  DEFAULT_PRIMARY_SPREADSHEET_ID,
} from './services/googleSheets';
import { Header } from './components/Header';
import { RightSidebarNav } from './components/RightSidebarNav';
import { StatsOverview } from './components/StatsOverview';
import { ModifyJobTable } from './components/ModifyJobTable';
import { ModifyJobCardView } from './components/ModifyJobCardView';
import { ModifyJobCalendarView } from './components/ModifyJobCalendarView';
import { TechnicianKpiDashboard } from './components/TechnicianKpiDashboard';
import { ModifyRequestForm } from './components/ModifyRequestForm';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { StartWorkModal } from './components/StartWorkModal';
import { PrintJobTicket } from './components/PrintJobTicket';
import { PrintStatusReportModal } from './components/PrintStatusReportModal';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DeliveryAlertModal } from './components/DeliveryAlertModal';
import { ModifyDateEstimatorModal } from './components/ModifyDateEstimatorModal';
import { SearchStatusPopup } from './components/SearchStatusPopup';
import { TechnicianQueueModal } from './components/TechnicianQueueModal';
import { formatDateDisplay, getOneDayDeliveryAlertJobs, getCurrentDateFormatted } from './utils/formatters';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<GoogleSpreadsheetInfo | null>(() => {
    const saved = getSavedSpreadsheetInfo();
    const sheetId = saved?.id || DEFAULT_PRIMARY_SPREADSHEET_ID;
    const sheetName = saved?.name || 'ตาราง modify';
    return {
      id: sheetId,
      name: sheetName,
      url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      sheetName: 'modify',
    };
  });
  const [jobs, setJobs] = useState<ModifyJobItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auto-sync states & refs
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);

  const jobsRef = useRef<ModifyJobItem[]>(jobs);
  const spreadsheetRef = useRef<GoogleSpreadsheetInfo | null>(spreadsheet);
  const userRef = useRef<User | null>(user);
  const isAutoSyncingRef = useRef(false);
  const lastSyncedHashRef = useRef<string>('');

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    spreadsheetRef.current = spreadsheet;
  }, [spreadsheet]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ModifyJobItem | null>(null);
  const [quickStatusJob, setQuickStatusJob] = useState<ModifyJobItem | null>(null);
  const [startWorkJob, setStartWorkJob] = useState<ModifyJobItem | null>(null);
  const [ticketJob, setTicketJob] = useState<ModifyJobItem | null>(null);
  const [printStatusReport, setPrintStatusReport] = useState<{ isOpen: boolean; status: string }>({
    isOpen: false,
    status: 'ALL',
  });
  const [isSheetSettingsOpen, setIsSheetSettingsOpen] = useState(false);
  const [isDeliveryAlertOpen, setIsDeliveryAlertOpen] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [isSearchTrackerOpen, setIsSearchTrackerOpen] = useState(false);
  const [isTechnicianQueueOpen, setIsTechnicianQueueOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [hasAutoOpenedAlert, setHasAutoOpenedAlert] = useState(false);

  // 1-Day Before Delivery Alert Jobs list
  const deliveryAlertJobs = React.useMemo(() => getOneDayDeliveryAlertJobs(jobs), [jobs]);

  // Auto popup on app load when 1-day delivery alert jobs exist
  useEffect(() => {
    if (deliveryAlertJobs.length > 0 && !hasAutoOpenedAlert) {
      setIsDeliveryAlertOpen(true);
      setHasAutoOpenedAlert(true);
    }
  }, [deliveryAlertJobs.length, hasAutoOpenedAlert]);

  // Confirmation Modal state (for workspace mutation safety)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemDetails?: { label: string; value: string | number }[];
    isDestructive?: boolean;
    confirmText?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Load or Sync Google Sheet
  const loadSheetData = useCallback(async () => {
    setIsLoading(true);
    try {
      let targetSheet = spreadsheet;

      if (user) {
        // Always resolve to the connected/primary sheet
        const found = await findExistingSpreadsheet();
        if (found) {
          targetSheet = found;
          setSpreadsheet(found);
        }
      }

      const sheetId = targetSheet?.id || DEFAULT_PRIMARY_SPREADSHEET_ID;
      const sheetName = targetSheet?.sheetName || 'modify';

      // Fetch records from Google Sheet
      const sheetJobs = user
        ? await fetchModifyJobsFromSheet(sheetId, sheetName)
        : await fetchModifyJobsFromPublicSheet(sheetId, sheetName);

      if (sheetJobs && sheetJobs.length > 0) {
        setJobs(sheetJobs);
        jobsRef.current = sheetJobs;
        lastSyncedHashRef.current = JSON.stringify(sheetJobs);
        const nowStr = new Date().toLocaleTimeString('th-TH');
        setLastAutoSyncTime(nowStr);
        if (user) {
          showToast(`ซิงค์ข้อมูลจาก Google Sheet "${targetSheet?.name || 'ตาราง modify'}" (${sheetJobs.length} รายการ) สำเร็จ!`, 'success');
        }
      } else {
        setJobs([]);
        jobsRef.current = [];
        lastSyncedHashRef.current = JSON.stringify([]);
      }
    } catch (err: any) {
      console.error('Error loading Google Sheet data:', err);
      if (user) {
        showToast(err.message || 'ไม่สามารถโหลดข้อมูลจาก Google Sheet ได้', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, spreadsheet]);

  useEffect(() => {
    loadSheetData();
  }, [user, token]);

  // 3. Auto-update to Google Sheet (ตาราง modify) every 3 seconds
  useEffect(() => {
    if (!isAutoSyncEnabled) return;

    const intervalId = setInterval(async () => {
      const currentUser = userRef.current;
      const currentJobs = jobsRef.current;
      const currentSpreadsheet = spreadsheetRef.current;

      // Only auto-sync if user is signed in and not currently syncing
      if (!currentUser || isAutoSyncingRef.current) {
        return;
      }

      let targetSheet = currentSpreadsheet;
      if (!targetSheet) {
        targetSheet = await findExistingSpreadsheet();
        if (targetSheet) {
          setSpreadsheet(targetSheet);
          spreadsheetRef.current = targetSheet;
        }
      }

      if (!targetSheet) return;

      const currentHash = JSON.stringify(currentJobs);

      // Trigger automatic update if local data differs from last synced hash
      if (lastSyncedHashRef.current !== '' && lastSyncedHashRef.current !== currentHash) {
        try {
          isAutoSyncingRef.current = true;
          setIsAutoSyncing(true);

          const sheetName = targetSheet.sheetName || 'modify';
          const updatedJobs = await syncAllJobsToSheet(targetSheet.id, currentJobs, sheetName);

          lastSyncedHashRef.current = JSON.stringify(updatedJobs);
          jobsRef.current = updatedJobs;
          setJobs(updatedJobs);

          const nowStr = new Date().toLocaleTimeString('th-TH');
          setLastAutoSyncTime(nowStr);
        } catch (err: any) {
          console.warn('Auto-sync to Google Sheet error (retrying in 3s):', err?.message || err);
        } finally {
          isAutoSyncingRef.current = false;
          setIsAutoSyncing(false);
        }
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isAutoSyncEnabled]);

  // Handle Google Sign-in
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showToast(`เข้าสู่ระบบในชื่อ ${result.user.displayName || result.user.email}`, 'success');
      } else {
        // User closed or dismissed the popup
        showToast('ยกเลิกการเข้าสู่ระบบ (หน้าต่างถูกปิด)', 'info');
      }
    } catch (err: any) {
      const isPopupBlocked = err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked');
      const isPopupClosed = err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('closed-by-user') || err?.code === 'auth/cancelled-popup-request';

      if (isPopupBlocked) {
        showToast('เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ (Popup Blocked) กรุณาอนุญาตป๊อปอัปสำหรับหน้านี้ หรือเปิดแอปในหน้าต่างใหม่', 'error');
      } else if (isPopupClosed) {
        showToast('ยกเลิกการเข้าสู่ระบบ (หน้าต่างป๊อปอัปถูกปิด)', 'info');
      } else {
        console.error('Login error:', err);
        showToast(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setSpreadsheet(null);
    setJobs([]);
    loadSheetData();
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // Save new or edited job from full modal form
  const handleSaveJob = async (jobData: ModifyJobItem) => {
    const isEdit = Boolean(jobData.rowNumber);

    // If logged in and connected to Google Sheet, prompt confirmation
    if (user && spreadsheet) {
      setConfirmModal({
        isOpen: true,
        title: isEdit ? 'ยืนยันการแก้ไขข้อมูลใน Google Sheets' : 'ยืนยันการบันทึกคำขอใหม่ลง Google Sheets',
        message: isEdit
          ? `ระบบกำลังจะอัปเดตข้อมูลแถวที่ ${jobData.rowNumber} ในชีต "${spreadsheet.name}"`
          : `ระบบกำลังจะเพิ่มแถวใหม่ในชีต "${spreadsheet.name}" ตาราง modify`,
        itemDetails: [
          { label: 'Job ID', value: jobData.id },
          { label: 'ลูกค้า (Customer)', value: jobData.customer },
          { label: 'ผู้ส่งคำขอ', value: jobData.requester },
          { label: 'Sale So No.', value: jobData.saleSoNo || '-' },
          { label: 'จำนวน', value: String(jobData.quantity) },
          { label: 'สถานะงาน (Finish)', value: jobData.finishStatus },
        ],
        confirmText: isEdit ? 'บันทึกการแก้ไข' : 'บันทึกลง Sheet',
        isDestructive: false,
        onConfirm: async () => {
          setIsLoading(true);
          try {
            if (isEdit && jobData.rowNumber) {
              await updateModifyJobInSheet(spreadsheet.id, jobData.rowNumber, jobData, spreadsheet.sheetName);
              setJobs((prev) =>
                prev.map((item) => (item.rowNumber === jobData.rowNumber ? jobData : item))
              );
              showToast(`อัปเดตรายการ ${jobData.id} ใน Google Sheets สำเร็จ!`, 'success');
            } else {
              const res = await appendModifyJobToSheet(spreadsheet.id, jobData, spreadsheet.sheetName);
              const newItem = { ...jobData, rowNumber: res.rowNumber };
              setJobs((prev) => [newItem, ...prev]);
              showToast(`บันทึกคำขอ ${jobData.id} ลง Google Sheets สำเร็จ!`, 'success');
            }
            setIsFormOpen(false);
            setEditingJob(null);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          } catch (err: any) {
            console.error('Save to sheet error:', err);
            showToast(err.message || 'บันทึกลง Google Sheet ไม่สำเร็จ', 'error');
          } finally {
            setIsLoading(false);
          }
        },
      });
    } else {
      // Local state fallback when not logged in
      if (isEdit) {
        setJobs((prev) => prev.map((item) => (item.id === jobData.id ? jobData : item)));
        showToast('อัปเดตรายการในเครื่องเรียบร้อย (เข้าสู่ระบบด้วย Google เพื่อซิงค์ลงชีต)', 'info');
      } else {
        setJobs((prev) => [jobData, ...prev]);
        showToast('บันทึกคำขอในเครื่องเรียบร้อย (เข้าสู่ระบบด้วย Google เพื่อซิงค์ลงชีต)', 'info');
      }
      setIsFormOpen(false);
      setEditingJob(null);
    }
  };

  // Direct status & quick update job (StatusUpdateModal / StartWorkModal)
  const handleDirectUpdateJob = async (jobData: ModifyJobItem) => {
    // 1. Update state immediately so UI updates instantly
    setJobs((prev) =>
      prev.map((item) => (item.id === jobData.id || (item.rowNumber && item.rowNumber === jobData.rowNumber) ? jobData : item))
    );

    // 2. Sync to Google Sheet if connected
    if (user && spreadsheet && jobData.rowNumber) {
      setIsLoading(true);
      try {
        await updateModifyJobInSheet(spreadsheet.id, jobData.rowNumber, jobData, spreadsheet.sheetName);
        showToast(`อัปเดตสถานะ ${jobData.id} (${jobData.finishStatus}) ลง Google Sheet เรียบร้อยแล้ว`, 'success');
      } catch (err: any) {
        console.error('Direct update error:', err);
        showToast(err.message || 'อัปเดตสถานะใน Google Sheet ไม่สำเร็จ', 'error');
      } finally {
        setIsLoading(false);
      }
    } else {
      showToast(`อัปเดตสถานะ ${jobData.id} (${jobData.finishStatus}) เรียบร้อยแล้ว`, 'success');
    }
  };

  // Quick finish status changer for Table / Cards directly
  const handleQuickChangeFinishStatus = async (
    job: ModifyJobItem,
    newStatus: 'PENDING' | 'IN_PROGRESS' | 'FINISH' | 'CANCELLED' | string
  ) => {
    let updatedJob: ModifyJobItem = {
      ...job,
      finishStatus: newStatus as 'PENDING' | 'IN_PROGRESS' | 'FINISH' | 'CANCELLED',
    };
    const today = getCurrentDateFormatted();

    if (newStatus === 'IN_PROGRESS') {
      if (!updatedJob.engineerHandoverDate) {
        updatedJob.engineerHandoverDate = today;
      }
    } else if (newStatus === 'FINISH') {
      if (!updatedJob.finishDate) {
        updatedJob.finishDate = today;
      }
      if (!updatedJob.inspectionResult) {
        updatedJob.inspectionResult = 'WAITING';
      }
    }

    await handleDirectUpdateJob(updatedJob);
  };

  // Delete Job
  const handleDeleteJob = (job: ModifyJobItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบคำขอ Modify',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายการ ${job.id} (${job.customer})? ข้อมูลแถวใน Google Sheet จะถูกลบออก`,
      itemDetails: [
        { label: 'Job ID', value: job.id },
        { label: 'ลูกค้า', value: job.customer },
        { label: 'SO No', value: job.saleSoNo || '-' },
        { label: 'แถวใน Google Sheet', value: job.rowNumber ? `แถวที่ ${job.rowNumber}` : 'Local' },
      ],
      isDestructive: true,
      confirmText: 'ลบข้อมูล',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          if (user && spreadsheet && job.rowNumber) {
            await deleteModifyJobFromSheet(spreadsheet.id, job.rowNumber, spreadsheet.sheetName);
            showToast(`ลบรายการ ${job.id} จาก Google Sheet สำเร็จ`, 'success');
            // Refresh to sync exact row numbers
            await loadSheetData();
          } else {
            setJobs((prev) => prev.filter((j) => j.id !== job.id));
            showToast(`ลบรายการ ${job.id} เรียบร้อย`, 'info');
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          console.error('Delete error:', err);
          showToast(err.message || 'ลบข้อมูลไม่สำเร็จ', 'error');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Batch rename technician in jobs
  const handleBatchRenameJobTechnician = async (oldName: string, newName: string) => {
    const updatedJobs = jobs.map((job) => {
      if ((job.technician || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
        return { ...job, technician: newName };
      }
      return job;
    });
    setJobs(updatedJobs);

    if (user && spreadsheet) {
      try {
        await syncAllJobsToSheet(spreadsheet.id, updatedJobs, spreadsheet.sheetName);
        showToast(`อัปเดตชื่อช่างจาก "${oldName}" เป็น "${newName}" ใน Google Sheet สำเร็จ`, 'success');
      } catch (err: any) {
        console.error('Failed to batch sync renamed technician:', err);
      }
    }
  };

  // Create new custom sheet
  const handleCreateNewSheet = async (title: string) => {
    setIsLoading(true);
    try {
      const newSheet = await createModifySpreadsheet(title);
      setSpreadsheet(newSheet);
      setJobs([]);
      setIsSheetSettingsOpen(false);
      showToast(`สร้าง Google Sheet "${title}" เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      showToast(err.message || 'สร้างชีตใหม่ไม่สำเร็จ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect existing sheet
  const handleConnectExistingSheet = async (sheetId: string) => {
    setIsLoading(true);
    try {
      await setupSheetHeaders(sheetId, 'modify');
      const meta = await getSpreadsheetMetadata(sheetId);
      const info: GoogleSpreadsheetInfo = meta || {
        id: sheetId,
        name: 'Google Sheet (Connected)',
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        sheetName: 'modify',
      };
      setSpreadsheet(info);
      saveSpreadsheetInfo(info);
      const sheetJobs = await fetchModifyJobsFromSheet(sheetId, info.sheetName);
      setJobs(sheetJobs);
      setIsSheetSettingsOpen(false);
      showToast(`เชื่อมต่อชีตสำเร็จ! พบ ${sheetJobs.length} รายการ`, 'success');
    } catch (err: any) {
      showToast(err.message || 'เชื่อมต่อชีตไม่สำเร็จ ตรวจสอบสิทธิ์การเข้าถึงไฟล์', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reformat headers
  const handleReformatHeaders = async () => {
    if (!spreadsheet) return;
    setIsLoading(true);
    try {
      await setupSheetHeaders(spreadsheet.id, spreadsheet.sheetName);
      showToast('จัดรูปแบบหัวตาราง 16 รายการใน Google Sheet เรียบร้อยแล้ว', 'success');
    } catch (err: any) {
      showToast(err.message || 'จัดรูปแบบไม่สำเร็จ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk sync/push all current jobs to Google Sheet
  const handleSyncAllToSheet = async () => {
    if (!user) {
      await handleLogin();
      return;
    }
    let targetSheet = spreadsheet;
    if (!targetSheet) {
      const found = await findExistingSpreadsheet();
      if (found) {
        targetSheet = found;
        setSpreadsheet(found);
      }
    }
    if (!targetSheet) {
      showToast('กรุณาเลือกหรือเชื่อมต่อ Google Sheet ก่อน', 'error');
      setIsSheetSettingsOpen(true);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการอัปเดตข้อมูลทั้งหมดลง Google Sheets',
      message: `คุณต้องการบันทึกและอัปเดตข้อมูลคำขอทั้ง ${jobs.length} รายการลงใน Google Sheet "${targetSheet.name}" หรือไม่?`,
      itemDetails: [
        { label: 'Google Sheet', value: targetSheet.name },
        { label: 'Sheet ID', value: targetSheet.id },
        { label: 'จำนวนรายการทั้งหมด', value: `${jobs.length} รายการ` },
        { label: 'Tab ในชีต', value: targetSheet.sheetName || 'modify' },
      ],
      confirmText: 'อัปเดตลง Google Sheets',
      isDestructive: false,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const updatedJobs = await syncAllJobsToSheet(targetSheet.id, jobs, targetSheet.sheetName);
          setJobs(updatedJobs);
          showToast(`อัปเดตข้อมูลทั้ง ${jobs.length} รายการลง Google Sheet "${targetSheet.name}" สำเร็จ!`, 'success');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setIsSheetSettingsOpen(false);
        } catch (err: any) {
          console.error('Error syncing all to sheet:', err);
          showToast(err.message || 'อัปเดตข้อมูลลง Google Sheet ไม่สำเร็จ', 'error');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Filter jobs based on top stats filter
  const filteredJobs = jobs.filter((job) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'PENDING') {
      return (
        (job.finishStatus === 'PENDING' || (!job.finishStatus && !job.engineerHandoverDate)) &&
        job.finishStatus !== 'FINISH' &&
        job.finishStatus !== 'IN_PROGRESS' &&
        job.finishStatus !== 'CANCELLED'
      );
    }
    if (selectedFilter === 'IN_PROGRESS') {
      return (
        (job.finishStatus === 'IN_PROGRESS' || (Boolean(job.engineerHandoverDate) && job.finishStatus !== 'PENDING')) &&
        job.finishStatus !== 'FINISH' &&
        job.finishStatus !== 'CANCELLED'
      );
    }
    if (selectedFilter === 'COMPLETE' || selectedFilter === 'PASS') {
      return job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS';
    }
    if (selectedFilter === 'EDIT' || selectedFilter === 'REJECT') {
      return job.inspectionResult === 'EDIT' || job.inspectionResult === 'REJECT';
    }
    if (selectedFilter === 'WAITING') {
      return job.inspectionResult === 'WAITING' || job.inspectionResult === 'PENDING' || !job.inspectionResult;
    }
    if (selectedFilter === 'FINISH') {
      return job.finishStatus === 'FINISH' && (job.inspectionResult === 'COMPLETE' || job.inspectionResult === 'PASS');
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#1e232a] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : notification.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        user={user}
        spreadsheet={spreadsheet}
        isLoading={isLoading}
        isAutoSyncing={isAutoSyncing}
        searchTerm={globalSearchTerm}
        onSearchTermChange={setGlobalSearchTerm}
        onRefresh={loadSheetData}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenSheetSettings={() => setIsSheetSettingsOpen(true)}
        onOpenSearchStatus={(term) => {
          if (typeof term === 'string') {
            setGlobalSearchTerm(term);
          }
          setIsSearchTrackerOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-7 py-5">
        {/* Google Sheet Sync Banner if not logged in */}
        {!user && (
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-800">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">เชื่อมต่อกับ Google Sheet "ตาราง modify"</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  เข้าสู่ระบบด้วย Google เพื่อให้ระบบสร้างและซิงค์ข้อมูลคำของาน Modify ทั้ง 16 ข้อมูลลง Google Sheets ของคุณแบบ Real-time
                </p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap self-stretch sm:self-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>เข้าสู่ระบบเพื่อเชื่อมต่อ Sheets</span>
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout: Content Area (Left) + Right Navigation Tabs (Right) */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Main Area: Stats + Active View */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Stats Overview Cards */}
            <StatsOverview
              jobs={jobs}
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
              onPrintStatusReport={(status) => setPrintStatusReport({ isOpen: true, status })}
              onOpenKpi={() => setViewMode('kpi')}
            />

            {/* Views: Table, Cards, Calendar, or KPI */}
            {viewMode === 'table' && (
              <ModifyJobTable
                jobs={filteredJobs}
                isLoading={isLoading}
                onEdit={(job) => {
                  setEditingJob(job);
                  setIsFormOpen(true);
                }}
                onQuickStatus={(job) => setQuickStatusJob(job)}
                onUpdateStatus={handleQuickChangeFinishStatus}
                onStartWork={(job) => setStartWorkJob(job)}
                onViewTicket={(job) => setTicketJob(job)}
                onPrintStatusReport={(status) => setPrintStatusReport({ isOpen: true, status: status || selectedFilter })}
                onDelete={handleDeleteJob}
                onAddNew={() => {
                  setEditingJob(null);
                  setIsFormOpen(true);
                }}
              />
            )}

            {viewMode === 'cards' && (
              <ModifyJobCardView
                jobs={filteredJobs}
                onEdit={(job) => {
                  setEditingJob(job);
                  setIsFormOpen(true);
                }}
                onQuickStatus={(job) => setQuickStatusJob(job)}
                onUpdateStatus={handleQuickChangeFinishStatus}
                onStartWork={(job) => setStartWorkJob(job)}
                onViewTicket={(job) => setTicketJob(job)}
                onDelete={handleDeleteJob}
                onAddNew={() => {
                  setEditingJob(null);
                  setIsFormOpen(true);
                }}
              />
            )}

            {viewMode === 'calendar' && (
              <ModifyJobCalendarView
                jobs={jobs}
                currentUserEmail={user?.email || 'tawatchai.works@gmail.com'}
                currentUserName={user?.displayName || 'Tawatchai'}
                onEdit={(job) => {
                  setEditingJob(job);
                  setIsFormOpen(true);
                }}
                onQuickStatus={(job) => setQuickStatusJob(job)}
                onStartWork={(job) => setStartWorkJob(job)}
                onViewTicket={(job) => setTicketJob(job)}
                onPrintStatusReport={(status) => setPrintStatusReport({ isOpen: true, status: status || selectedFilter })}
                onDelete={handleDeleteJob}
                onAddNew={() => {
                  setEditingJob(null);
                  setIsFormOpen(true);
                }}
              />
            )}

            {viewMode === 'kpi' && (
              <TechnicianKpiDashboard
                jobs={jobs}
                onSelectJob={(job) => {
                  setTicketJob(job);
                }}
                onEditJob={(job) => {
                  setEditingJob(job);
                  setIsFormOpen(true);
                }}
              />
            )}
          </div>

          {/* Right-Side Stacked Tabs & Actions Panel */}
          <RightSidebarNav
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenNewForm={() => {
              setEditingJob(null);
              setIsFormOpen(true);
            }}
            onOpenSearch={() => setIsSearchTrackerOpen(true)}
            onOpenTechnicianQueue={() => setIsTechnicianQueueOpen(true)}
            onOpenEstimator={() => setIsEstimatorOpen(true)}
            onOpenPrintReport={() => setPrintStatusReport({ isOpen: true, status: selectedFilter })}
            deliveryAlertCount={deliveryAlertJobs.length}
            onOpenDeliveryAlert={() => setIsDeliveryAlertOpen(true)}
            totalJobsCount={jobs.length}
          />
        </div>
      </main>

      {/* Modify Job Form Modal */}
      <ModifyRequestForm
        isOpen={isFormOpen}
        initialData={editingJob}
        existingCount={jobs.length}
        existingJobs={jobs}
        currentUserEmail={user?.email || 'tawatchai.works@gmail.com'}
        isLoading={isLoading}
        onSave={handleSaveJob}
        onClose={() => {
          setIsFormOpen(false);
          setEditingJob(null);
        }}
      />

      {/* Quick Status Update Modal */}
      <StatusUpdateModal
        isOpen={Boolean(quickStatusJob)}
        job={quickStatusJob}
        isLoading={isLoading}
        onSave={async (updatedJob) => {
          await handleDirectUpdateJob(updatedJob);
          setQuickStatusJob(null);
        }}
        onClose={() => setQuickStatusJob(null)}
      />

      {/* Start Work / Handover Modal */}
      <StartWorkModal
        isOpen={Boolean(startWorkJob)}
        job={startWorkJob}
        isLoading={isLoading}
        onConfirmStart={async (updatedJob) => {
          await handleDirectUpdateJob(updatedJob);
          setStartWorkJob(null);
        }}
        onClose={() => setStartWorkJob(null)}
      />

      {/* Printable Job Ticket Modal */}
      <PrintJobTicket
        isOpen={Boolean(ticketJob)}
        job={ticketJob}
        onClose={() => setTicketJob(null)}
      />

      {/* Printable Status Report A4 Modal */}
      <PrintStatusReportModal
        isOpen={printStatusReport.isOpen}
        initialStatus={printStatusReport.status}
        jobs={jobs}
        currentUserEmail={user?.email || 'tawatchai.works@gmail.com'}
        onClose={() => setPrintStatusReport({ isOpen: false, status: 'ALL' })}
      />

      {/* Sheet Settings Modal */}
      <SheetSettingsModal
        isOpen={isSheetSettingsOpen}
        spreadsheet={spreadsheet}
        isLoading={isLoading}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onReformatHeaders={handleReformatHeaders}
        onSyncAllToSheet={handleSyncAllToSheet}
        onClose={() => setIsSheetSettingsOpen(false)}
      />

      {/* 1-Day Before Delivery Alert Popup Modal */}
      <DeliveryAlertModal
        isOpen={isDeliveryAlertOpen}
        alertJobs={deliveryAlertJobs}
        onClose={() => setIsDeliveryAlertOpen(false)}
        onSelectJob={(job) => setQuickStatusJob(job)}
      />

      {/* Date Estimator Modal (Header Trigger) */}
      <ModifyDateEstimatorModal
        isOpen={isEstimatorOpen}
        onClose={() => setIsEstimatorOpen(false)}
        onApply={(calculated) => {
          setIsEstimatorOpen(false);
          setEditingJob(null);
          setIsFormOpen(true);
        }}
      />

      {/* Full-Screen Search & Job Status Tracker */}
      <SearchStatusPopup
        searchTerm={globalSearchTerm}
        onSearchChange={setGlobalSearchTerm}
        matchedJobs={jobs}
        allJobs={jobs}
        isOpen={isSearchTrackerOpen}
        onClose={() => setIsSearchTrackerOpen(false)}
        onSelectJob={(job) => {
          setIsSearchTrackerOpen(false);
        }}
        onQuickStatus={(job) => setQuickStatusJob(job)}
        onViewTicket={(job) => setTicketJob(job)}
        onEditJob={(job) => {
          setEditingJob(job);
          setIsFormOpen(true);
        }}
        onAddNew={() => {
          setEditingJob(null);
          setIsFormOpen(true);
        }}
      />

      {/* Technician Queue & Status Tracker Modal */}
      <TechnicianQueueModal
        isOpen={isTechnicianQueueOpen}
        jobs={jobs}
        onClose={() => setIsTechnicianQueueOpen(false)}
        onSelectJob={(job) => {
          setTicketJob(job);
        }}
        onQuickStatus={(job) => setQuickStatusJob(job)}
        onStartWork={(job) => setStartWorkJob(job)}
        onViewTicket={(job) => setTicketJob(job)}
        onEditJob={(job) => {
          setEditingJob(job);
          setIsFormOpen(true);
        }}
        onAddNewJob={() => {
          setEditingJob(null);
          setIsFormOpen(true);
        }}
        onBatchRenameJobTechnician={handleBatchRenameJobTechnician}
      />

      {/* Workspace Safety Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        itemDetails={confirmModal.itemDetails}
        confirmText={confirmModal.confirmText}
        isDestructive={confirmModal.isDestructive}
        isLoading={isLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
