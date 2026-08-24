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
  'ช่างผู้ทำ',
  'ส่งมอบชิ้นงานให้ engineer วันที่',
  'ประมาณการส่งมอบคืนวันที่',
  'ตรวจสอบวันที่',
  'ผลการตรวจสอบ (PASS OR REJECT)',
  'FINISH',
  'หมายเหตุ / Remarks',
  'Timestamp',
];

const DEFAULT_SHEET_NAME = 'modify';
const DEFAULT_SPREADSHEET_TITLE = 'ตาราง modify';

/**
 * Searches user's Google Drive for a spreadsheet named "ตาราง modify" or "modify"
 */
export const findExistingSpreadsheet = async (): Promise<GoogleSpreadsheetInfo | null> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and (name='ตาราง modify' or name='modify' or name contains 'Modify') and trashed=false"
  );
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&orderBy=modifiedTime desc&pageSize=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to search Google Drive: ${response.statusText}`
    );
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    return {
      id: file.id,
      name: file.name,
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
      sheetName: DEFAULT_SHEET_NAME,
    };
  }

  return null;
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
  const range = `${sheetTitle}!A1:U1`;
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
 * Fetch all modify records from Google Sheet
 */
export const fetchModifyJobsFromSheet = async (
  spreadsheetId: string,
  sheetTitle = DEFAULT_SHEET_NAME
): Promise<ModifyJobItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  // Fetch sheet metadata to ensure sheet exists
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    throw new Error('Cannot access spreadsheet. Please check permission or link.');
  }

  const meta = await metaRes.json();
  const availableSheets = meta.sheets || [];
  const foundSheet = availableSheets.find(
    (s: { properties: { title: string } }) => s.properties.title.toLowerCase() === sheetTitle.toLowerCase()
  );
  const actualSheetTitle = foundSheet ? foundSheet.properties.title : availableSheets[0]?.properties?.title || sheetTitle;

  const range = `${actualSheetTitle}!A2:U`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to read sheet data: ${response.statusText}`);
  }

  const data = await response.json();
  const rows: (string | number)[][] = data.values || [];

  return rows.map((row, index) => {
    const rowNumber = index + 2; // Row 1 is header, data starts at row 2
    const id = String(row[0] || `MOD-${1000 + index}`);
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
        // Remove the matched quantity tag from the description text
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
    
    // Check if row has new 21 columns format (with technician at col 13)
    // or legacy 20 columns format (where col 13 was engineerHandoverDate)
    let technician = '';
    let engineerHandoverDate = '';
    let estimatedReturnDate = '';
    let inspectionDate = '';
    let rawInspectionResult = '';
    let rawFinish = '';
    let remarks = '';
    let updatedAt = '';

    const col13Str = String(row[13] || '').trim();
    const isDatePattern = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/.test(col13Str);

    if (row.length >= 21 || (!isDatePattern && col13Str !== '')) {
      technician = col13Str;
      engineerHandoverDate = String(row[14] || '');
      estimatedReturnDate = String(row[15] || '');
      inspectionDate = String(row[16] || '');
      rawInspectionResult = String(row[17] || '').toUpperCase();
      rawFinish = String(row[18] || '').toUpperCase();
      remarks = String(row[19] || '');
      updatedAt = String(row[20] || '');
    } else {
      // Legacy 20 cols
      technician = '';
      engineerHandoverDate = col13Str;
      estimatedReturnDate = String(row[14] || '');
      inspectionDate = String(row[15] || '');
      rawInspectionResult = String(row[16] || '').toUpperCase();
      rawFinish = String(row[17] || '').toUpperCase();
      remarks = String(row[18] || '');
      updatedAt = String(row[19] || '');
    }

    let inspectionResult: ModifyJobItem['inspectionResult'] = '';
    if (rawInspectionResult.includes('PASS')) inspectionResult = 'PASS';
    else if (rawInspectionResult.includes('REJECT')) inspectionResult = 'REJECT';
    else if (rawInspectionResult.includes('WAITING') || rawInspectionResult.includes('รอ')) inspectionResult = 'WAITING';
    else if (rawInspectionResult) inspectionResult = 'PENDING';

    let finishStatus: ModifyJobItem['finishStatus'] = 'PENDING';
    if (rawFinish.includes('FINISH') || rawFinish.includes('เสร็จ') || rawFinish.includes('COMPLETE')) {
      finishStatus = 'FINISH';
    } else if (rawFinish.includes('IN_PROGRESS') || rawFinish.includes('กำลัง') || rawFinish.includes('PROGRESS')) {
      finishStatus = 'IN_PROGRESS';
    } else if (rawFinish.includes('CANCEL') || rawFinish.includes('ยกเลิก')) {
      finishStatus = 'CANCELLED';
    }

    return {
      rowNumber,
      id,
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
      technician,
      engineerHandoverDate,
      estimatedReturnDate,
      inspectionDate,
      inspectionResult,
      finishStatus,
      remarks,
      updatedAt,
    };
  });
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

  const finishText = item.finishStatus === 'FINISH' 
    ? 'FINISH (เสร็จสมบูรณ์)' 
    : item.finishStatus === 'IN_PROGRESS' 
    ? 'IN PROGRESS (กำลังดำเนินการ)' 
    : item.finishStatus === 'CANCELLED'
    ? 'CANCELLED (ยกเลิก)'
    : 'PENDING (รอดำเนินการ)';

  const inspectionText = item.inspectionResult === 'PASS' 
    ? 'PASS (ผ่าน)' 
    : item.inspectionResult === 'REJECT' 
    ? 'REJECT (ไม่ผ่าน / ต้องแก้ไข)' 
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
  const range = `${sheetTitle}!A:U`;

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
  const range = `${sheetTitle}!A${rowNumber}:U${rowNumber}`;

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
