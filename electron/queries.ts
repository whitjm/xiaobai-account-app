// 数据查询模块:封装对数据库的读写操作,供主进程通过 IPC 调用。
import { getDb, save } from './db'

// sql.js查询结果类型
interface QueryResult {
  columns: string[]
  values: unknown[][]
}

// 把 sql.js 的查询结果转成好用的对象数组
export function rowsToObjects(result: QueryResult[]): Record<string, unknown>[] {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

// 读取所有分类,按"支出/收入 → 大类 → 小类"的层级结构组织好返回给记账表单。
// 每个小类带上 id 和 preset(是否预置),方便分类管理页判断能不能改删。
export function getCategories() {
  const db = getDb()
  const result = db!.exec('SELECT id, type, major, minor, is_preset FROM categories ORDER BY sort ASC, id ASC')
  const rows = rowsToObjects(result)

  // 组织成 { expense: [{major, minors:[{id, name, preset}]}], income: [...] }
  const grouped: Record<string, { major: string; minors: { id: number; name: string; preset: boolean }[] }[]> = {
    expense: [],
    income: [],
  }
  for (const row of rows) {
    const bucket = grouped[row.type as string]
    if (!bucket) continue
    let group = bucket.find((g) => g.major === row.major)
    if (!group) {
      group = { major: row.major as string, minors: [] }
      bucket.push(group)
    }
    group.minors.push({ id: row.id as number, name: row.minor as string, preset: row.is_preset === 1 })
  }
  return grouped
}

// —— 新增一个分类(小类)。cat: { type, major, minor } ——
export function addCategory(cat: { type: string; major: string; minor: string }): { ok: boolean; error?: string } {
  const db = getDb()
  const type = cat.type === 'income' ? 'income' : 'expense'
  const major = String(cat.major || '').trim()
  const minor = String(cat.minor || '').trim()
  if (!major || !minor) return { ok: false, error: '大类和小类都要填写' }

  const dup = rowsToObjects(
    db!.exec('SELECT id FROM categories WHERE type=? AND major=? AND minor=?', [type, major, minor])
  )
  if (dup.length) return { ok: false, error: '这个分类已经存在了' }

  const maxRow = rowsToObjects(db!.exec('SELECT COALESCE(MAX(sort), 0) AS m FROM categories'))
  const nextSort = ((maxRow[0]?.m as number) || 0) + 1
  db!.run('INSERT INTO categories (type, major, minor, sort, is_preset) VALUES (?, ?, ?, ?, 0)', [
    type,
    major,
    minor,
    nextSort,
  ])
  save()
  return { ok: true }
}

// —— 修改分类名称。cat: { id, major, minor } —— 只能改用户自建的分类。
export function updateCategory(cat: { id: number; major: string; minor: string }): { ok: boolean; error?: string } {
  const db = getDb()
  const rows = rowsToObjects(db!.exec('SELECT type, is_preset FROM categories WHERE id=?', [cat.id]))
  if (!rows.length) return { ok: false, error: '找不到这个分类' }
  if (rows[0].is_preset === 1) return { ok: false, error: '预置分类不能修改' }

  const major = String(cat.major || '').trim()
  const minor = String(cat.minor || '').trim()
  if (!major || !minor) return { ok: false, error: '大类和小类都要填写' }

  const dup = rowsToObjects(
    db!.exec('SELECT id FROM categories WHERE type=? AND major=? AND minor=? AND id<>?', [
      rows[0].type,
      major,
      minor,
      cat.id,
    ])
  )
  if (dup.length) return { ok: false, error: '这个分类已经存在了' }

  db!.run('UPDATE categories SET major=?, minor=? WHERE id=?', [major, minor, cat.id])
  save()
  return { ok: true }
}

// —— 删除分类 —— 只能删用户自建的分类。
export function deleteCategory(id: number): { ok: boolean; error?: string } {
  const db = getDb()
  const rows = rowsToObjects(db!.exec('SELECT is_preset FROM categories WHERE id=?', [id]))
  if (!rows.length) return { ok: false, error: '找不到这个分类' }
  if (rows[0].is_preset === 1) return { ok: false, error: '预置分类不能删除' }

  db!.run('DELETE FROM categories WHERE id=?', [id])
  save()
  return { ok: true }
}

// ============ 账目的增删改查 ============

// 新增一笔账目。record: { type, amount, major, minor, date, note }
export function addRecord(record: {
  type: string
  amount: number
  major: string
  minor: string
  date: string
  note?: string
}): { ok: boolean; error?: string } {
  const db = getDb()
  const createdAt = new Date().toISOString()
  db!.run(
    `INSERT INTO records (type, amount, major, minor, date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      record.type,
      record.amount,
      record.major,
      record.minor,
      record.date,
      record.note || '',
      createdAt,
    ]
  )
  save()
  return { ok: true }
}

// 读取所有账目,按日期倒序(最新的在最上面),同日期按创建时间倒序
export function getRecords() {
  const db = getDb()
  const result = db!.exec(
    `SELECT id, type, amount, major, minor, date, note
     FROM records
     ORDER BY date DESC, created_at DESC`
  )
  return rowsToObjects(result)
}

// 修改一笔账目
export function updateRecord(record: {
  id: number
  type: string
  amount: number
  major: string
  minor: string
  date: string
  note?: string
}): { ok: boolean; error?: string } {
  const db = getDb()
  db!.run(
    `UPDATE records SET type=?, amount=?, major=?, minor=?, date=?, note=?
     WHERE id=?`,
    [
      record.type,
      record.amount,
      record.major,
      record.minor,
      record.date,
      record.note || '',
      record.id,
    ]
  )
  save()
  return { ok: true }
}

// 删除一笔账目
export function deleteRecord(id: number): { ok: boolean; error?: string } {
  const db = getDb()
  db!.run('DELETE FROM records WHERE id=?', [id])
  save()
  return { ok: true }
}

// 合计:总支出、总收入、结余
export function getSummary(): { expense: number; income: number; balance: number } {
  const db = getDb()
  const result = db!.exec(`SELECT type, COALESCE(SUM(amount), 0) AS total FROM records GROUP BY type`)
  const rows = rowsToObjects(result)
  let expense = 0
  let income = 0
  for (const row of rows) {
    if (row.type === 'expense') expense = row.total as number
    if (row.type === 'income') income = row.total as number
  }
  return { expense, income, balance: income - expense }
}
