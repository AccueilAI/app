export interface Deadline {
  id: string;
  user_id: string;
  title: string;
  deadline_type: DeadlineType;
  deadline_date: string;
  description: string | null;
  days_before_reminder: number;
  reminder_sent: boolean;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export type DeadlineType =
  | 'visa_renewal'
  | 'caf_declaration'
  | 'tax'
  | 'cpam'
  | 'prefecture_rdv'
  | 'other';

export const DEADLINE_TYPES: DeadlineType[] = [
  'visa_renewal',
  'caf_declaration',
  'tax',
  'cpam',
  'prefecture_rdv',
  'other',
];
