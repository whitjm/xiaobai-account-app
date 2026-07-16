// IPC 输入校验模块：防止恶意输入和数据验证
import { log } from './logger';

// 允许的 IPC 通道白名单
const ALLOWED_CHANNELS = [
  'categories:getAll',
  'categories:add',
  'categories:update',
  'categories:delete',
  'records:getAll',
  'records:add',
  'records:update',
  'records:delete',
  'records:summary',
  'io:exportExcel',
  'io:backup',
  'io:restore',
  'io:importExcel',
];

// 校验 IPC 通道是否在白名单中
export function isAllowedChannel(channel: string): boolean {
  return ALLOWED_CHANNELS.includes(channel);
}

// 去除危险字符，防止 XSS 和注入攻击
export function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return '';
  // 移除 < > " ' & 等危险字符
  const dangerous = '<>"\'&';
  let result = str;
  for (const char of dangerous) {
    result = result.split(char).join('');
  }
  return result.trim();
}

// 校验记录输入
export interface ValidateRecordInputResult {
  valid: boolean;
  error?: string;
  data?: {
    type: string;
    amount: number;
    major: string;
    minor: string;
    date: string;
    note: string;
  };
}

export function validateRecordInput(input: unknown): ValidateRecordInputResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: '无效的输入数据' };
  }

  const record = input as Record<string, unknown>;

  // 验证类型
  const type = sanitizeString(record.type);
  if (type !== 'expense' && type !== 'income') {
    log('warn', 'Invalid record type rejected', { type });
    return { valid: false, error: '无效的记录类型' };
  }

  // 验证金额
  const amount =
    typeof record.amount === 'number' ? record.amount : parseFloat(String(record.amount));
  if (isNaN(amount) || amount <= 0 || amount > 1e15) {
    log('warn', 'Invalid amount rejected', { amount });
    return { valid: false, error: '无效的金额' };
  }

  // 验证分类
  const major = sanitizeString(record.major);
  const minor = sanitizeString(record.minor);

  if (!major || !minor) {
    log('warn', 'Invalid category rejected', { major, minor });
    return { valid: false, error: '请选择有效的分类' };
  }

  // 验证日期
  const date = sanitizeString(record.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    log('warn', 'Invalid date rejected', { date });
    return { valid: false, error: '无效的日期格式' };
  }

  // 验证备注（可选，但有长度限制）
  const note = sanitizeString(record.note);
  if (note.length > 500) {
    log('warn', 'Note too long rejected', { length: note.length });
    return { valid: false, error: '备注过长（最多500字符）' };
  }

  return {
    valid: true,
    data: { type, amount, major, minor, date, note },
  };
}

// 校验分类输入
export interface ValidateCategoryInputResult {
  valid: boolean;
  error?: string;
  data?: {
    type: string;
    major: string;
    minor: string;
  };
}

export function validateCategoryInput(input: unknown): ValidateCategoryInputResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: '无效的输入数据' };
  }

  const cat = input as Record<string, unknown>;

  const type = sanitizeString(cat.type);
  if (type !== 'expense' && type !== 'income') {
    return { valid: false, error: '无效的分类类型' };
  }

  const major = sanitizeString(cat.major);
  const minor = sanitizeString(cat.minor);

  if (!major || major.length > 50 || !minor || minor.length > 50) {
    return { valid: false, error: '分类名称无效' };
  }

  return {
    valid: true,
    data: { type, major, minor },
  };
}

// 校验 ID 参数
export function validateId(id: unknown): number | null {
  const num = typeof id === 'number' ? id : parseInt(String(id), 10);
  if (isNaN(num) || num <= 0 || num > 1e15) {
    return null;
  }
  return num;
}
