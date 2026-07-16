import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import ErrorBoundary from './components/ErrorBoundary'
import { computeRange, shiftAnchor, inRange, fmt } from './utils/dateRange'
import type { RecordEntry, Categories, DateRangeMode } from './types'
import './styles.css'

// 懒加载各页面组件
const Home = lazy(() => import('./components/Home'))
const RecordForm = lazy(() => import('./components/RecordForm'))
const RecordList = lazy(() => import('./components/RecordList'))
const Summary = lazy(() => import('./components/Summary'))
const FilterBar = lazy(() => import('./components/FilterBar'))
const Stats = lazy(() => import('./components/Stats'))
const DataTools = lazy(() => import('./components/DataTools'))
const CategoryManager = lazy(() => import('./components/CategoryManager'))
const ChatPanel = lazy(() => import('./components/ChatPanel'))
const Settings = lazy(() => import('./components/Settings'))

// 左侧菜单栏布局:首页 / 记账 / 统计 / 编辑记录 / 分类管理。
export default function App() {
  const [categories, setCategories] = useState<Categories | null>(null)
  const [records, setRecords] = useState<RecordEntry[]>([])
  const [editing, setEditing] = useState<RecordEntry | null>(null) // 正在编辑的记录,null 表示无
  const [page, setPage] = useState<string>('home') // 当前页
  const [savedTip, setSavedTip] = useState('') // 记账成功提示

  // 时间筛选状态(供统计页、编辑记录页用)
  const [mode, setMode] = useState<DateRangeMode | 'custom'>('month')
  const [anchor, setAnchor] = useState(new Date())
  const [customStart, setCustomStart] = useState(new Date())
  const [customEnd, setCustomEnd] = useState(new Date())

  const refresh = useCallback(async () => {
    if (!window.api) return
    const recs = await window.api.getRecords()
    setRecords(recs)
  }, [])

  const refreshCategories = useCallback(async () => {
    if (!window.api) return
    const cats = await window.api.getCategories()
    setCategories(cats)
  }, [])

  useEffect(() => {
    refreshCategories()
    refresh()
  }, [refresh, refreshCategories])

  const range = useMemo(() => {
    if (mode === 'custom') {
      return { start: fmt(customStart), end: fmt(customEnd) }
    }
    return computeRange(mode, anchor)
  }, [mode, anchor, customStart, customEnd])

  const filtered = useMemo(
    () => records.filter((r) => inRange(r.date, range)),
    [records, range]
  )

  const summary = useMemo(() => {
    let expense = 0
    let income = 0
    for (const r of filtered) {
      if (r.type === 'expense') expense += r.amount
      else if (r.type === 'income') income += r.amount
    }
    return { expense, income, balance: income - expense }
  }, [filtered])

  async function handleSave(record: RecordEntry) {
    if (record.id) await window.api.updateRecord(record)
    else await window.api.addRecord(record)
    await refresh()
    if (editing) {
      setEditing(null)
    } else {
      setSavedTip('已记录一笔')
      setTimeout(() => setSavedTip(''), 2200)
    }
  }

  async function handleDelete(id: number) {
    await window.api.deleteRecord(id)
    await refresh()
  }

  function handleEdit(record: RecordEntry) {
    setEditing(record)
    setPage('edit')
  }

  function changePage(next: string) {
    if (next !== 'edit') setEditing(null)
    setPage(next)
  }

  const pageContent = () => {
    switch (page) {
      case 'home':
        return <Home records={records} onNavigate={changePage} />
      case 'record':
        return (
          <div className="page page-record">
            <h2 className="page-title">记一笔</h2>
            <div className="record-grid">
              <div className="record-form-wrap">
                <RecordForm
                  categories={categories}
                  editing={null}
                  onSave={handleSave}
                  onCancel={() => {}}
                />
              </div>
              <RecordList
                records={records.slice(0, 12)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                title="刚记的账"
                emptyTip="记下的账会立刻出现在这里 ✍️"
              />
            </div>
            {savedTip && (
              <div className="save-toast">
                <span className="save-toast-check">✓</span>
                <span>{savedTip}</span>
              </div>
            )}
          </div>
        )
      case 'stats':
        return (
          <div className="page">
            <h2 className="page-title">统计</h2>
            <FilterBar
              mode={mode}
              anchor={anchor}
              customStart={customStart}
              customEnd={customEnd}
              onModeChange={(m) => {
                setMode(m)
                if (m !== 'custom') setAnchor(new Date())
              }}
              onShift={(step) => setAnchor((a) => shiftAnchor(mode as DateRangeMode, a, step))}
              onCustomChange={(s, e) => {
                if (s) setCustomStart(s)
                if (e) setCustomEnd(e)
              }}
            />
            <Summary summary={summary} />
            <Stats records={filtered} />
          </div>
        )
      case 'edit':
        return (
          <div className="page">
            <h2 className="page-title">编辑记录</h2>
            {editing && (
              <div className="edit-form-panel">
                <RecordForm
                  categories={categories}
                  editing={editing}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                />
              </div>
            )}
            <FilterBar
              mode={mode}
              anchor={anchor}
              customStart={customStart}
              customEnd={customEnd}
              onModeChange={(m) => {
                setMode(m)
                if (m !== 'custom') setAnchor(new Date())
              }}
              onShift={(step) => setAnchor((a) => shiftAnchor(mode as DateRangeMode, a, step))}
              onCustomChange={(s, e) => {
                if (s) setCustomStart(s)
                if (e) setCustomEnd(e)
              }}
            />
            <Summary summary={summary} />
            <DataTools onChanged={refresh} />
            <RecordList records={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        )
      case 'category':
        return (
          <div className="page">
            <h2 className="page-title">分类管理</h2>
            <CategoryManager categories={categories} onChanged={refreshCategories} />
          </div>
        )
      case 'ai':
        return (
          <div className="page page-ai">
            <h2 className="page-title">🤖 AI 助手</h2>
            <ChatPanel onSaveRecord={handleSave} onRefresh={refresh} />
          </div>
        )
      case 'settings':
        return (
          <div className="page page-settings">
            <h2 className="page-title">⚙️ 设置</h2>
            <Settings />
          </div>
        )
      default:
        return null
    }
  }

  if (!categories) return <p className="loading">正在加载…</p>

  return (
    <ErrorBoundary>
      <div className="layout">
        <Sidebar page={page} onChange={changePage} />

        <main className="content">
          <Suspense fallback={<div className="loading">加载中...</div>}>
            {pageContent()}
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  )
}
