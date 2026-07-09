import { useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

// 饼图配色
const COLORS = [
  '#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1',
]

// 统计页:饼图(分类占比)+ 折线图(每日趋势)。数据来自已按时间过滤的 records。
export default function Stats({ records }) {
  const [type, setType] = useState('expense') // 统计支出还是收入

  // 只看当前类型的记录
  const typed = useMemo(
    () => records.filter((r) => r.type === type),
    [records, type]
  )

  // 饼图数据:按大类汇总金额
  const pieData = useMemo(() => {
    const map = {}
    for (const r of typed) {
      map[r.major] = (map[r.major] || 0) + r.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
  }, [typed])

  // 折线图数据:按日期汇总金额,日期升序
  const lineData = useMemo(() => {
    const map = {}
    for (const r of typed) {
      map[r.date] = (map[r.date] || 0) + r.amount
    }
    return Object.entries(map)
      .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [typed])

  const total = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="stats">
      <div className="stats-toggle">
        <button
          className={type === 'expense' ? 'active expense' : ''}
          onClick={() => setType('expense')}
        >
          支出统计
        </button>
        <button
          className={type === 'income' ? 'active income' : ''}
          onClick={() => setType('income')}
        >
          收入统计
        </button>
      </div>

      {typed.length === 0 ? (
        <p className="empty-tip">这个时间段还没有{type === 'expense' ? '支出' : '收入'}记录</p>
      ) : (
        <div className="stats-charts">
          <div className="chart-card">
            <h3>各分类占比(合计 ¥{total.toFixed(2)})</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(e) => `${e.name} ${(e.percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `¥${v}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>金额趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={12} tickFormatter={(d) => d.slice(5)} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => `¥${v}`} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={type === 'expense' ? '#ef4444' : '#10b981'}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
