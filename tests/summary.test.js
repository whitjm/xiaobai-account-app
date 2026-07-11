// 测 src/utils/summary.js:算合计(总支出/总收入/结余)。
// 这是纯逻辑,直接 import 来测。原先后端 queries.js 的 getSummary 已合并到这里。
import { describe, it, expect } from 'vitest'
import { computeSummary } from '../src/utils/summary.js'

describe('computeSummary:统计总支出、总收入、结余', () => {
  it('正常情况:收入100、支出30,结余应为70', () => {
    const recs = [
      { type: 'income', amount: 100 },
      { type: 'expense', amount: 30 },
    ]
    expect(computeSummary(recs)).toEqual({ income: 100, expense: 30, balance: 70 })
  })

  it('边界情况:一条记录都没有,全部应为0', () => {
    expect(computeSummary([])).toEqual({ income: 0, expense: 0, balance: 0 })
  })

  it('小数金额:12.50 + 7.30 = 19.80,能正确相加', () => {
    const recs = [
      { type: 'expense', amount: 12.5 },
      { type: 'expense', amount: 7.3 },
    ]
    expect(computeSummary(recs).expense).toBeCloseTo(19.8, 2)
  })

  it('结余为负:支出大于收入', () => {
    const recs = [
      { type: 'income', amount: 50 },
      { type: 'expense', amount: 80 },
    ]
    expect(computeSummary(recs).balance).toBe(-30)
  })
})
