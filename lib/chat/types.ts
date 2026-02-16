export interface ChatSource {
  content: string;
  source: string;
  doc_type: string;
  article_number?: string;
  source_url?: string;
  score: number;
  last_crawled_at?: string;
}

export interface WebSource {
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

export interface VerificationInfo {
  status: 'verified' | 'warning' | 'error';
  confidence: number;
  flaggedClaims: { claim: string; reason: string; severity: 'high' | 'medium' }[];
}

export type ProgressStage =
  | 'searching_rag'
  | 'searching_web'
  | 'looking_up'
  | 'generating'
  | 'verifying';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  webSources?: WebSource[];
  verification?: VerificationInfo;
  followUps?: string[];
  progress?: ProgressStage;
  timestamp: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatRequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  language?: string;
  conversationId?: string;
}
