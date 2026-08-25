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
import { formatDateDisplay, getOneDayDeliveryAlertJobs } from './utils/formatters';

// Sample initial mock data for preview if not signed in yet
const INITIAL_DEMO_JOBS: ModifyJobItem[] = [
  {
    rowNumber: 2,
    id: 'ECR-202608-0001',
    requestDate: '2026-08-24',
    requestMonth: 'สิงหาคม 2026',
    requestTime: '09:30',
    requester: 'วิชัย การช่าง',
    sale: 'สมชาย มั่นคง',
    saleSoNo: 'SO-2026-0412',
    customer: 'บริษัท ไทยยนตรกิจ ซัพพลาย จำกัด',
    project: 'Robot Welding Jig Fixture',
    shipmentDate: '2026-08-30',
    workDetails: [
      'ตรวจสอบขนาดพิกัด Jig Base กับ Drawing ล่าสุด Rev.C',
      'กัดขยายร่องสล็อตด้านข้างเพิ่ม 3.0 mm',
      'เจาะรูต๊าปเกลียว M8 จำนวน 4 ตำแหน่ง',
      'เจียร์ปาดผิวหน้า Clamp Plate ให้เรียบ Flatness 0.02',
      'ชุบผิว Hard Chrome เคลือบกันสนิม',
      'ประกอบชุด Guide Pin ขนาด DIA 12 mm',
      'ทดสอบการยึดชิ้นงานตัวอย่าง',
      'วัดค่าพิกัดด้วย CMM Machine',
      'ทำความสะอาดและลบครีบคมทั้งหมด',
      'แพ็กกิ้งพร้อมส่งมอบงาน',
    ],
    workDetailQuantities: ['2 ชุด', '2 ชุด', '8 รู', '2 ชิ้น', '2 ชุด', '4 ชิ้น', '2 ชุด', '2 ชุด', '2 ชุด', '2 ชุด'],
    modifyDetails: 'ดัดแปลงร่อง Clamp และปรับระยะสล็อตด้านข้าง 3 mm ตามสเปกใหม่ของลูกค้า ป้องกันชิ้นงานเอียงขณะเชื่อม',
    quantity: '2 ชุด',
    technician: 'ช่างสมพงษ์ (CNC)',
    createdBy: 'tawatchai.works@gmail.com',
    engineerHandoverDate: '2026-08-24',
    estimatedReturnDate: '2026-08-27',
    inspectionDate: '2026-08-27',
    inspectionResult: 'PASS',
    finishStatus: 'FINISH',
    remarks: 'ทดสอบการจับยึดแล้ว แน่นหนา ไม่ติดขัด',
  },
  {
    rowNumber: 3,
    id: 'ECR-202608-0002',
    requestDate: '2026-08-24',
    requestMonth: 'สิงหาคม 2026',
    requestTime: '13:45',
    requester: 'มนัส สายผลิต',
    sale: 'กนกวรรณ เพชรดี',
    saleSoNo: 'SO-2026-0488',
    customer: 'บริษัท เจแปนพรีซิชั่น เอ็นจิเนียริ่ง จำกัด',
    project: 'Conveyor Guide Rail Modification',
    shipmentDate: '2026-09-02',
    workDetails: [
      'ตัดต่อเพิ่มความยาวราง Guide Rail 150 mm',
      'เชื่อม TIG สแตนเลส 304 ขัดเงาเบอร์ 400',
      'ปรับระดับ Roller Bracket',
      'ใส่แหวนรองเสริมความสูง 5 mm',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    workDetailQuantities: ['6 ชิ้น', '6 ชิ้น', '12 จุด', '24 ตัว', '', '', '', '', '', ''],
    modifyDetails: 'เพิ่มระยะความยาวรางและเปลี่ยนมุมองศาทางเลี้ยว 15 องศา',
    quantity: '6 ชิ้น',
    technician: 'ช่างธนาวุฒิ (Weld/Sheet)',
    createdBy: 'tawatchai.works@gmail.com',
    engineerHandoverDate: '2026-08-24',
    estimatedReturnDate: '2026-08-29',
    inspectionDate: '',
    inspectionResult: 'WAITING',
    finishStatus: 'IN_PROGRESS',
    remarks: 'รอนำเข้ากระบวนการเชื่อม TIG',
  },
  {
    rowNumber: 4,
    id: 'ECR-202608-0003',
    requestDate: '2026-08-23',
    requestMonth: 'สิงหาคม 2026',
    requestTime: '10:15',
    requester: 'ประสิทธิ์ วิศวกรโรงงาน',
    sale: 'ธนากร มั่งมี',
    saleSoNo: 'SO-2026-0520',
    customer: 'บริษัท สยามออโต้พาร์ท แมนูแฟคเจอริ่ง จำกัด',
    project: 'Inspection Jig Alignment Pin Set',
    shipmentDate: '2026-08-25',
    workDetails: [
      'กลึงลดขนาดหัว Pin DIA 10 mm ลง 0.05 mm',
      'ชุบแข็ง Induction Hardening ผิวหน้า',
      'ขัดผิวละเอียด Ra 0.4',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    workDetailQuantities: ['10 ตัว', '10 ตัว', '10 ตัว', '', '', '', '', '', '', ''],
    modifyDetails: 'ปรับลดขนาด Pin และเจียรผิวเรียบตามเกณฑ์ QC ล่าสุด',
    quantity: '10 ตัว',
    technician: 'ช่างเอกชัย (Machining)',
    createdBy: 'tawatchai.works@gmail.com',
    engineerHandoverDate: '2026-08-23',
    estimatedReturnDate: '2026-08-25',
    inspectionDate: '',
    inspectionResult: 'WAITING',
    finishStatus: 'IN_PROGRESS',
    remarks: 'นัดส่งมอบวันพรุ่งนี้ เร่งส่งตรวจ QC ด่วน',
  },
];

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
  const [jobs, setJobs] = useState<ModifyJobItem[]>(INITIAL_DEMO_JOBS);
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

  // 2. Load or Sync Google Sheet when logged in
  const loadSheetData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let targetSheet = spreadsheet;

      // Always resolve to the connected/primary sheet
      const found = await findExistingSpreadsheet();
      if (found) {
        targetSheet = found;
        setSpreadsheet(found);
      }

      if (targetSheet) {
        // Fetch records from Google Sheet
        const sheetJobs = await fetchModifyJobsFromSheet(targetSheet.id, targetSheet.sheetName);
        if (sheetJobs.length > 0) {
          setJobs(sheetJobs);
          jobsRef.current = sheetJobs;
          lastSyncedHashRef.current = JSON.stringify(sheetJobs);
          const nowStr = new Date().toLocaleTimeString('th-TH');
          setLastAutoSyncTime(nowStr);
          showToast(`ซิงค์ข้อมูลจาก Google Sheet "${targetSheet.name}" (${sheetJobs.length} รายการ) สำเร็จ!`, 'success');
        } else {
          setJobs([]);
          jobsRef.current = [];
          lastSyncedHashRef.current = JSON.stringify([]);
          showToast(`เชื่อมต่อกับ Google Sheet "${targetSheet.name}" เรียบร้อย (ไม่มีแถวข้อมูล)`, 'info');
        }
      }
    } catch (err: any) {
      console.error('Error loading Google Sheet data:', err);
      showToast(err.message || 'ไม่สามารถโหลดข้อมูลจาก Google Sheet ได้', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, spreadsheet]);

  useEffect(() => {
    if (user && token) {
      loadSheetData();
    }
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
    setJobs(INITIAL_DEMO_JOBS);
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
    if (selectedFilter === 'IN_PROGRESS') {
      return (
        job.finishStatus === 'IN_PROGRESS' ||
        (Boolean(job.engineerHandoverDate) && job.finishStatus !== 'FINISH' && job.finishStatus !== 'CANCELLED')
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
    if (selectedFilter === 'FINISH') return job.finishStatus === 'FINISH';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
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
        viewMode={viewMode}
        isLoading={isLoading}
        isAutoSyncEnabled={isAutoSyncEnabled}
        isAutoSyncing={isAutoSyncing}
        deliveryAlertCount={deliveryAlertJobs.length}
        onOpenDeliveryAlert={() => setIsDeliveryAlertOpen(true)}
        onToggleAutoSync={() => {
          setIsAutoSyncEnabled(!isAutoSyncEnabled);
          showToast(
            !isAutoSyncEnabled
              ? 'เปิดการ Auto Sync ข้อมูลลง Google Sheet ทุก 3 วินาที'
              : 'หยุดการ Auto Sync ชั่วคราว',
            'info'
          );
        }}
        onViewModeChange={setViewMode}
        onOpenNewForm={() => {
          setEditingJob(null);
          setIsFormOpen(true);
        }}
        onOpenEstimator={() => setIsEstimatorOpen(true)}
        onOpenPrintReport={() => setPrintStatusReport({ isOpen: true, status: selectedFilter })}
        onRefresh={loadSheetData}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenSheetSettings={() => setIsSheetSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap self-stretch sm:self-auto flex items-center justify-center gap-2"
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

        {/* Stats Overview Cards */}
        <StatsOverview
          jobs={jobs}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          onPrintStatusReport={(status) => setPrintStatusReport({ isOpen: true, status })}
          onOpenKpi={() => setViewMode('kpi')}
        />

        {/* Views: Table, Cards, or Calendar */}
        {viewMode === 'table' && (
          <ModifyJobTable
            jobs={filteredJobs}
            isLoading={isLoading}
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

        {viewMode === 'cards' && (
          <ModifyJobCardView
            jobs={filteredJobs}
            onEdit={(job) => {
              setEditingJob(job);
              setIsFormOpen(true);
            }}
            onQuickStatus={(job) => setQuickStatusJob(job)}
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
