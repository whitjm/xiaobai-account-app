// 数据库模块:用 sql.js(纯 JS 版 SQLite)在本地文件里存账目和分类。
// sql.js 在内存中操作数据库,因此每次写入后都把数据落盘到用户数据目录的 xiaobai.db 文件,
// 保证关掉软件数据不丢。
import path from 'path'
import fs from 'fs'
import initSqlJs from 'sql.js'
import { seedDefaultCategories } from './seed-categories'

let SQL: typeof import('sql.js') | null = null // sql.js 引擎(异步初始化一次)
let db: import('sql.js').Database | null = null // 当前数据库实例
let dbFilePath = '' // 数据库文件在硬盘上的路径

// 初始化数据库:定位文件、加载引擎，建表、灌入默认分类
export async function initDb(userDataDir: string): Promise<void> {
  // 确保数据目录存在(首次运行时可能还没创建)
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true })
  }
  dbFilePath = path.join(userDataDir, 'xiaobai.db')

  // 加载 sql.js 引擎。直接把 wasm 引擎文件读成二进制喂给它,
  // 这样无论开发模式还是打包后(代码被压进 asar 压缩包)都能稳定找到,避免路径问题。
  const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const wasmBinary = fs.readFileSync(wasmPath)
  SQL = await initSqlJs({ wasmBinary })

  // 若已有数据库文件则读入,否则新建空库
  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  createTables()
  seedDefaultCategories(db!)
  save()
}

// 建表:分类表 + 账目表
function createTables(): void {
  db!.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,              -- 'expense'(支出) 或 'income'(收入)
      major TEXT NOT NULL,             -- 一级大类名称
      minor TEXT NOT NULL,             -- 二级小类名称
      sort INTEGER DEFAULT 0,          -- 排序用
      is_preset INTEGER DEFAULT 0      -- 1=软件预置(不可改删) 0=用户自建(可改删)
    );
  `)

  // 兼容老数据库:早期版本的 categories 表没有 is_preset 列。
  // 若缺列则补上,并把已有分类(都是预置的)统一标记为预置,避免被误当成用户分类。
  const cols = db!.exec('PRAGMA table_info(categories)')
  const colNames = cols.length ? cols[0].values.map((r) => r[1] as string) : []
  if (!colNames.includes('is_preset')) {
    db!.run('ALTER TABLE categories ADD COLUMN is_preset INTEGER DEFAULT 0')
    db!.run('UPDATE categories SET is_preset = 1')
  }

  db!.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,              -- 'expense' 或 'income'
      amount REAL NOT NULL,            -- 金额(元)
      major TEXT NOT NULL,             -- 一级大类
      minor TEXT NOT NULL,             -- 二级小类
      date TEXT NOT NULL,              -- 日期 YYYY-MM-DD
      note TEXT DEFAULT '',            -- 备注
      created_at TEXT NOT NULL         -- 记录创建时间
    );
  `)
}

// 把内存数据库写回硬盘
export function save(): void {
  const data = db!.export()
  fs.writeFileSync(dbFilePath, Buffer.from(data))
}

// 获取数据库实例
export function getDb(): import('sql.js').Database | null {
  return db
}
