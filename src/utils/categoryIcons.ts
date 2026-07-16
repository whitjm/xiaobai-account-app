// 按大类名称给一个 emoji 图标。找不到就用默认图标(多为用户自建的新大类)。
const ICONS: Record<string, string> = {
  // 支出
  餐饮: '🍚',
  交通: '🚗',
  购物: '🛍️',
  居住: '🏠',
  娱乐: '🎮',
  医疗: '💊',
  人情: '🎁',
  学习: '📚',
  其他: '📦',
  // 收入
  工资: '💰',
  兼职: '💼',
  投资: '📈',
};

const DEFAULT_ICON = '🏷️';

export function majorIcon(major: string): string {
  return ICONS[major] || DEFAULT_ICON;
}
