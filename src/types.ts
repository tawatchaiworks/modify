export type InspectionResult = 'WAITING' | 'COMPLETE' | 'EDIT' | 'PASS' | 'REJECT' | 'PENDING' | '';

export type JobUrgencyLevel = 'NORMAL' | 'URGENT' | 'VERY_URGENT';

export type WorkTypeOption = 'GENERAL' | 'PAINTING' | 'REPAIR' | 'ASSEMBLY' | string;

export interface ModifyJobItem {
  rowNumber?: number; // 1-indexed row number in Google Sheet (row 2, 3...)
  id: string; // generated unique code e.g. ECR-2026-0001
  requestDate: string; // วันที่ Request (e.g. 2026-08-24 or 24/08/2026)
  requestMonth: string; // เดือนที่ Request (e.g. สิงหาคม 2026)
  requestTime: string; // เวลาที่ Request (e.g. 14:30)
  requester: string; // ผู้ส่งคำขอ
  sale: string; // Sale
  saleSoNo: string; // Sale So No.
  customer: string; // Cutomer
  project: string; // Project
  shipmentDate: string; // Shipment Date
  workDetails: string[]; // รายละเอียดงาน 10 บรรทัด (array of 10 strings)
  workDetailQuantities?: (number | string)[]; // จำนวนชิ้นของแต่ละรายการ 10 บรรทัด (array of 10 quantities)
  workDetailsRaw?: string; // consolidated raw string with line breaks
  modifyDetails: string; // รายละเอียดที่ให้ Modify
  urgencyLevel?: JobUrgencyLevel | string; // สถานะความเร่งด่วน: NORMAL (งานปกติ) | URGENT (งานด่วน) | VERY_URGENT (งานด่วนมาก)
  workType?: string; // ประเภทงาน (เช่น GENERAL, PAINTING หรือรวมหลายประเภท)
  workTypes?: string[]; // รายการประเภทงานที่เลือก (เลือกได้ 1 หรือ 2 ประเภท เช่น ['GENERAL', 'PAINTING'])
  quantity: number | string; // จำนวน
  technician?: string; // ช่างผู้ทำ / ช่างผู้รับผิดชอบ
  createdBy?: string; // ชื่อ/อีเมล login เข้าใช้งาน Google (e.g. tawatchai.works@gmail.com)
  engineerHandoverDate: string; // ส่งมอบชิ้นงานให้ engineer วันที่
  estimatedReturnDate: string; // ประมาณการส่งมอบคืนวันที่
  inspectionDate: string; // ตรวจสอบวันที่
  inspectionResult: InspectionResult; // WAITING | COMPLETE | EDIT (or PASS / REJECT)
  finishStatus: 'FINISH' | 'IN_PROGRESS' | 'PENDING' | 'CANCELLED'; // FINNISH
  finishDate?: string; // วันที่เสร็จสิ้น
  remarks?: string; // หมายเหตุเพิ่มเติม
  createdAt?: string;
  updatedAt?: string;
}

export interface GoogleSpreadsheetInfo {
  id: string;
  name: string;
  url: string;
  sheetName: string;
}

export type ViewMode = 'table' | 'cards' | 'calendar' | 'kpi' | 'form' | 'stats';

export type CalendarViewType = 'day' | 'week' | 'month';

export type CalendarMilestoneType =
  | 'all'
  | 'request'
  | 'handover'
  | 'estimatedReturn'
  | 'inspection'
  | 'shipment';

export interface CalendarEventItem {
  id: string; // unique event key
  jobId: string;
  job: ModifyJobItem;
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  type: 'request' | 'handover' | 'estimatedReturn' | 'inspection' | 'shipment';
  typeLabel: string;
  customer: string;
  saleSoNo?: string;
  status: 'FINISH' | 'IN_PROGRESS' | 'PENDING' | 'CANCELLED';
  qcResult?: InspectionResult | string;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    badge: string;
    dot: string;
  };
}
