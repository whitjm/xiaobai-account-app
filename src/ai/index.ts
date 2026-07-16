// AI 模块总入口 - 按需加载
// AI 模块较大，不在首屏加载，用户触发时才按需加载

import type { AILoadState } from './types';

let loadState: AILoadState = {
  ocr: false,
  voice: false,
  rag: false,
  agent: false,
};

// 获取 AI 模块加载状态
export function getAILoadState(): AILoadState {
  return { ...loadState };
}

// 按需加载 OCR 模块
export async function loadOCR(): Promise<typeof import('./ocr/index')> {
  if (!loadState.ocr) {
    const module = await import('./ocr/index');
    loadState.ocr = true;
    return module;
  }
  return import('./ocr/index');
}

// 按需加载语音模块
export async function loadVoice(): Promise<typeof import('./voice/index')> {
  if (!loadState.voice) {
    const module = await import('./voice/index');
    loadState.voice = true;
    return module;
  }
  return import('./voice/index');
}

// 按需加载 RAG 模块
export async function loadRAG(): Promise<typeof import('./rag/index')> {
  if (!loadState.rag) {
    const module = await import('./rag/index');
    loadState.rag = true;
    return module;
  }
  return import('./rag/index');
}

// 按需加载 Agent 模块
export async function loadAgent(): Promise<typeof import('./agent/index')> {
  if (!loadState.agent) {
    const module = await import('./agent/index');
    loadState.agent = true;
    return module;
  }
  return import('./agent/index');
}

// 预加载 AI 模块（用户点击 AI 按钮时调用）
export async function preloadAI(): Promise<void> {
  await Promise.all([loadOCR(), loadVoice(), loadRAG(), loadAgent()]);
}

// 检查 AI 是否可用
export function isAIAvailable(): boolean {
  // 至少有一个模块加载了就算可用
  return Object.values(loadState).some(Boolean);
}
