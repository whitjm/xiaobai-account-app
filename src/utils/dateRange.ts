// 时间范围工具:根据"周/月/年/全部/自定义"算出起止日期,并支持上一个/下一个翻页。
// 日期统一用 YYYY-MM-DD 字符串,方便和数据库里的 date 字段比较。

type DateRangeMode = 'week' | 'month' | 'year' | 'all';

interface DateRange {
  start: string;
  end: string;
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 以某个基准日,算出所在"周"的周一到周日(中国习惯周一为一周开始)
function weekRange(base: Date): DateRange {
  const d = new Date(base);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // 周日=7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: fmt(monday), end: fmt(sunday) };
}

function monthRange(base: Date): DateRange {
  const d = new Date(base);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

function yearRange(base: Date): DateRange {
  const d = new Date(base);
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear(), 11, 31);
  return { start: fmt(start), end: fmt(end) };
}

// 根据模式和基准日,返回 { start, end }。全部返回 null 表示不限时间。
export function computeRange(mode: DateRangeMode, anchor?: Date): DateRange | null {
  const base = anchor || new Date();
  switch (mode) {
    case 'week':
      return weekRange(base);
    case 'month':
      return monthRange(base);
    case 'year':
      return yearRange(base);
    case 'all':
    default:
      return null;
  }
}

// 翻页:按当前模式把基准日往前/往后挪一个周期。step: -1 上一个,+1 下一个。
export function shiftAnchor(mode: DateRangeMode, anchor: Date, step: number): Date {
  const d = new Date(anchor);
  if (mode === 'week') d.setDate(d.getDate() + 7 * step);
  else if (mode === 'month') d.setMonth(d.getMonth() + step);
  else if (mode === 'year') d.setFullYear(d.getFullYear() + step);
  return d;
}

// 给当前范围一个好看的中文标题,如"2026年7月""2026年"“本周(7-06 ~ 7-12)”
export function rangeLabel(mode: DateRangeMode, anchor: Date): string {
  const d = new Date(anchor);
  if (mode === 'all') return '全部时间';
  if (mode === 'year') return `${d.getFullYear()}年`;
  if (mode === 'month') return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  if (mode === 'week') {
    const { start, end } = weekRange(d);
    return `${start.slice(5)} ~ ${end.slice(5)}`;
  }
  return '';
}

// 判断某条记录日期是否落在范围内。range 为 null 表示全部通过。
export function inRange(dateStr: string, range: DateRange | null): boolean {
  if (!range) return true;
  return dateStr >= range.start && dateStr <= range.end;
}

export { fmt };
