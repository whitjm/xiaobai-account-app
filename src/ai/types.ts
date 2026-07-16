// AI 模块类型定义

// OCR 识别结果
export interface OCRResult {
  success: boolean;
  text?: string;
  amount?: number;
  date?: string;
  merchant?: string;
  category?: string;
  error?: string;
}

// 语音识别结果
export interface VoiceResult {
  success: boolean;
  text?: string;
  error?: string;
}

// RAG 用户画像
export interface UserProfile {
  id: string;
  type:
    | 'spending_habit'
    | 'income_pattern'
    | 'category_preference'
    | 'merchant_preference'
    | 'time_pattern';
  content: string;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

// RAG 检索结果
export interface RAGResult {
  success: boolean;
  context?: string;
  error?: string;
}

// Agent 任务结果
export interface AgentResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

// AI 配置
export interface AIConfig {
  provider: 'claude' | 'openai' | 'ollama';
  apiKey: string;
  model: string;
  apiEndpoint?: string;
}

// AI 模块加载状态
export interface AILoadState {
  ocr: boolean;
  voice: boolean;
  rag: boolean;
  agent: boolean;
}
