// 对 electron/queries.js 里的核心零件做单元测试。
// 做法:用真实的数据库模块(db.js),但让它把数据建在一个"临时文件夹"里,
// 而不是用户真实的账本 xiaobai.db。这样测的是真代码、真数据库,
// 又绝对不会碰到用户的真实数据;测完把临时文件夹删掉。
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const { initDb, getDb } = require('../electron/db')
const {
  rowsToObjects,
  addCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  addRecord,
  getRecords,
  updateRecord,
  deleteRecord,
} = require('../electron/queries')

let tmpDir

beforeAll(async () => {
  // 建一个临时文件夹,让数据库文件生成在这里(不碰用户真实账本)
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaobai-test-'))
  await initDb(tmpDir)
})

afterAll(() => {
  // 清理临时文件夹
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    /* 忽略清理失败 */
  }
})

beforeEach(() => {
  // 每条测试前:清空账目、清掉上一条测试自建的分类(保留预置分类)
  const db = getDb()
  db.run('DELETE FROM records')
  db.run('DELETE FROM categories WHERE is_preset=0')
})

// ========== 零件一:rowsToObjects(整理数据格式,纯逻辑) ==========
describe('rowsToObjects:把数据库原始结果整理成好用的对象数组', () => {
  it('正常情况:两列两行,应转成两个对象', () => {
    const fake = [{ columns: ['id', 'name'], values: [[1, '餐饮'], [2, '交通']] }]
    expect(rowsToObjects(fake)).toEqual([
      { id: 1, name: '餐饮' },
      { id: 2, name: '交通' },
    ])
  })

  it('边界情况:查询结果为空,应返回空数组', () => {
    expect(rowsToObjects([])).toEqual([])
  })
})


// ========== 零件三:addCategory(新增分类,含校验) ==========
describe('addCategory:新增用户自建分类', () => {
  it('正常情况:填了大类和小类,应添加成功', () => {
    expect(addCategory({ type: 'expense', major: '宠物', minor: '猫粮' })).toEqual({ ok: true })
    const rows = rowsToObjects(
      getDb().exec("SELECT major, minor, is_preset FROM categories WHERE major='宠物'")
    )
    expect(rows).toEqual([{ major: '宠物', minor: '猫粮', is_preset: 0 }])
  })

  it('异常情况:小类留空,应被拒绝', () => {
    const r = addCategory({ type: 'expense', major: '宠物', minor: '' })
    expect(r.ok).toBe(false)
  })

  it('异常情况:添加完全重复的分类,应被拒绝', () => {
    addCategory({ type: 'expense', major: '宠物', minor: '猫粮' })
    const r = addCategory({ type: 'expense', major: '宠物', minor: '猫粮' })
    expect(r.ok).toBe(false)
  })
})

// ========== 零件四:updateCategory(改分类,预置的不许改) ==========
describe('updateCategory:修改分类名称', () => {
  it('正常情况:改用户自建分类的名字,应成功', () => {
    addCategory({ type: 'expense', major: '宠物', minor: '猫粮' })
    const id = rowsToObjects(getDb().exec("SELECT id FROM categories WHERE minor='猫粮'"))[0].id
    expect(updateCategory({ id, major: '宠物', minor: '狗粮' })).toEqual({ ok: true })
  })

  it('异常情况:预置分类不能改', () => {
    // 取一条预置分类(seed 灌入的),尝试修改应被拒绝
    const id = rowsToObjects(getDb().exec('SELECT id FROM categories WHERE is_preset=1 LIMIT 1'))[0].id
    const r = updateCategory({ id, major: '随便', minor: '改改看' })
    expect(r.ok).toBe(false)
  })
})

// ========== 零件五:deleteCategory(删分类,预置的不许删) ==========
describe('deleteCategory:删除分类', () => {
  it('正常情况:删用户自建分类,应成功', () => {
    addCategory({ type: 'expense', major: '宠物', minor: '猫粮' })
    const id = rowsToObjects(getDb().exec("SELECT id FROM categories WHERE minor='猫粮'"))[0].id
    expect(deleteCategory(id)).toEqual({ ok: true })
    expect(rowsToObjects(getDb().exec("SELECT id FROM categories WHERE minor='猫粮'"))).toEqual([])
  })

  it('异常情况:预置分类不能删', () => {
    const id = rowsToObjects(getDb().exec('SELECT id FROM categories WHERE is_preset=1 LIMIT 1'))[0].id
    const r = deleteCategory(id)
    expect(r.ok).toBe(false)
  })
})

// ========== 零件六:getCategories(读取分类,组织成层级结构) ==========
describe('getCategories:把分类整理成 支出/收入 → 大类 → 小类', () => {
  it('返回结构含 expense 和 income 两组', () => {
    const g = getCategories()
    expect(Array.isArray(g.expense)).toBe(true)
    expect(Array.isArray(g.income)).toBe(true)
  })

  it('预置分类里"餐饮"大类下应挂着"午餐"小类', () => {
    const g = getCategories()
    const food = g.expense.find((x) => x.major === '餐饮')
    expect(food).toBeTruthy()
    expect(food.minors.map((m) => m.name)).toContain('午餐')
  })

  it('自建的分类,preset 标记应为 false', () => {
    addCategory({ type: 'expense', major: '宠物', minor: '猫粮' })
    const g = getCategories()
    const pet = g.expense.find((x) => x.major === '宠物')
    expect(pet.minors[0].preset).toBe(false)
  })
})

// ========== 零件七:addRecord / getRecords(记一笔账、读账目) ==========
describe('addRecord + getRecords:记账与读取', () => {
  it('记一笔账后,应能读到这笔账,内容一致', () => {
    addRecord({ type: 'expense', amount: 25.5, major: '餐饮', minor: '午餐', date: '2026-07-10', note: '和朋友吃饭' })
    const rows = getRecords()
    expect(rows.length).toBe(1)
    expect(rows[0]).toMatchObject({
      type: 'expense', amount: 25.5, major: '餐饮', minor: '午餐', date: '2026-07-10', note: '和朋友吃饭',
    })
  })

  it('备注可以不填,应存成空字符串', () => {
    addRecord({ type: 'income', amount: 100, major: '工资', minor: '月薪', date: '2026-07-01' })
    expect(getRecords()[0].note).toBe('')
  })

  it('多笔账目应按日期倒序(最新的在最上面)', () => {
    addRecord({ type: 'expense', amount: 10, major: '餐饮', minor: '早餐', date: '2026-07-01' })
    addRecord({ type: 'expense', amount: 20, major: '餐饮', minor: '晚餐', date: '2026-07-05' })
    const rows = getRecords()
    expect(rows[0].date).toBe('2026-07-05')
    expect(rows[1].date).toBe('2026-07-01')
  })
})

// ========== 零件八:updateRecord(修改一笔账) ==========
describe('updateRecord:修改账目', () => {
  it('改金额和备注后,读出来应是新值', () => {
    addRecord({ type: 'expense', amount: 25, major: '餐饮', minor: '午餐', date: '2026-07-10', note: '旧' })
    const id = getRecords()[0].id
    updateRecord({ id, type: 'expense', amount: 88, major: '餐饮', minor: '晚餐', date: '2026-07-10', note: '新' })
    const row = getRecords()[0]
    expect(row.amount).toBe(88)
    expect(row.minor).toBe('晚餐')
    expect(row.note).toBe('新')
  })
})

// ========== 零件九:deleteRecord(删除一笔账) ==========
describe('deleteRecord:删除账目', () => {
  it('删掉后,列表里应该没有这笔账了', () => {
    addRecord({ type: 'expense', amount: 25, major: '餐饮', minor: '午餐', date: '2026-07-10' })
    const id = getRecords()[0].id
    deleteRecord(id)
    expect(getRecords().length).toBe(0)
  })
})
