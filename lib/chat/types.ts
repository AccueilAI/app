export interface ChatSource {
  content: string;
  source: string;
  doc_type: string;
  article_number?: string;
  source_url?: string;
  score: number;
}

export interface VerificationInfo {
  status: 'verified' | 'warning' | 'error';
  confidence: number;
  flaggedClaims: { claim: string; reason: string; severity: 'high' | 'medium' }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  verification?: VerificationInfo;
  timestamp: number;
}

export interface ChatRequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  language?: string;
}
