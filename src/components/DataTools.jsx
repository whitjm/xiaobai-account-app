import { useState } from 'react'

// 数据管理工具条:导出 Excel、备份数据、恢复数据、导入 Excel。
// onChanged 在数据发生变化(恢复/导入)后调用,通知主界面刷新。
export default function DataTools({ onChanged }) {
  const [msg, setMsg] = useState('') // 操作结果提示
  const [busy, setBusy] = useState(false)

  function show(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  async function run(fn) {
    setBusy(true)
    try {
      return await fn()
    } finally {
      setBusy(false)
    }
  }

  async function handleExportExcel() {
    const r = await run(() => window.api.exportExcel())
    if (r.ok) show(`已导出 ${r.count} 笔账目到 Excel`)
    else if (!r.canceled) show('导出失败')
  }

  async function handleBackup() {
    const r = await run(() => window.api.backupData())
    if (r.ok) show(`已备份 ${r.count} 笔账目`)
    else if (!r.canceled) show('备份失败')
  }

  async function handleRestore() {
    const ok = window.confirm(
      '恢复数据会用备份文件里的账目【替换】当前所有账目,当前数据将被覆盖。确定继续吗?'
    )
    if (!ok) return
    const r = await run(() => window.api.restoreData())
    if (r.ok) {
      show(`已恢复 ${r.count} 笔账目`)
      onChanged?.()
    } else if (r.error) {
      show(r.error)
    } else if (!r.canceled) {
      show('恢复失败')
    }
  }

  async function handleImportExcel() {
    const r = await run(() => window.api.importExcel())
    if (r.ok) {
      const skip = r.skipped ? `,跳过 ${r.skipped} 行无效数据` : ''
      show(`成功导入 ${r.imported} 笔${skip}`)
      onChanged?.()
    } else if (r.error) {
      show(r.error)
    } else if (!r.canceled) {
      show('导入失败')
    }
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
      {msg && <span className="data-tools-msg">{msg}</span>}
    </div>
  )
}
