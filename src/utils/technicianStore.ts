// Technician Store and Roster Management Service with LocalStorage persistence

export interface TechnicianProfile {
  id: string;
  name: string;
  skill?: string;
  phone?: string;
  color?: string;
  createdAt?: string;
  isActive?: boolean;
}

export const DEFAULT_TECHNICIANS: TechnicianProfile[] = [
  {
    id: 'tech-faros',
    name: 'ฟารอส',
    skill: 'งานเชื่อม TIG สแตนเลส / ดัดพับ / โครงสร้างกลึง',
    phone: '082-345-6789',
    color: '#d97706', // Amber
    createdAt: '2026-08-01',
    isActive: true,
  },
  {
    id: 'tech-rak',
    name: 'ช่างรักษ์',
    skill: 'งานกลึง CNC / เจียร์พิกัด / Jig & Fixture',
    phone: '081-234-5678',
    color: '#0284c7', // Sky blue
    createdAt: '2026-08-01',
    isActive: true,
  },
  {
    id: 'tech-meen',
    name: 'มีน',
    skill: 'งาน Modify ทั่วไป / ประกอบชุด Pin / ทำสี & ลบคม',
    phone: '083-456-7890',
    color: '#10b981', // Emerald
    createdAt: '2026-08-01',
    isActive: true,
  },
];

const STORAGE_KEY = 'modify_technician_roster_v3';
const TECH_EVENT_KEY = 'modify_technicians_changed';

/**
 * Split and parse multiple technician names from a string (e.g., 'ฟารอส, ช่างรักษ์' or 'ช่างรักษ์ / มีน')
 */
export const parseTechnicians = (raw?: string): string[] => {
  if (!raw || !raw.trim()) return [];
  // Split by comma, slash, plus, semicolon, newline, or 'และ', '&'
  const parts = raw.split(/[,/\\+;&\n]|(?:\s+และ\s+)/i);
  const result: string[] = [];
  parts.forEach((p) => {
    let trimmed = p.trim();
    if (!trimmed) return;
    // Normalize aliases if matching default 3
    const lower = trimmed.toLowerCase();
    if (lower === 'faros' || lower === 'ฟารอส') {
      trimmed = 'ฟารอส';
    } else if (lower === 'meen' || lower === 'มีน') {
      trimmed = 'มีน';
    } else if (lower === 'ช่างรักษ์' || lower === 'รักษ์' || lower === 'rak') {
      trimmed = 'ช่างรักษ์';
    }
    if (trimmed && !result.includes(trimmed)) {
      result.push(trimmed);
    }
  });
  return result;
};

/**
 * Join an array of technician names into a clean string
 */
export const formatTechniciansList = (names: string[]): string => {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  return unique.join(', ');
};

/**
 * Retrieve technician roster from localStorage or return default 3 technicians
 */
export const getStoredTechnicians = (): TechnicianProfile[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy v2 key
      const legacyRaw = localStorage.getItem('modify_technician_roster_v2');
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const migrated = parsed.map((t: any) => ({
              ...t,
              name: t.name === 'meen' || t.name === 'MEEN' ? 'มีน' : t.name,
            }));
            saveStoredTechnicians(migrated);
            return migrated;
          }
        } catch {
          // ignore
        }
      }
      saveStoredTechnicians(DEFAULT_TECHNICIANS);
      return DEFAULT_TECHNICIANS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Normalize 'meen' to 'มีน'
      const normalized = parsed.map((t: any) => ({
        ...t,
        name: t.name === 'meen' || t.name === 'MEEN' ? 'มีน' : t.name,
      }));
      return normalized;
    }
    saveStoredTechnicians(DEFAULT_TECHNICIANS);
    return DEFAULT_TECHNICIANS;
  } catch (err) {
    console.error('Failed to parse stored technicians:', err);
    return DEFAULT_TECHNICIANS;
  }
};

/**
 * Save technician roster to localStorage and broadcast change event
 */
export const saveStoredTechnicians = (list: TechnicianProfile[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(TECH_EVENT_KEY, { detail: list }));
  } catch (err) {
    console.error('Failed to save technicians to localStorage:', err);
  }
};

/**
 * Get simple list of technician names
 */
export const getTechnicianNames = (): string[] => {
  const list = getStoredTechnicians();
  return list.filter((t) => t.name && t.name.trim()).map((t) => t.name.trim());
};

/**
 * Add a new technician to the roster
 */
export const addStoredTechnician = (
  name: string,
  skill?: string,
  phone?: string,
  color?: string
): TechnicianProfile => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('กรุณาระบุชื่อช่าง');
  }

  const current = getStoredTechnicians();
  const existing = current.find((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    throw new Error(`ชื่อช่าง "${trimmed}" มีอยู่ในระบบแล้ว`);
  }

  const newTech: TechnicianProfile = {
    id: `tech-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: trimmed,
    skill: (skill || '').trim(),
    phone: (phone || '').trim(),
    color: color || '#64748b',
    createdAt: new Date().toISOString().split('T')[0],
    isActive: true,
  };

  const updated = [...current, newTech];
  saveStoredTechnicians(updated);
  return newTech;
};

/**
 * Update an existing technician
 */
export const updateStoredTechnician = (
  idOrOldName: string,
  updates: Partial<TechnicianProfile>
): TechnicianProfile[] => {
  const current = getStoredTechnicians();
  const index = current.findIndex(
    (t) => t.id === idOrOldName || t.name.trim().toLowerCase() === idOrOldName.trim().toLowerCase()
  );

  if (index === -1) {
    throw new Error('ไม่พบข้อมูลช่างที่ต้องการแก้ไข');
  }

  // If renaming, verify no other tech has the same name
  if (updates.name && updates.name.trim().toLowerCase() !== current[index].name.trim().toLowerCase()) {
    const conflict = current.find(
      (t, idx) => idx !== index && t.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
    );
    if (conflict) {
      throw new Error(`มีช่างชื่อ "${updates.name.trim()}" ในระบบแล้ว`);
    }
  }

  const updatedTech: TechnicianProfile = {
    ...current[index],
    ...updates,
    name: updates.name ? updates.name.trim() : current[index].name,
  };

  const nextList = [...current];
  nextList[index] = updatedTech;
  saveStoredTechnicians(nextList);
  return nextList;
};

/**
 * Delete a technician from roster
 */
export const deleteStoredTechnician = (idOrName: string): TechnicianProfile[] => {
  const current = getStoredTechnicians();
  const filtered = current.filter(
    (t) => t.id !== idOrName && t.name.trim().toLowerCase() !== idOrName.trim().toLowerCase()
  );

  if (filtered.length === current.length) {
    throw new Error('ไม่พบข้อมูลช่างที่ต้องการลบ');
  }

  saveStoredTechnicians(filtered);
  return filtered;
};

/**
 * Reset technician roster to default (ช่างรักษ์, FAROS, MEEN)
 */
export const resetStoredTechniciansToDefault = (): TechnicianProfile[] => {
  saveStoredTechnicians(DEFAULT_TECHNICIANS);
  return DEFAULT_TECHNICIANS;
};

/**
 * Hook or helper to subscribe to technician roster changes
 */
export const subscribeTechniciansChange = (callback: (techs: TechnicianProfile[]) => void): (() => void) => {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<TechnicianProfile[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getStoredTechnicians());
    }
  };

  window.addEventListener(TECH_EVENT_KEY, handler);
  return () => {
    window.removeEventListener(TECH_EVENT_KEY, handler);
  };
};
