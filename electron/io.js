// 数据导入导出模块:
//  1) 导出 Excel(.xlsx):给用户自己看和整理,一行一笔账。
//  2) 备份数据(.json):完整备份,用于换电脑/重装后恢复。
//  3) 恢复数据(.json):从备份文件读回账目。
//  4) 导入 Excel(.xlsx):把 Excel 里的账目加进来。
const { dialog } = require('electron')
const fs = require('fs')
const XLSX = require('xlsx')
const { getDb, save } = require('./db')
const { getRecords, rowsToObjects } = require('./queries')

const TYPE_CN = { expense: '支出', income: '收入' }
const CN_TYPE = { 支出: 'expense', 收入: 'income' }

// 中文表头,方便用户在 Excel 里看懂
const HEADERS = ['类型', '金额', '大类', '小类', '日期', '备注']

// —— 导出 Excel ——
async function exportExcel() {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '导出为 Excel',
    defaultPath: `小白记账_${today()}.xlsx`,
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
  })
  if (canceled || !filePath) return { ok: false, canceled: true }

  const records = getRecords()
  const rows = records.map((r) => [
    TYPE_CN[r.type] || r.type,
    r.amount,
    r.major,
    r.minor,
    r.date,
    r.note || '',
  ])
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, '账目')
  XLSX.writeFile(book, filePath)
  return { ok: true, count: records.length, filePath }
}

// —— 备份数据(JSON)——
async function backupData() {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '备份数据',
    defaultPath: `小白记账_备份_${today()}.json`,
    filters: [{ name: '备份文件', extensions: ['json'] }],
  })
  if (canceled || !filePath) return { ok: false, canceled: true }

  const db = getDb()
  const records = rowsToObjects(db.exec('SELECT * FROM records'))
  const categories = rowsToObjects(db.exec('SELECT * FROM categories'))
  const payload = {
    app: '小白记账',
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
    categories,
  }
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return { ok: true, count: records.length, filePath }
}

// —— 恢复数据(JSON)——
// 用备份文件里的账目替换当前账目(会先确认)。分类保持不变。
async function restoreData() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择备份文件',
    properties: ['openFile'],
    filters: [{ name: '备份文件', extensions: ['json'] }],
  })
  if (canceled || !filePaths.length) return { ok: false, canceled: true }

  let data
  try {
    data = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'))
  } catch {
    return { ok: false, error: '文件格式不对,无法读取' }
  }
  if (!data || !Array.isArray(data.records)) {
    return { ok: false, error: '这不是有效的小白记账备份文件' }
  }

  const db = getDb()
  db.run('DELETE FROM records')
  for (const r of data.records) {
    db.run(
      `INSERT INTO records (type, amount, major, minor, date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        r.type,
        r.amount,
        r.major,
        r.minor,
        r.date,
        r.note || '',
        r.created_at || new Date().toISOString(),
      ]
    )
  }
  save()
  return { ok: true, count: data.records.length }
}

// —— 导入 Excel ——
// 读取 Excel 里的账目,追加到当前账目中(不删除已有数据)。
async function importExcel() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '选择要导入的 Excel',
    properties: ['openFile'],
    filters: [{ name: 'Excel 文件', extensions: ['xlsx', 'xls'] }],
  })
  if (canceled || !filePaths.length) return { ok: false, canceled: true }

  let rows
  try {
    const book = XLSX.readFile(filePaths[0])
    const sheet = book.Sheets[book.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  } catch {
    return { ok: false, error: '无法读取该 Excel 文件' }
  }

  const db = getDb()
  let imported = 0
  let skipped = 0
  // 跳过表头行(第一行),从第二行开始
  for (let i = 1; i < rows.length; i++) {
    const [typeCn, amount, major, minor, date, note] = rows[i]
    const type = CN_TYPE[String(typeCn).trim()] || null
    const amt = parseFloat(amount)
    // 基本校验:类型、金额、分类、日期都得有效,否则跳过这一行
    if (!type || isNaN(amt) || amt <= 0 || !major || !minor || !date) {
      skipped++
      continue
    }
    db.run(
      `INSERT INTO records (type, amount, major, minor, date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [type, amt, String(major), String(minor), normalizeDate(date), note ? String(note) : '', new Date().toISOString()]
    )
    imported++
  }
  save()
  return { ok: true, imported, skipped }
}

// 把 Excel 里可能是日期对象或各种写法的日期,规整成 YYYY-MM-DD
function normalizeDate(v) {
  if (v instanceof Date) return fmtDate(v)
  const s = String(v).trim()
  // already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!isNaN(d.getTime())) return fmtDate(d)
  return s
}

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function today() {
  return fmtDate(new Date())
}

module.exports = { exportExcel, backupData, restoreData, importExcel }
