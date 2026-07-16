import { useState } from 'react'

// 数据管理工具条:导出 Excel、备份数据、恢复数据、导入 Excel。
// onChanged 在数据发生变化(恢复/导入)后调用,通知主界面刷新。
interface DataToolsProps {
  onChanged?: () => void
}

interface ExportResult { count: number; filePath: string }
interface BackupResult { count: number; filePath: string }
interface RestoreResult { count: number }
interface ImportResult { imported: number; skipped: number }

export default function DataTools({ onChanged }: DataToolsProps) {
  const [msg, setMsg] = useState('') // 操作结果提示
  const [busy, setBusy] = useState(false)

  function show(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    setBusy(true)
    try {
      return await fn()
    } finally {
      setBusy(false)
    }
  }

  async function handleExportExcel() {
    const r = await run(() => window.api.exportExcel())
    if (r.ok && r.data) show(`已导出 ${r.data.count} 笔账目到 Excel`)
    else if (!r.canceled) show('导出失败')
  }

  async function handleBackup() {
    const r = await run(() => window.api.backupData())
    if (r.ok && r.data) show(`已备份 ${r.data.count} 笔账目`)
    else if (!r.canceled) show('备份失败')
  }

  async function handleRestore() {
    const ok = window.confirm(
      '恢复数据会用备份文件里的账目【替换】当前所有账目,当前数据将被覆盖。确定继续吗?'
    )
    if (!ok) return
    const r = await run(() => window.api.restoreData())
    if (r.ok && r.data) {
      show(`已恢复 ${r.data.count} 笔账目`)
      onChanged?.()
    } else if (r.error) {
      show(r.error)
    } else if (!r.canceled) {
      show('恢复失败')
    }
  }

  async function handleImportExcel() {
    const r = await run(() => window.api.importExcel())
    if (r.ok && r.data) {
      const skip = r.data.skipped ? `,跳过 ${r.data.skipped} 行无效数据` : ''
      show(`成功导入 ${r.data.imported} 笔${skip}`)
      onChanged?.()
    } else if (r.error) {
      show(r.error)
    } else if (!r.canceled) {
      show('导入失败')
    }
  }

  async function handleResetDatabase() {
    const ok = window.confirm(
      '⚠️ 确定要初始化数据库吗？\n\n这将清空所有账目记录，并重新灌入默认分类。\n此操作不可恢复，请先备份数据！'
    )
    if (!ok) return
    const doubleCheck = window.confirm('再次确认：清空所有账目？')
    if (!doubleCheck) return
    await run(async () => {
      await window.api.resetDatabase()
      // 同时清空向量库
      localStorage.removeItem('xiaobai_user_profiles')
      show('数据库已初始化，账目已清空，默认分类已灌入')
      onChanged?.()
    })
  }

  return (
    <div className="data-tools">
      <span className="data-tools-title">数据管理:</span>
      <button disabled={busy} onClick={handleExportExcel}>
        导出 Excel
      </button>
      <button disabled={busy} onClick={handleImportExcel}>
        导入 Excel
      </button>
      <button disabled={busy} onClick={handleBackup}>
        备份数据
      </button>
      <button disabled={busy} onClick={handleRestore}>
        恢复数据
      </button>
      <button disabled={busy} onClick={handleResetDatabase} className="btn-danger">
        初始化数据库
      </button>
      {msg && <span className="data-tools-msg">{msg}</span>}
    </div>
  )
}
