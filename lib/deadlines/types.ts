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
  stage: DeadlineStage;
  stage_updated_at: string;
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

export type DeadlineStage =
  | 'preparing'
  | 'submitted'
  | 'processing'
  | 'decision'
  | 'complete';

export const DEADLINE_STAGES: DeadlineStage[] = [
  'preparing',
  'submitted',
  'processing',
  'decision',
  'complete',
];
