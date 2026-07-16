// 语音模块 - Web Speech API 集成
// 功能：语音录制、中文语音识别

import type { VoiceResult } from '../types';

// 语音识别配置
const VOICE_CONFIG = {
  lang: 'zh-CN',
  continuous: false,
  interimResults: true,
};

// 录音状态
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

// 检查浏览器是否支持语音识别
export function isSpeechSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 开始录音
export async function startRecording(): Promise<{ success: boolean; error?: string }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '无法访问麦克风',
    };
  }
}

// 停止录音并返回音频 Blob
export async function stopRecording(): Promise<{
  success: boolean;
  audioBlob?: Blob;
  error?: string;
}> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve({ success: false, error: '未在录音' });
      return;
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      // 停止所有 tracks
      mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder = null;
      audioChunks = [];
      resolve({ success: true, audioBlob });
    };

    mediaRecorder.stop();
  });
}

// 使用 Web Speech API 进行语音识别
export function recognizeSpeech(): Promise<VoiceResult> {
  return new Promise((resolve) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      resolve({ success: false, error: '浏览器不支持语音识别' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = VOICE_CONFIG.lang;
    recognition.continuous = VOICE_CONFIG.continuous;
    recognition.interimResults = VOICE_CONFIG.interimResults;

    let finalText = '';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        }
      }
    };

    recognition.onerror = (event) => {
      resolve({ success: false, error: `语音识别错误: ${event.error}` });
    };

    recognition.onend = () => {
      if (finalText) {
        resolve({ success: true, text: finalText });
      } else {
        resolve({ success: false, error: '未识别到语音' });
      }
    };

    // 开始识别
    try {
      recognition.start();
    } catch {
      resolve({ success: false, error: '无法启动语音识别' });
    }
  });
}

// 解析语音命令为记账记录
export function parseVoiceCommand(text: string): {
  type?: 'expense' | 'income';
  amount?: number;
  category?: string;
  note?: string;
} {
  const result: { type?: 'expense' | 'income'; amount?: number; category?: string; note?: string } =
    {};

  // 识别支出/收入
  if (text.includes('支出') || text.includes('花') || text.includes('买')) {
    result.type = 'expense';
  } else if (text.includes('收入') || text.includes('赚') || text.includes('收到')) {
    result.type = 'income';
  }

  // 提取金额
  const amountMatch = text.match(/(\d+\.?\d{0,2})/);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1]);
  }

  // 提取分类关键词
  const categories = [
    '餐饮',
    '交通',
    '购物',
    '居住',
    '娱乐',
    '医疗',
    '人情',
    '学习',
    '工资',
    '兼职',
  ];
  for (const cat of categories) {
    if (text.includes(cat)) {
      result.category = cat;
      break;
    }
  }

  // 提取备注
  const noteMatch = text.match(/[，,](.+?)$/);
  if (noteMatch) {
    result.note = noteMatch[1].trim();
  }

  return result;
}
