import { ModifyJobItem, GoogleSpreadsheetInfo } from '../types';
import { getAccessToken } from './firebase';

export const SHEET_HEADERS = [
  'Job ID',
  'วันที่ Request',
  'เดือนที่ Request',
  'เวลาที่ Request',
  'ผู้ส่งคำขอ',
  'Sale',
  'Sale So No.',
  'Cutomer',
  'Project',
  'Shipment Date',
  'รายละเอียดงาน 10 บรรทัด',
  'รายละเอียดที่ให้ Modify',
  'จำนวน',
  'ระดับความเร่งด่วน',
  'ช่างผู้ทำ',
  'วันที่ช่างรับสินค้า',
  'ประมาณการส่งมอบคืนวันที่',
  'ตรวจสอบวันที่',
  'ผลการตรวจสอบ (PASS OR REJECT)',
  'FINISH',
  'หมายเหตุ / Remarks',
  'Timestamp',
];

export const DEFAULT_PRIMARY_SPREADSHEET_ID = '1o6f9o5CfdnGoYi9dzv_G8rJi45bC-cKosq5jtyz8KA0';
const DEFAULT_SHEET_NAME = 'modify';
const DEFAULT_SPREADSHEET_TITLE = 'ตาราง modify';

export const STORAGE_KEY_SPREADSHEET_ID = 'modify_system_connected_sheet_id';
export const STORAGE_KEY_SPREADSHEET_TITLE = 'modify_system_connected_sheet_title';

export const getSavedSpreadsheetInfo = (): { id: string; name?: string } | null => {
  try {
    const id = localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID) || DEFAULT_PRIMARY_SPREADSHEET_ID;
    const name = localStorage.getItem(STORAGE_KEY_SPREADSHEET_TITLE) || DEFAULT_SPREADSHEET_TITLE;
    if (id) return { id, name };
  } catch (e) {
    console.warn('Cannot read localStorage', e);
  }
  return { id: DEFAULT_PRIMARY_SPREADSHEET_ID, name: DEFAULT_SPREADSHEET_TITLE };
};

export const saveSpreadsheetInfo = (info: GoogleSpreadsheetInfo | null) => {
  try {
    if (info?.id) {
      localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, info.id);
      localStorage.setItem(STORAGE_KEY_SPREADSHEET_TITLE, info.name || DEFAULT_SPREADSHEET_TITLE);
    }
  } catch (e) {
    console.warn('Cannot write localStorage', e);
  }
};

/**
 * Searches user's Google Drive or saved ID for a spreadsheet named "ตาราง modify" or "modify"
 * Prioritizes the main shared spreadsheet 1o6f9o5CfdnGoYi9dzv_G8rJi45bC-cKosq5jtyz8KA0
 */
export const findExistingSpreadsheet = async (): Promise<GoogleSpreadsheetInfo | null> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  // 1. Check URL parameters for explicit sheet ID
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSheetId = urlParams.get('sheetId') || urlParams.get('sheet');
    if (urlSheetId) {
      const sheetMeta = await getSpreadsheetMetadata(urlSheetId);
      if (sheetMeta) {
        saveSpreadsheetInfo(sheetMeta);
        return sheetMeta;
      }
    }
  } catch (e) {
    console.warn('Could not parse URL params', e);
  }

  // 2. Try primary default spreadsheet (1o6f9o5CfdnGoYi9dzv_G8rJi45bC-cKosq5jtyz8KA0)
  try {
    const primaryMeta = await getSpreadsheetMetadata(DEFAULT_PRIMARY_SPREADSHEET_ID);
    if (primaryMeta) {
      saveSpreadsheetInfo(primaryMeta);
      return primaryMeta;
    }
  } catch (e) {
    console.warn('Primary default spreadsheet not directly accessible, trying saved/drive search', e);
  }

  // 3. Check saved ID in local storage
  const saved = getSavedSpreadsheetInfo();
  if (saved?.id && saved.id !== DEFAULT_PRIMARY_SPREADSHEET_ID) {
    try {
      const sheetMeta = await getSpreadsheetMetadata(saved.id);
      if (sheetMeta) {
        return sheetMeta;
      }
    } catch (e) {
      console.warn('Saved sheet ID not accessible, falling back to Drive search', e);
    }
  }

  // 4. Search Google Drive (including files shared with user)
  try {
    const query = encodeURIComponent(
      "mimeType='application/vnd.google-apps.spreadsheet' and (name='ตาราง modify' or name='modify' or name contains 'Modify') and trashed=false"
    );
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&orderBy=modifiedTime desc&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        const sheetInfo: GoogleSpreadsheetInfo = {
          id: file.id,
          name: file.name,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          sheetName: DEFAULT_SHEET_NAME,
        };
        saveSpreadsheetInfo(sheetInfo);
        return sheetInfo;
      }
    }
  } catch (e) {
    console.warn('Drive search failed', e);
  }

  // Fallback: return default info
  return {
    id: DEFAULT_PRIMARY_SPREADSHEET_ID,
    name: DEFAULT_SPREADSHEET_TITLE,
    url: `https://docs.google.com/spreadsheets/d/${DEFAULT_PRIMARY_SPREADSHEET_ID}/edit`,
    sheetName: DEFAULT_SHEET_NAME,
  };
};

/**
 * Get spreadsheet details by ID
 */
export const getSpreadsheetMetadata = async (spreadsheetId: string): Promise<GoogleSpreadsheetInfo | null> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available');

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const title = data.properties?.title || 'ตาราง modify';
  const availableSheets: { properties: { title: string } }[] = data.sheets || [];
  
  // Look for tab named modify, ตาราง modify, or first sheet
  const foundSheet = availableSheets.find(
    (s) => s.properties?.title?.toLowerCase() === 'modify' || s.properties?.title?.includes('modify') || s.properties?.title?.includes('ตาราง')
  ) || availableSheets[0];

  const firstSheet = foundSheet?.properties?.title || DEFAULT_SHEET_NAME;

  return {
    id: spreadsheetId,
    name: title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetName: firstSheet,
  };
};

/**
 * Creates a brand new Google Spreadsheet named "ตาราง modify" with formatted headers
 */
export const createModifySpreadsheet = async (customTitle?: string): Promise<GoogleSpreadsheetInfo> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  const title = customTitle || DEFAULT_SPREADSHEET_TITLE;

  const createBody = {
    properties: {
      title: title,
    },
    sheets: [
      {
        properties: {
          title: DEFAULT_SHEET_NAME,
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 1000,
            columnCount: 22,
          },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createBody),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create Google Spreadsheet');
  }

  const spreadsheet = await response.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  // Insert Header Row & Style it
  await setupSheetHeaders(spreadsheetId, DEFAULT_SHEET_NAME);

  return {
    id: spreadsheetId,
    name: title,
    url: spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetName: DEFAULT_SHEET_NAME,
  };
};

/**
 * Initializes header values and styling in the sheet
 */
export const setupSheetHeaders = async (spreadsheetId: string, sheetTitle = DEFAULT_SHEET_NAME): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available');

  // 1. Write Header Values
  const range = `${sheetTitle}!A1:V1`;
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: [SHEET_HEADERS],
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    console.warn('Could not set headers directly:', err);
  }

  // 2. Fetch sheetId for styling
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const targetSheet = meta.sheets?.find(
        (s: { properties: { title: string } }) => s.properties.title === sheetTitle
      ) || meta.sheets?.[0];

      if (targetSheet) {
        const sheetNumericId = targetSheet.properties.sheetId;

        // Apply background color #1E3A8A (Navy), white bold text, freeze row 1
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetNumericId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: SHEET_HEADERS.length,
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.12, green: 0.23, blue: 0.54 }, // Dark Navy
                      textFormat: {
                        foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                        bold: true,
                        fontSize: 10,
                      },
                      horizontalAlignment: 'CENTER',
                      verticalAlignment: 'MIDDLE',
                      wrapStrategy: 'WRAP',
                    },
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
                },
              },
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: sheetNumericId,
                    gridProperties: {
                      frozenRowCount: 1,
                    },
                  },
                  fields: 'gridProperties.frozenRowCount',
                },
              },
            ],
          }),
        });
      }
    }
  } catch (e) {
    console.error('Error applying header styles:', e);
  }
};

/**
 * Maps raw 2D array of rows from Google Sheet into typed ModifyJobItem array
 */
export const parseSheetRowsToJobs = (allRows: (string | number)[][]): ModifyJobItem[] => {
  if (!allRows || allRows.length === 0) return [];

  // Check if first row is header row
  let hasHeader = false;
  let headerRow: string[] = [];
  const firstColStr = String(allRows[0]?.[0] || '').toLowerCase();
  if (firstColStr.includes('job') || firstColStr.includes('id') || firstColStr.includes('ลำดับ')) {
    hasHeader = true;
    headerRow = allRows[0].map((c) => String(c || '').toLowerCase().trim());
  }

  const dataRows = hasHeader ? allRows.slice(1) : allRows;

  // Header column index map (if headers present)
  let urgencyColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('เร่งด่วน') || h.includes('urgency') || h.includes('ความด่วน') || (h.includes('ด่วน') && !h.includes('ส่งมอบ'))) : -1;
  let techColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('ช่าง') || h.includes('technician')) : -1;
  let handoverColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('วันที่ช่างรับสินค้า') || h.includes('ช่างรับสินค้า') || h.includes('รับสินค้า') || h.includes('ชื่อผู้รับผิดชอบ') || h.includes('ผู้รับผิดชอบ') || (h.includes('ส่งมอบ') && (h.includes('engineer') || h.includes('ชิ้นงาน')))) : -1;
  let estReturnColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('ประมาณการ')) : -1;
  let inspectionDateColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('ตรวจสอบวันที่')) : -1;
  let qcColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('pass') || h.includes('ผลการตรวจ')) : -1;
  let finishColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('finish') || h.includes('เสร็จ')) : -1;
  let remarksColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('remarks') || h.includes('หมายเหตุ')) : -1;
  let timestampColIdx = hasHeader ? headerRow.findIndex((h) => h.includes('timestamp') || h.includes('เวลา')) : -1;

  return dataRows
    .map((row, index) => {
      const rowNumber = hasHeader ? index + 2 : index + 1; // 1-based row number
      const id = String(row[0] || '').trim();
      // Skip completely empty rows
      if (!id && !row[1] && !row[4] && !row[7] && !row[11]) {
        return null;
      }

      const jobId = id || `ECR-${1000 + index}`;
      const requestDate = String(row[1] || '');
      const requestMonth = String(row[2] || '');
      const requestTime = String(row[3] || '');
      const requester = String(row[4] || '');
      const sale = String(row[5] || '');
      const saleSoNo = String(row[6] || '');
      const customer = String(row[7] || '');
      const project = String(row[8] || '');
      const shipmentDate = String(row[9] || '');
      
      // 10 lines work details + quantities
      const workDetailsRaw = String(row[10] || '');
      const rawLines = workDetailsRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const workDetails: string[] = [];
      const workDetailQuantities: (string | number)[] = [];

      rawLines.forEach((rawLine) => {
        // Check for quantity annotations like [จำนวน: 5 ชิ้น], (จำนวน 5 ชิ้น), [5 ชิ้น], (5 pcs)
        let cleaned = rawLine;
        let qty: string | number = '';

        const matchQty = cleaned.match(/(?:\[จำนวน[:\s]*([^\]]+)\]|\(จำนวน[:\s]*([^\)]+)\)|\[([^\]]+)\]|\(([0-9]+(?:\s*ชิ้น|\s*pcs)?)\))/i);
        if (matchQty) {
          qty = (matchQty[1] || matchQty[2] || matchQty[3] || matchQty[4] || '').trim();
          cleaned = cleaned.replace(matchQty[0], '').trim();
        }

        // Remove leading index prefix like 1. or 1)
        cleaned = cleaned.replace(/^\d+[\.\:\)]\s*/, '').trim();

        workDetails.push(cleaned);
        workDetailQuantities.push(qty);
      });

      // Pad to 10 lines
      while (workDetails.length < 10) {
        workDetails.push('');
        workDetailQuantities.push('');
      }

      const modifyDetails = String(row[11] || '');
      const quantity = row[12] !== undefined ? row[12] : '';
      
      let rawUrgency = '';
      let technician = '';
      let engineerHandoverDate = '';
      let estimatedReturnDate = '';
      let inspectionDate = '';
      let rawInspectionResult = '';
      let rawFinish = '';
      let remarks = '';
      let updatedAt = '';

      if (hasHeader && urgencyColIdx !== -1) {
        rawUrgency = String(row[urgencyColIdx] || '');
        technician = techColIdx !== -1 ? String(row[techColIdx] || '') : '';
        engineerHandoverDate = handoverColIdx !== -1 ? String(row[handoverColIdx] || '') : '';
        estimatedReturnDate = estReturnColIdx !== -1 ? String(row[estReturnColIdx] || '') : '';
        inspectionDate = inspectionDateColIdx !== -1 ? String(row[inspectionDateColIdx] || '') : '';
        rawInspectionResult = qcColIdx !== -1 ? String(row[qcColIdx] || '').toUpperCase() : '';
        rawFinish = finishColIdx !== -1 ? String(row[finishColIdx] || '').toUpperCase() : '';
        remarks = remarksColIdx !== -1 ? String(row[remarksColIdx] || '') : '';
        updatedAt = timestampColIdx !== -1 ? String(row[timestampColIdx] || '') : '';
      } else {
        // Fallback row layout detection: 22 cols (Standard with Urgency at col 13), 21 cols, or 20 cols (legacy)
        const col13Str = String(row[13] || '').trim();
        const col14Str = String(row[14] || '').trim();
        const isUrgencyWord = col13Str.includes('ด่วน') || col13Str.includes('ปกติ') || col13Str.toUpperCase().includes('URGENT') || col13Str.toUpperCase().includes('NORMAL');
        const isDatePattern13 = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/.test(col13Str);

        if (row.length >= 22 || isUrgencyWord) {
          // 22 cols: 13: urgency, 14: technician, 15: handover, 16: estReturn, 17: inspectionDate, 18: qc, 19: finish, 20: remarks, 21: timestamp
          rawUrgency = col13Str;
          technician = col14Str;
          engineerHandoverDate = String(row[15] || '');
          estimatedReturnDate = String(row[16] || '');
          inspectionDate = String(row[17] || '');
          rawInspectionResult = String(row[18] || '').toUpperCase();
          rawFinish = String(row[19] || '').toUpperCase();
          remarks = String(row[20] || '');
          updatedAt = String(row[21] || '');
        } else if (row.length >= 21 || (!isDatePattern13 && col13Str !== '')) {
          // 21 cols without urgency: 13: technician, 14: handover, 15: estReturn...
          technician = col13Str;
          engineerHandoverDate = col14Str;
          estimatedReturnDate = String(row[15] || '');
          inspectionDate = String(row[16] || '');
          rawInspectionResult = String(row[17] || '').toUpperCase();
          rawFinish = String(row[18] || '').toUpperCase();
          remarks = String(row[19] || '');
          updatedAt = String(row[20] || '');
        } else {
          // Legacy 20 cols
          engineerHandoverDate = col13Str;
          estimatedReturnDate = col14Str;
          inspectionDate = String(row[15] || '');
          rawInspectionResult = String(row[16] || '').toUpperCase();
          rawFinish = String(row[17] || '').toUpperCase();
          remarks = String(row[18] || '');
          updatedAt = String(row[19] || '');
        }
      }

      // Determine Urgency Level
      let urgencyLevel: 'NORMAL' | 'URGENT' | 'VERY_URGENT' = 'NORMAL';
      const upperUrgency = rawUrgency.toUpperCase();
      if (upperUrgency.includes('VERY_URGENT') || upperUrgency.includes('ด่วนมาก') || upperUrgency.includes('HOT')) {
        urgencyLevel = 'VERY_URGENT';
      } else if (upperUrgency.includes('URGENT') || upperUrgency.includes('ด่วน') || upperUrgency.includes('RUSH')) {
        urgencyLevel = 'URGENT';
      } else {
        urgencyLevel = 'NORMAL';
      }

      let inspectionResult: ModifyJobItem['inspectionResult'] = '';
      if (rawInspectionResult.includes('PASS') || rawInspectionResult.includes('COMPLETE') || rawInspectionResult.includes('ผ่าน')) {
        inspectionResult = 'COMPLETE';
      } else if (rawInspectionResult.includes('REJECT') || rawInspectionResult.includes('EDIT') || rawInspectionResult.includes('แก้ไข') || rawInspectionResult.includes('ไม่ผ่าน')) {
        inspectionResult = 'EDIT';
      } else if (rawInspectionResult.includes('WAITING') || rawInspectionResult.includes('รอ')) {
        inspectionResult = 'WAITING';
      } else if (rawInspectionResult) {
        inspectionResult = 'PENDING';
      }

      let finishStatus: ModifyJobItem['finishStatus'] = 'PENDING';
      if (rawFinish.includes('FINISH') || rawFinish.includes('เสร็จ')) {
        finishStatus = 'FINISH';
      } else if (rawFinish.includes('IN_PROGRESS') || rawFinish.includes('กำลัง') || rawFinish.includes('PROGRESS')) {
        finishStatus = 'IN_PROGRESS';
      } else if (rawFinish.includes('CANCEL') || rawFinish.includes('ยกเลิก')) {
        finishStatus = 'CANCELLED';
      }

      return {
        rowNumber,
        id: jobId,
        requestDate,
        requestMonth,
        requestTime,
        requester,
        sale,
        saleSoNo,
        customer,
        project,
        shipmentDate,
        workDetails,
        workDetailQuantities,
        workDetailsRaw,
        modifyDetails,
        quantity,
        urgencyLevel,
        technician,
        engineerHandoverDate,
        estimatedReturnDate,
        inspectionDate,
        inspectionResult,
        finishStatus,
        remarks,
        updatedAt,
      };
    })
    .filter((j): j is NonNullable<typeof j> => j !== null);
};

/**
 * Fetch modify records from public or shared Google Sheet via gviz endpoint
 */
export const fetchModifyJobsFromPublicSheet = async (
  spreadsheetId: string,
  sheetTitle = DEFAULT_SHEET_NAME
): Promise<ModifyJobItem[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTitle)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GViz query failed with status ${response.status}`);
    }
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
    if (!match || !match[1]) {
      throw new Error('Invalid GViz response format');
    }
    const data = JSON.parse(match[1]);
    if (data.status === 'error') {
      throw new Error(data.errors?.[0]?.message || 'Google Sheet data error');
    }
    const table = data.table;
    if (!table) return [];

    const headers: string[] = (table.cols || []).map((col: any) => (col?.label || '').trim());
    const allRows: (string | number)[][] = [];

    const hasColHeaders = headers.some((h) => h.length > 0);
    if (hasColHeaders) {
      allRows.push(headers);
    }

    (table.rows || []).forEach((r: any) => {
      const rowVals: (string | number)[] = (r.c || []).map((cell: any) => {
        if (!cell) return '';
        if (cell.f !== undefined && cell.f !== null) return cell.f;
        if (cell.v !== undefined && cell.v !== null) return cell.v;
        return '';
      });
      allRows.push(rowVals);
    });

    return parseSheetRowsToJobs(allRows);
  } catch (err) {
    console.warn('Could not fetch from public gviz endpoint:', err);
    return [];
  }
};

/**
 * Fetch all modify records from Google Sheet
 */
export const fetchModifyJobsFromSheet = async (
  spreadsheetId: string,
  sheetTitle = DEFAULT_SHEET_NAME
): Promise<ModifyJobItem[]> => {
  const token = await getAccessToken();
  if (!token) {
    // If token not available, fallback to public gviz fetch
    return fetchModifyJobsFromPublicSheet(spreadsheetId, sheetTitle);
  }

  // Fetch sheet metadata to ensure sheet exists
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    // Fallback to public gviz fetch if sheet is view-shared
    const publicJobs = await fetchModifyJobsFromPublicSheet(spreadsheetId, sheetTitle);
    if (publicJobs.length > 0) return publicJobs;
    throw new Error('Cannot access spreadsheet. Please check permission or link.');
  }

  const meta = await metaRes.json();
  const availableSheets = meta.sheets || [];
  const foundSheet = availableSheets.find(
    (s: { properties: { title: string } }) => s.properties.title.toLowerCase() === sheetTitle.toLowerCase()
  );
  const actualSheetTitle = foundSheet ? foundSheet.properties.title : availableSheets[0]?.properties?.title || sheetTitle;

  const range = `${actualSheetTitle}!A1:V`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    // Try gviz fallback
    const publicJobs = await fetchModifyJobsFromPublicSheet(spreadsheetId, actualSheetTitle);
    if (publicJobs.length > 0) return publicJobs;
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to read sheet data: ${response.statusText}`);
  }

  const data = await response.json();
  const allRows: (string | number)[][] = data.values || [];

  return parseSheetRowsToJobs(allRows);
};

/**
 * Format ModifyJobItem into array of column values for Google Sheet
 */
export const itemToSheetRow = (item: ModifyJobItem): (string | number)[] => {
  // Join 10 lines of work details with newline numbering + quantity if present
  let formattedWorkDetails = '';
  if (item.workDetails && item.workDetails.length > 0) {
    const validLines = item.workDetails.map((line, idx) => {
      if (!line || !line.trim()) return '';
      const trimmed = line.trim();
      const lineQty = item.workDetailQuantities?.[idx];
      const qtySuffix = lineQty !== undefined && lineQty !== '' && String(lineQty).trim() !== ''
        ? ` [จำนวน: ${String(lineQty).trim()}]`
        : '';
      
      // If line doesn't start with number, prepend line index
      const indexed = /^\d+[\.\:\)]/.test(trimmed) ? trimmed : `${idx + 1}. ${trimmed}`;
      return `${indexed}${qtySuffix}`;
    }).filter(Boolean);
    formattedWorkDetails = validLines.join('\n');
  } else if (item.workDetailsRaw) {
    formattedWorkDetails = item.workDetailsRaw;
  }

  const urgencyText = item.urgencyLevel === 'VERY_URGENT'
    ? 'งานด่วนมาก'
    : item.urgencyLevel === 'URGENT'
    ? 'งานด่วน'
    : 'งานปกติ';

  const finishText = item.finishStatus === 'FINISH' 
    ? 'FINISH (เสร็จสมบูรณ์)' 
    : item.finishStatus === 'IN_PROGRESS' 
    ? 'IN PROGRESS (กำลังดำเนินการ)' 
    : item.finishStatus === 'CANCELLED'
    ? 'CANCELLED (ยกเลิก)'
    : 'PENDING (รอดำเนินการ)';

  const inspectionText = item.inspectionResult === 'PASS' || item.inspectionResult === 'COMPLETE'
    ? 'COMPLETE (ตรวจผ่าน)' 
    : item.inspectionResult === 'REJECT' || item.inspectionResult === 'EDIT'
    ? 'EDIT (ส่งกลับแก้ไข)' 
    : item.inspectionResult === 'WAITING' 
    ? 'WAITING (รอตรวจ)' 
    : item.inspectionResult || '-';

  return [
    item.id,
    item.requestDate || '',
    item.requestMonth || '',
    item.requestTime || '',
    item.requester || '',
    item.sale || '',
    item.saleSoNo || '',
    item.customer || '',
    item.project || '',
    item.shipmentDate || '',
    formattedWorkDetails,
    item.modifyDetails || '',
    item.quantity !== undefined ? item.quantity : '',
    urgencyText,
    item.technician || '',
    item.engineerHandoverDate || '',
    item.estimatedReturnDate || '',
    item.inspectionDate || '',
    inspectionText,
    finishText,
    item.remarks || '',
    new Date().toLocaleString('th-TH'),
  ];
};

/**
 * Append new Modify Job to Google Sheet
 */
export const appendModifyJobToSheet = async (
  spreadsheetId: string,
  item: ModifyJobItem,
  sheetTitle = DEFAULT_SHEET_NAME
): Promise<{ success: boolean; rowNumber: number }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  const rowValues = itemToSheetRow(item);
  const range = `${sheetTitle}!A:V`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to append row: ${response.statusText}`);
  }

  const result = await response.json();
  // Parse appended range to get row number e.g. "modify!A5:T5"
  const updatedRange = result.updates?.updatedRange || '';
  const match = updatedRange.match(/!A(\d+):/);
  const rowNumber = match ? parseInt(match[1], 10) : 2;

  return { success: true, rowNumber };
};

/**
 * Update an existing Modify Job in Google Sheet by Row Number
 */
export const updateModifyJobInSheet = async (
  spreadsheetId: string,
  rowNumber: number,
  item: ModifyJobItem,
  sheetTitle = DEFAULT_SHEET_NAME
): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  if (!rowNumber || rowNumber < 2) {
    throw new Error('Invalid row number for update.');
  }

  const rowValues = itemToSheetRow(item);
  const range = `${sheetTitle}!A${rowNumber}:V${rowNumber}`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to update row ${rowNumber}: ${response.statusText}`);
  }

  return true;
};

/**
 * Clear or Delete a row from Google Sheet
 */
export const deleteModifyJobFromSheet = async (
  spreadsheetId: string,
  rowNumber: number,
  sheetTitle = DEFAULT_SHEET_NAME
): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  if (!rowNumber || rowNumber < 2) {
    throw new Error('Invalid row number for deletion.');
  }

  // Get sheetId for deleteDimension
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) throw new Error('Failed to retrieve spreadsheet metadata');

  const meta = await metaRes.json();
  const targetSheet = meta.sheets?.find(
    (s: { properties: { title: string } }) => s.properties.title === sheetTitle
  ) || meta.sheets?.[0];

  if (!targetSheet) throw new Error(`Sheet "${sheetTitle}" not found`);

  const sheetId = targetSheet.properties.sheetId;

  // Google Sheets API deleteDimension is 0-indexed and end index is exclusive
  // rowNumber 2 means rowIndex 1
  const rowIndex = rowNumber - 1;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to delete row ${rowNumber}`);
  }

  return true;
};

/**
 * Synchronize and push all jobs to Google Sheet (Bulk update all rows)
 */
export const syncAllJobsToSheet = async (
  spreadsheetId: string,
  jobs: ModifyJobItem[],
  sheetTitle = DEFAULT_SHEET_NAME
): Promise<ModifyJobItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  // 1. Ensure sheet headers are properly initialized and formatted
  await setupSheetHeaders(spreadsheetId, sheetTitle);

  // 2. Prepare all row values
  const rows = jobs.map((job) => itemToSheetRow(job));

  // 3. Clear existing data rows (A2:V) first to prevent dangling deleted records
  const clearRange = `${sheetTitle}!A2:V`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (rows.length > 0) {
    // 4. Write all rows starting at row 2
    const writeRange = `${sheetTitle}!A2:V${1 + rows.length}`;
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        writeRange
      )}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: writeRange,
          majorDimension: 'ROWS',
          values: rows,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to update all rows in Google Sheet');
    }
  }

  // 5. Return updated jobs with synchronized 1-based row numbers
  return jobs.map((job, idx) => ({
    ...job,
    rowNumber: idx + 2,
  }));
};
