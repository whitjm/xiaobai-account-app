// 对 electron/seed-categories.js 做单元测试:默认分类的灌入逻辑。
// 用内存里的临时数据库测(sql.js 本就能在内存跑),不碰用户真实账本。
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { seedDefaultCategories, DEFAULT_CATEGORIES } = require('../electron/seed-categories')

let SQL
let db

function createTable(d) {
  d.run(`CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, major TEXT NOT NULL, minor TEXT NOT NULL,
    sort INTEGER DEFAULT 0, is_preset INTEGER DEFAULT 0
  );`)
}

function count(d) {
  const r = d.exec('SELECT COUNT(*) AS n FROM categories')
  return r.length ? r[0].values[0][0] : 0
}

// 默认分类应有的总条数(支出各小类 + 收入各小类)
function expectedTotal() {
  let n = 0
  for (const type of ['expense', 'income']) {
    for (const g of DEFAULT_CATEGORIES[type]) n += g.minors.length
  }
  return n
}

beforeAll(async () => {
  const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) })
})

beforeEach(() => {
  db = new SQL.Database()
  createTable(db)
})

describe('seedDefaultCategories:首次灌入默认分类', () => {
  it('空表首次灌入,条数应等于默认分类总数', () => {
    seedDefaultCategories(db)
    expect(count(db)).toBe(expectedTotal())
  })

  it('灌入的分类应全部标记为预置(is_preset=1)', () => {
    seedDefaultCategories(db)
    const r = db.exec('SELECT COUNT(*) AS n FROM categories WHERE is_preset=1')
    expect(r[0].values[0][0]).toBe(expectedTotal())
  })

  it('灌入后应能查到"餐饮/午餐"这条预置分类', () => {
    seedDefaultCategories(db)
    const r = db.exec("SELECT COUNT(*) AS n FROM categories WHERE major='餐饮' AND minor='午餐'")
    expect(r[0].values[0][0]).toBe(1)
  })

  it('表里已有数据时,不应重复灌入(避免覆盖用户分类)', () => {
    db.run("INSERT INTO categories (type, major, minor, is_preset) VALUES ('expense','宠物','猫粮',0)")
    seedDefaultCategories(db)
    expect(count(db)).toBe(1) // 还是只有那 1 条,没被灌入默认分类
  })
})
