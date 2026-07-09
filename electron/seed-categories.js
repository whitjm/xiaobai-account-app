// 默认分类数据:软件首次运行时灌入,开箱即用。
// 已由用户确认(2026-07-08)。结构:type(支出/收入)→ major(大类)→ minor 列表(小类)。

const DEFAULT_CATEGORIES = {
  expense: [
    { major: '餐饮', minors: ['早餐', '午餐', '晚餐', '饮料零食', '下馆子'] },
    { major: '交通', minors: ['公交地铁', '打车', '加油', '停车', '火车飞机'] },
    { major: '购物', minors: ['日用品', '服饰鞋包', '数码电器', '化妆护肤'] },
    { major: '居住', minors: ['房租', '水电燃气', '物业', '宽带话费'] },
    { major: '娱乐', minors: ['电影演出', '游戏', '旅游', '运动健身'] },
    { major: '医疗', minors: ['看病', '买药', '体检'] },
    { major: '人情', minors: ['请客送礼', '红包', '孝敬长辈'] },
    { major: '学习', minors: ['书籍', '课程', '文具'] },
    { major: '其他', minors: ['其他支出'] },
  ],
  income: [
    { major: '工资', minors: ['月薪', '奖金', '补贴'] },
    { major: '兼职', minors: ['兼职收入', '外快'] },
    { major: '投资', minors: ['利息', '分红', '理财收益'] },
    { major: '人情', minors: ['收红包', '他人还款'] },
    { major: '其他', minors: ['退款', '意外之财', '其他收入'] },
  ],
}

// 只在分类表为空时灌入,避免用户后续自定义的分类被覆盖
function seedDefaultCategories(db) {
  const result = db.exec('SELECT COUNT(*) AS n FROM categories')
  const count = result.length ? result[0].values[0][0] : 0
  if (count > 0) return

  let sort = 0
  for (const type of ['expense', 'income']) {
    for (const group of DEFAULT_CATEGORIES[type]) {
      for (const minor of group.minors) {
        db.run(
          'INSERT INTO categories (type, major, minor, sort) VALUES (?, ?, ?, ?)',
          [type, group.major, minor, sort++]
        )
      }
    }
  }
}

module.exports = { seedDefaultCategories, DEFAULT_CATEGORIES }
