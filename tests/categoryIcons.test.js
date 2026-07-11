// 对 src/utils/categoryIcons.js 做单元测试。按大类名给 emoji 图标,纯逻辑。
import { describe, it, expect } from 'vitest'
import { majorIcon } from '../src/utils/categoryIcons.js'

describe('majorIcon:按大类名称返回图标', () => {
  it('已知大类"餐饮"应返回米饭图标', () => {
    expect(majorIcon('餐饮')).toBe('🍚')
  })

  it('已知大类"工资"应返回钱袋图标', () => {
    expect(majorIcon('工资')).toBe('💰')
  })

  it('未知大类(用户自建的新大类)应返回默认标签图标', () => {
    expect(majorIcon('宠物')).toBe('🏷️')
  })

  it('传空字符串也应返回默认图标,不报错', () => {
    expect(majorIcon('')).toBe('🏷️')
  })
})
