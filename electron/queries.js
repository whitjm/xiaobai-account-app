// 数据查询模块:封装对数据库的读写操作,供主进程通过 IPC 调用。
// 阶段 2 先实现分类的读取;阶段 3 会在这里补上账目的增删改查。
const { getDb } = require('./db')

// 把 sql.js 的查询结果转成好用的对象数组
function rowsToObjects(result) {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

// 读取所有分类,按"支出/收入 → 大类 → 小类"的层级结构组织好返回给界面
function getCategories() {
  const db = getDb()
  const result = db.exec('SELECT type, major, minor FROM categories ORDER BY sort ASC')
  const rows = rowsToObjects(result)

  // 组织成 { expense: [{major, minors:[]}], income: [...] }
  const grouped = { expense: [], income: [] }
  for (const row of rows) {
    const bucket = grouped[row.type]
    if (!bucket) continue
    let group = bucket.find((g) => g.major === row.major)
    if (!group) {
      group = { major: row.major, minors: [] }
      bucket.push(group)
    }
    group.minors.push(row.minor)
  }
  return grouped
}

module.exports = { getCategories, rowsToObjects, addRecord, getRecords, updateRecord, deleteRecord, getSummary }

// ============ 账目的增删改查 ============

const { save } = require('./db')

// 新增一笔账目。record: { type, amount, major, minor, date, note }
function addRecord(record) {
  const db = getDb()
  const createdAt = new Date().toISOString()
  db.run(
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
function getRecords() {
  const db = getDb()
  const result = db.exec(
    `SELECT id, type, amount, major, minor, date, note
     FROM records
     ORDER BY date DESC, created_at DESC`
  )
  return rowsToObjects(result)
}

// 修改一笔账目
function updateRecord(record) {
  const db = getDb()
  db.run(
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
function deleteRecord(id) {
  const db = getDb()
  db.run('DELETE FROM records WHERE id=?', [id])
  save()
  return { ok: true }
}

// 合计:总支出、总收入、结余
function getSummary() {
  const db = getDb()
  const result = db.exec(
    `SELECT type, COALESCE(SUM(amount), 0) AS total FROM records GROUP BY type`
  )
  const rows = rowsToObjects(result)
  let expense = 0
  let income = 0
  for (const row of rows) {
    if (row.type === 'expense') expense = row.total
    if (row.type === 'income') income = row.total
  }
  return { expense, income, balance: income - expense }
}
