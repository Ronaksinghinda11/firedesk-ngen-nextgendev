// Service Form Constants

export interface InspectionFrequency {
  code: string;
  name: string;
  intervalDays: number;
  description: string;
}

// Predefined Inspection Frequencies (Fixed - not user editable)
export const INSPECTION_FREQUENCIES: Record<string, InspectionFrequency> = {
  DAILY: {
    code: 'DAILY',
    name: 'Daily',
    intervalDays: 1,
    description: 'Daily inspection'
  },
  WEEKLY: {
    code: 'WEEKLY',
    name: 'Weekly',
    intervalDays: 7,
    description: 'Weekly inspection'
  },
  MONTHLY: {
    code: 'MONTHLY',
    name: 'Monthly',
    intervalDays: 30,
    description: 'Monthly inspection'
  },
  QUARTERLY: {
    code: 'QUARTERLY',
    name: 'Quarterly',
    intervalDays: 90,
    description: 'Quarterly inspection (3 months)'
  },
  HALF_YEARLY: {
    code: 'HALF_YEARLY',
    name: 'Half-Yearly',
    intervalDays: 180,
    description: 'Half-yearly inspection (6 months)'
  },
  YEARLY: {
    code: 'YEARLY',
    name: 'Yearly',
    intervalDays: 365,
    description: 'Yearly inspection'
  }
};

// Get all frequencies as array
export const getAllFrequencies = (): InspectionFrequency[] => {
  return Object.values(INSPECTION_FREQUENCIES);
};

// Get frequency by code
export const getFrequencyByCode = (code: string): InspectionFrequency | null => {
  return INSPECTION_FREQUENCIES[code] || null;
};

// Answer types for questions
export const ANSWER_TYPES = {
  CONDITION_SELECT: 'CONDITION_SELECT',
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  DATE: 'DATE',
  BOOLEAN: 'BOOLEAN',
  PHOTO: 'PHOTO',
  SIGNATURE: 'SIGNATURE',
  MULTI_SELECT: 'MULTI_SELECT'
} as const;

export type AnswerType = typeof ANSWER_TYPES[keyof typeof ANSWER_TYPES];

// Health Status values (for assets)
export const HEALTH_STATUS = {
  HEALTHY: 'Healthy',
  NEED_ATTENTION: 'Need Attention',
  NOT_WORKING: 'Not Working',
  INVENTORY: 'Inventory',
  UNDER_MAINTENANCE: 'Under Maintenance',
  DE_ACTIVE: 'De-Active'
} as const;

// Severity Levels (for conditions)
export const SEVERITY_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
} as const;

export type SeverityLevel = typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS];
