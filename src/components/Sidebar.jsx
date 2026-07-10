// 左侧菜单栏:首页 / 记账 / 统计 / 编辑记录 / 分类管理
const MENU = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'record', label: '记账', icon: '✍️' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'edit', label: '编辑记录', icon: '📋' },
  { key: 'category', label: '分类管理', icon: '🏷️' },
  { key: 'snake', label: '小游戏', icon: '🐍' },
]

export default function Sidebar({ page, onChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="app-logo">💰</span>
        <span className="sidebar-title">小白记账</span>
      </div>
      <nav className="sidebar-menu">
        {MENU.map((m) => (
          <button
            key={m.key}
            className={`sidebar-item ${page === m.key ? 'active' : ''}`}
            onClick={() => onChange(m.key)}
          >
            <span className="sidebar-icon">{m.icon}</span>
            <span className="sidebar-label">{m.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
