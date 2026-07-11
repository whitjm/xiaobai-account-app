// 合计工具:遍历一批账目,分别累加支出和收入,算出结余。
// 首页和统计/编辑页都用它,避免同一段合计逻辑到处复制。
export function computeSummary(records) {
  let expense = 0
  let income = 0
  for (const r of records) {
    if (r.type === 'expense') expense += r.amount
    else if (r.type === 'income') income += r.amount
  }
  return { expense, income, balance: income - expense }
}
