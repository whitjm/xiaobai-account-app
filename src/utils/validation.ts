// 输入验证工具:防止 XSS、SQL 注入等安全问题

// 去除危险字符,防止 XSS
export function sanitizeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/[<>"'&]/g, '') // 移除危险字符
    .trim();
}

// 验证金额:正数,最多两位小数
export function validateAmount(amount: number | string): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && num < 1e15;
}

// 验证日期格式:YYYY-MM-DD
export function validateDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

// 验证分类名称:不能为空,长度限制
export function validateCategoryName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
}

// 验证备注:长度限制
export function validateNote(note: string | undefined): boolean {
  if (!note) return true; // 备注可选
  return note.length <= 500;
}

// 验证记录类型
export function validateRecordType(type: string): boolean {
  return type === 'expense' || type === 'income';
}
