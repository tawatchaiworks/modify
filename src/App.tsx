import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { ModifyJobItem, GoogleSpreadsheetInfo, ViewMode } from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/firebase';
import {
  findExistingSpreadsheet,
  createModifySpreadsheet,
  fetchModifyJobsFromSheet,
  appendModifyJobToSheet,
  updateModifyJobInSheet,
  deleteModifyJobFromSheet,
  setupSheetHeaders,
} from './services/googleSheets';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { ModifyJobTable } from './components/ModifyJobTable';
import { ModifyJobCardView } from './components/ModifyJobCardView';
import { ModifyJobCalendarView } from './components/ModifyJobCalendarView';
import { ModifyRequestForm } from './components/ModifyRequestForm';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { StartWorkModal } from './components/StartWorkModal';
import { PrintJobTicket } from './components/PrintJobTicket';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { formatDateDisplay } from './utils/formatters';

// Sample initial mock data for preview if not signed in yet
const INITIAL_DEMO_JOBS: ModifyJobItem[] = [
  {
    rowNumber: 2,
    id: 'MOD-202608-0001',
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
    id: 'MOD-202608-0002',
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
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<GoogleSpreadsheetInfo | null>(null);
  const [jobs, setJobs] = useState<ModifyJobItem[]>(INITIAL_DEMO_JOBS);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ModifyJobItem | null>(null);
  const [quickStatusJob, setQuickStatusJob] = useState<ModifyJobItem | null>(null);
  const [startWorkJob, setStartWorkJob] = useState<ModifyJobItem | null>(null);
  const [ticketJob, setTicketJob] = useState<ModifyJobItem | null>(null);
  const [isSheetSettingsOpen, setIsSheetSettingsOpen] = useState(false);

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
    return () => unsubscribe();
  }, []);

  // 2. Load or Sync Google Sheet when logged in
  const loadSheetData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let currentSheet = spreadsheet;

      // Find or create spreadsheet if not loaded yet
      if (!currentSheet) {
        let found = await findExistingSpreadsheet();
        if (!found) {
          found = await createModifySpreadsheet('ตาราง modify');
          showToast('สร้าง Google Sheet "ตาราง modify" ในไดรฟ์ของคุณเรียบร้อยแล้ว', 'success');
        }
        currentSheet = found;
        setSpreadsheet(found);
      }

      // Fetch records from Google Sheet
      const sheetJobs = await fetchModifyJobsFromSheet(currentSheet.id, currentSheet.sheetName);
      if (sheetJobs.length > 0) {
        setJobs(sheetJobs);
      } else {
        // If sheet is fresh and empty, we can seed or keep clean
        setJobs([]);
      }
      showToast(`โหลดข้อมูลจาก Google Sheet สำเร็จ (${sheetJobs.length} รายการ)`, 'success');
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

  // Handle Google Sign-in
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showToast(`เข้าสู่ระบบในชื่อ ${result.user.displayName || result.user.email}`, 'success');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast(err.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
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

  // Save new or edited job
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
      const info: GoogleSpreadsheetInfo = {
        id: sheetId,
        name: 'Google Sheet (Connected)',
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        sheetName: 'modify',
      };
      setSpreadsheet(info);
      const sheetJobs = await fetchModifyJobsFromSheet(sheetId, 'modify');
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
        onViewModeChange={setViewMode}
        onOpenNewForm={() => {
          setEditingJob(null);
          setIsFormOpen(true);
        }}
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
        />

        {/* Active Filter Report Banner */}
        {selectedFilter !== 'ALL' && (
          <div className="mb-4 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl border flex items-center justify-center ${
                  selectedFilter === 'COMPLETE' || selectedFilter === 'PASS'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : selectedFilter === 'EDIT' || selectedFilter === 'REJECT'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : selectedFilter === 'FINISH'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : selectedFilter === 'IN_PROGRESS'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {(selectedFilter === 'COMPLETE' || selectedFilter === 'PASS') && <CheckCircle2 className="w-4 h-4" />}
                {(selectedFilter === 'EDIT' || selectedFilter === 'REJECT') && <XCircle className="w-4 h-4" />}
                {selectedFilter === 'FINISH' && <Sparkles className="w-4 h-4" />}
                {selectedFilter === 'IN_PROGRESS' && <Wrench className="w-4 h-4" />}
                {selectedFilter === 'WAITING' && <Clock className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">กำลังแสดงรายงาน:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {selectedFilter === 'COMPLETE' || selectedFilter === 'PASS'
                      ? 'เฉพาะงานที่ตรวจผ่านแล้ว (COMPLETE)'
                      : selectedFilter === 'EDIT' || selectedFilter === 'REJECT'
                      ? 'เฉพาะงานที่ส่งกลับไปแก้ไข (EDIT)'
                      : selectedFilter === 'FINISH'
                      ? 'เฉพาะงานที่เสร็จสมบูรณ์แล้ว (FINISH)'
                      : selectedFilter === 'IN_PROGRESS'
                      ? 'เฉพาะงานที่กำลังดำเนินการ / กับ Engineer'
                      : 'เฉพาะงานที่รอตรวจสอบ (WAITING)'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {filteredJobs.length} รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedFilter === 'COMPLETE' || selectedFilter === 'PASS'
                    ? 'คัดกรองเฉพาะงานที่ผ่านการตรวจสอบคุณภาพ (QC Complete)'
                    : selectedFilter === 'EDIT' || selectedFilter === 'REJECT'
                    ? 'คัดกรองเฉพาะงานที่ต้องนำกลับไปแก้ไขหรือปรับปรุงเพิ่มเติม'
                    : selectedFilter === 'FINISH'
                    ? 'คัดกรองเฉพาะงานที่มีสถานะงานเสร็จสมบูรณ์ 100%'
                    : selectedFilter === 'IN_PROGRESS'
                    ? 'คัดกรองเฉพาะงานที่อยู่ระหว่างการดำเนินงานของช่าง/วิศวกร'
                    : 'คัดกรองเฉพาะงานที่รอการตรวจเช็ค'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>แสดงงานทั้งหมด (ล้างตัวกรอง)</span>
            </button>
          </div>
        )}

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
            onDelete={handleDeleteJob}
            onAddNew={() => {
              setEditingJob(null);
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
          await handleSaveJob(updatedJob);
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
          await handleSaveJob(updatedJob);
          setStartWorkJob(null);
          showToast(`เริ่มปฏิบัติงาน Job ${updatedJob.id} เรียบร้อยแล้ว (เริ่มวันที่ ${formatDateDisplay(updatedJob.engineerHandoverDate)})`, 'success');
        }}
        onClose={() => setStartWorkJob(null)}
      />

      {/* Printable Job Ticket Modal */}
      <PrintJobTicket
        isOpen={Boolean(ticketJob)}
        job={ticketJob}
        onClose={() => setTicketJob(null)}
      />

      {/* Sheet Settings Modal */}
      <SheetSettingsModal
        isOpen={isSheetSettingsOpen}
        spreadsheet={spreadsheet}
        isLoading={isLoading}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onReformatHeaders={handleReformatHeaders}
        onClose={() => setIsSheetSettingsOpen(false)}
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
