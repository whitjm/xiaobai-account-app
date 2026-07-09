import { useEffect, useState, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Home from './components/Home.jsx'
import RecordForm from './components/RecordForm.jsx'
import RecordList from './components/RecordList.jsx'
import Summary from './components/Summary.jsx'
import FilterBar from './components/FilterBar.jsx'
import Stats from './components/Stats.jsx'
import DataTools from './components/DataTools.jsx'
import CategoryManager from './components/CategoryManager.jsx'
import { computeRange, shiftAnchor, inRange, fmt } from './utils/dateRange.js'

// 左侧菜单栏布局:首页 / 记账 / 统计 / 编辑记录 / 分类管理。
export default function App() {
  const [categories, setCategories] = useState(null)
  const [records, setRecords] = useState([])
  const [editing, setEditing] = useState(null) // 正在编辑的记录,null 表示无
  const [page, setPage] = useState('home') // 当前页
  const [savedTip, setSavedTip] = useState('') // 记账成功提示

  // 时间筛选状态(供统计页、编辑记录页用)
  const [mode, setMode] = useState('month')
  const [anchor, setAnchor] = useState(new Date())
  const [customStart, setCustomStart] = useState(new Date())
  const [customEnd, setCustomEnd] = useState(new Date())

  const refresh = useCallback(async () => {
    const recs = await window.api.getRecords()
    setRecords(recs)
  }, [])

  const refreshCategories = useCallback(async () => {
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

  async function handleSave(record) {
    if (record.id) await window.api.updateRecord(record)
    else await window.api.addRecord(record)
    await refresh()
    if (editing) {
      // 编辑完成:退出编辑态,留在编辑记录页
      setEditing(null)
    } else {
      // 新增完成:给个提示
      setSavedTip('已记录一笔')
      setTimeout(() => setSavedTip(''), 2200)
    }
  }

  async function handleDelete(id) {
    await window.api.deleteRecord(id)
    await refresh()
  }

  // 点击列表里的"编辑":进入编辑态并切到编辑记录页
  function handleEdit(record) {
    setEditing(record)
    setPage('edit')
  }

  // 切换菜单时,离开编辑记录页则取消未完成的编辑
  function changePage(next) {
    if (next !== 'edit') setEditing(null)
    setPage(next)
  }

  if (!categories) return <p className="loading">正在加载…</p>

  const filterBar = (
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
  )

  return (
    <div className="layout">
      <Sidebar page={page} onChange={changePage} />

      <main className="content">
        {page === 'home' && <Home records={records} onNavigate={changePage} />}

        {page === 'record' && (
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
        )}

        {page === 'stats' && (
          <div className="page">
            <h2 className="page-title">统计</h2>
            {filterBar}
            <Summary summary={summary} />
            <Stats records={filtered} />
          </div>
        )}

        {page === 'edit' && (
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
            {filterBar}
            <Summary summary={summary} />
            <DataTools onChanged={refresh} />
            <RecordList records={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        )}

        {page === 'category' && (
          <div className="page">
            <h2 className="page-title">分类管理</h2>
            <CategoryManager categories={categories} onChanged={refreshCategories} />
          </div>
        )}
      </main>
    </div>
  )
}
