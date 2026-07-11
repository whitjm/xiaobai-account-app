// 对 src/utils/dateRange.js 的时间范围工具做单元测试。
// 这是纯逻辑(不碰数据库、不碰界面),最好测。
import { describe, it, expect } from 'vitest'
import {
  computeRange,
  shiftAnchor,
  rangeLabel,
  inRange,
  fmt,
} from '../src/utils/dateRange.js'

// 固定用 2026-07-08(周三)作基准日,结果才稳定可预期
const WED = new Date(2026, 6, 8) // 月份从0算,6=七月

describe('fmt:把日期对象格式化成 YYYY-MM-DD', () => {
  it('个位数的月和日应补零', () => {
    expect(fmt(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('computeRange:按模式算起止日期', () => {
  it('周:2026-07-08(周三)所在周应为周一07-06到周日07-12', () => {
    expect(computeRange('week', WED)).toEqual({ start: '2026-07-06', end: '2026-07-12' })
  })

  it('月:七月应为07-01到07-31', () => {
    expect(computeRange('month', WED)).toEqual({ start: '2026-07-01', end: '2026-07-31' })
  })

  it('年:2026年应为01-01到12-31', () => {
    expect(computeRange('year', WED)).toEqual({ start: '2026-01-01', end: '2026-12-31' })
  })

  it('全部:应返回 null(表示不限时间)', () => {
    expect(computeRange('all', WED)).toBeNull()
  })

  it('二月闰年边界:2024年2月应到02-29', () => {
    expect(computeRange('month', new Date(2024, 1, 10))).toEqual({ start: '2024-02-01', end: '2024-02-29' })
  })
})

describe('shiftAnchor:翻页(上一个/下一个周期)', () => {
  it('月:往后翻一个月,从七月到八月', () => {
    const next = shiftAnchor('month', WED, 1)
    expect(next.getMonth()).toBe(7) // 8月
  })

  it('月:往前翻一个月,从七月到六月', () => {
    const prev = shiftAnchor('month', WED, -1)
    expect(prev.getMonth()).toBe(5) // 6月
  })

  it('周:往后翻一周应是7天后', () => {
    const next = shiftAnchor('week', WED, 1)
    expect(fmt(next)).toBe('2026-07-15')
  })

  it('年:往后翻一年到2027', () => {
    expect(shiftAnchor('year', WED, 1).getFullYear()).toBe(2027)
  })
})

describe('rangeLabel:中文标题', () => {
  it('月模式应显示"2026年7月"', () => {
    expect(rangeLabel('month', WED)).toBe('2026年7月')
  })

  it('年模式应显示"2026年"', () => {
    expect(rangeLabel('year', WED)).toBe('2026年')
  })

  it('全部模式应显示"全部时间"', () => {
    expect(rangeLabel('all', WED)).toBe('全部时间')
  })
})

describe('inRange:判断某天是否落在范围内', () => {
  const range = { start: '2026-07-01', end: '2026-07-31' }
  it('范围内的日期应返回 true', () => {
    expect(inRange('2026-07-15', range)).toBe(true)
  })
  it('起止日当天应算在内(含边界)', () => {
    expect(inRange('2026-07-01', range)).toBe(true)
    expect(inRange('2026-07-31', range)).toBe(true)
  })
  it('范围外的日期应返回 false', () => {
    expect(inRange('2026-08-01', range)).toBe(false)
  })
  it('range 为 null 时一律返回 true(全部时间)', () => {
    expect(inRange('2020-01-01', null)).toBe(true)
  })
})
