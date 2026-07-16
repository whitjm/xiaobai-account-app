import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { computeRange, inRange } from '../utils/dateRange'
import type { RecordEntry } from '../types'

const COLORS = [
  '#007aff', '#ff3b30', '#34c759', '#ff9500', '#5856d6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#00c7be',
]

interface HomeProps {
  records: RecordEntry[]
  onNavigate: (page: string) => void
}

// 首页总览:本月收支结余大数字 + 支出分类小饼图 + 最近几笔账。
export default function Home({ records, onNavigate }: HomeProps) {
  // 本月范围
  const range = useMemo(() => computeRange('month', new Date()), [])
  const monthRecs = useMemo(
    () => records.filter((r) => inRange(r.date, range)),
    [records, range]
  )

  // 本月合计
  const summary = useMemo(() => {
    let expense = 0
    let income = 0
    for (const r of monthRecs) {
      if (r.type === 'expense') expense += r.amount
      else if (r.type === 'income') income += r.amount
    }
    return { expense, income, balance: income - expense }
  }, [monthRecs])

  // 本月支出按大类占比(小饼图)
  const pieData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of monthRecs) {
      if (r.type !== 'expense') continue
      map[r.major] = (map[r.major] || 0) + r.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
  }, [monthRecs])

  // 最近 6 笔(records 已按日期倒序)
  const recent = records.slice(0, 6)

  const fmt = (n: number) => Number(n).toFixed(2)
  const monthLabel = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`

  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-hero-title">{monthLabel}结余</div>
        <div className="home-hero-balance">¥{fmt(summary.balance)}</div>
        <div className="home-hero-sub">
          <span className="income">收入 ¥{fmt(summary.income)}</span>
          <span className="dot">·</span>
          <span className="expense">支出 ¥{fmt(summary.expense)}</span>
        </div>
        <button className="btn-primary home-add-btn" onClick={() => onNavigate('record')}>
          + 记一笔
        </button>
      </div>

      <div className="home-grid">
        {/* 本月支出占比 */}
        <div className="chart-card home-pie">
          <h3>本月支出分布</h3>
          {pieData.length === 0 ? (
            <p className="empty-tip">本月还没有支出记录</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  label={(e: { name: string; percent: number }) => `${e.name} ${(e.percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `¥${v}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 最近账目 */}
        <div className="chart-card home-recent">
          <div className="home-recent-head">
            <h3>最近账目</h3>
            <button className="home-more" onClick={() => onNavigate('edit')}>
              查看全部 ›
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="empty-tip">还没有记录,去记第一笔吧 📝</p>
          ) : (
            <ul className="home-recent-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <span className={`record-tag ${r.type}`}>
                    {r.type === 'expense' ? '支' : '收'}
                  </span>
                  <div className="home-recent-info">
                    <div className="record-cat">
                      {r.major} · {r.minor}
                    </div>
                    <div className="record-sub">
                      {r.date}
                      {r.note ? ` · ${r.note}` : ''}
                    </div>
                  </div>
                  <span className={`record-amount ${r.type}`}>
                    {r.type === 'expense' ? '-' : '+'}¥{fmt(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
