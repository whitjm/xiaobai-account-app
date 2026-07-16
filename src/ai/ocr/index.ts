// OCR 模块 - Tesseract.js 集成
// 功能：识别票据图片，提取金额、日期、商家等信息

import type { OCRResult } from '../types';

// 初始化 OCR 引擎（懒加载）
let tesseractWorker: {
  recognize: (image: string | File) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
} | null = null;

export async function initOCR(): Promise<void> {
  if (tesseractWorker) return;

  // 动态导入 tesseract.js
  const Tesseract = await import('tesseract.js');

  // 创建 worker
  tesseractWorker = await Tesseract.createWorker('eng+chi_sim');
}

// 识别图片中的文字
export async function recognizeText(imageData: string | File): Promise<OCRResult> {
  try {
    if (!tesseractWorker) {
      await initOCR();
    }

    const result = await tesseractWorker!.recognize(imageData);

    return {
      success: true,
      text: result.data.text,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR识别失败',
    };
  }
}

// 从识别结果中提取结构化信息
export function extractReceiptInfo(text: string): OCRResult {
  try {
    // 提取金额（匹配 ¥123.45 或 123.45 格式）
    const amountMatch = text.match(/[¥￥]?\s*(\d+\.?\d{0,2})/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

    // 提取日期（匹配 YYYY-MM-DD 或 YYYY/MM/DD 格式）
    const dateMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    const date = dateMatch ? dateMatch[1].replace(/\//g, '-') : undefined;

    // 提取商家名称（简单取第一行）
    const lines = text.split('\n').filter((l) => l.trim());
    const merchant = lines[0]?.trim();

    return {
      success: true,
      text,
      amount,
      date,
      merchant,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解析失败',
    };
  }
}

// 识别并提取结构化信息
export async function processReceipt(imageData: string | File): Promise<OCRResult> {
  const textResult = await recognizeText(imageData);
  if (!textResult.success) {
    return textResult;
  }

  return extractReceiptInfo(textResult.text!);
}

// 释放 OCR 资源
export async function disposeOCR(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}
