import { useEffect, useState, useCallback, useMemo } from 'react'
import RecordForm from './components/RecordForm.jsx'
import RecordList from './components/RecordList.jsx'
import Summary from './components/Summary.jsx'
import FilterBar from './components/FilterBar.jsx'
import Stats from './components/Stats.jsx'
import DataTools from './components/DataTools.jsx'
import { computeRange, shiftAnchor, inRange, fmt } from './utils/dateRange.js'

// 阶段 3:完整记账功能 + 时间筛选(周/月/年/全部/自定义日历)。
export default function App() {
  const [categories, setCategories] = useState(null)
  const [records, setRecords] = useState([])
  const [editing, setEditing] = useState(null) // 正在编辑的记录,null 表示新增模式
  const [tab, setTab] = useState('record') // 'record' 记账页 / 'stats' 统计页

  // 时间筛选状态
  const [mode, setMode] = useState('month') // 默认看本月
  const [anchor, setAnchor] = useState(new Date()) // 周/月/年翻页的基准日
  const [customStart, setCustomStart] = useState(new Date())
  const [customEnd, setCustomEnd] = useState(new Date())

  // 重新拉取账目列表
  const refresh = useCallback(async () => {
    const recs = await window.api.getRecords()
    setRecords(recs)
  }, [])

  useEffect(() => {
    window.api.getCategories().then(setCategories)
    refresh()
  }, [refresh])

  // 当前选定的时间范围 { start, end } 或 null(全部)
  const range = useMemo(() => {
    if (mode === 'custom') {
      return { start: fmt(customStart), end: fmt(customEnd) }
    }
    return computeRange(mode, anchor)
  }, [mode, anchor, customStart, customEnd])

  // 按时间范围过滤后的记录
  const filtered = useMemo(
    () => records.filter((r) => inRange(r.date, range)),
    [records, range]
  )

  // 合计跟着过滤结果算
  const summary = useMemo(() => {
    let expense = 0
    let income = 0
    for (const r of filtered) {
      if (r.type === 'expense') expense += r.amount
      else if (r.type === 'income') income += r.amount
    }
    return { expense, income, balance: income - expense }
  }, [filtered])

  async function handleSave(record) {
    if (record.id) await window.api.updateRecord(record)
    else await window.api.addRecord(record)
    setEditing(null)
    await refresh()
  }

  async function handleDelete(id) {
    await window.api.deleteRecord(id)
    await refresh()
  }

  if (!categories) return <p className="loading">正在加载…</p>

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">💰</span>
        <h1>小白记账</h1>
        <nav className="app-tabs">
          <button
            className={tab === 'record' ? 'active' : ''}
            onClick={() => setTab('record')}
          >
            记账
          </button>
          <button
            className={tab === 'stats' ? 'active' : ''}
            onClick={() => setTab('stats')}
          >
            统计
          </button>
        </nav>
      </header>

      <DataTools onChanged={refresh} />

      <FilterBar
        mode={mode}
        anchor={anchor}
        customStart={customStart}
        customEnd={customEnd}
        onModeChange={(m) => {
          setMode(m)
          if (m !== 'custom') setAnchor(new Date())
        }}
        onShift={(step) => setAnchor((a) => shiftAnchor(mode, a, step))}
        onCustomChange={(s, e) => {
          if (s) setCustomStart(s)
          if (e) setCustomEnd(e)
        }}
      />

      <Summary summary={summary} />

      {tab === 'record' ? (
        <div className="main-grid">
          <RecordForm
            categories={categories}
            editing={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
          <RecordList records={filtered} onEdit={setEditing} onDelete={handleDelete} />
        </div>
      ) : (
        <Stats records={filtered} />
      )}
    </div>
  )
}
