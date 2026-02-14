export interface DocumentAnalysis {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  analysis: string;
  checklist: ChecklistItem[] | null;
  document_type: string | null;
  language: string;
  created_at: string;
}

export interface ChecklistItem {
  item: string;
  checked: boolean;
  details: string | null;
}
