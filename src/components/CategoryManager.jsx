import { useState } from 'react'
import { majorIcon } from '../utils/categoryIcons.js'

// 分类管理页:查看全部分类,新增/修改/删除【用户自建】分类。
// 预置分类只读,不显示改删按钮。categories 为两级分类数据,onChanged 通知外层刷新。
export default function CategoryManager({ categories, onChanged }) {
  const [type, setType] = useState('expense') // 当前查看支出还是收入
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState(null) // 正在编辑的小类 id
  const [editMajor, setEditMajor] = useState('')
  const [editMinor, setEditMinor] = useState('')
  const [confirmId, setConfirmId] = useState(null) // 正在确认删除的小类 id

  // 新增表单
  const [newMajor, setNewMajor] = useState('')
  const [newMinor, setNewMinor] = useState('')

  const groups = categories[type] || []
  // 已有大类名字(供新增时下拉快速选择,也可手输新大类)
  const majorNames = groups.map((g) => g.major)

  function show(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3500)
  }

  async function handleAdd(e) {
    e.preventDefault()
    const r = await window.api.addCategory({ type, major: newMajor, minor: newMinor })
    if (r.ok) {
      show('已添加分类')
      setNewMajor('')
      setNewMinor('')
      onChanged?.()
    } else {
      show(r.error || '添加失败')
    }
  }

  function startEdit(major, minor) {
    setEditingId(minor.id)
    setEditMajor(major)
    setEditMinor(minor.name)
    setConfirmId(null)
  }

  async function saveEdit() {
    const r = await window.api.updateCategory({
      id: editingId,
      major: editMajor,
      minor: editMinor,
    })
    if (r.ok) {
      show('已保存修改')
      setEditingId(null)
      onChanged?.()
    } else {
      show(r.error || '修改失败')
    }
  }

  async function handleDelete(id) {
    const r = await window.api.deleteCategory(id)
    if (r.ok) {
      show('已删除分类')
      setConfirmId(null)
      onChanged?.()
    } else {
      show(r.error || '删除失败')
    }
  }

  return (
    <div className="cat-manager">
      <div className="cat-toolbar">
        <div className="stats-toggle">
          <button
            className={type === 'expense' ? 'active expense' : ''}
            onClick={() => {
              setType('expense')
              setEditingId(null)
            }}
          >
            支出分类
          </button>
          <button
            className={type === 'income' ? 'active income' : ''}
            onClick={() => {
              setType('income')
              setEditingId(null)
            }}
          >
            收入分类
          </button>
        </div>
        {msg && <span className="cat-msg">{msg}</span>}
      </div>

      {/* 新增分类 */}
      <form className="cat-add" onSubmit={handleAdd}>
        <input
          type="text"
          list="cat-major-list"
          placeholder="大类(可选已有或输入新的)"
          value={newMajor}
          onChange={(e) => setNewMajor(e.target.value)}
        />
        <datalist id="cat-major-list">
          {majorNames.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <input
          type="text"
          placeholder="小类名称"
          value={newMinor}
          onChange={(e) => setNewMinor(e.target.value)}
        />
        <button type="submit" className="btn-primary cat-add-btn">
          添加
        </button>
      </form>

      {/* 分类列表:按大类分组 */}
      <div className="cat-groups">
        {groups.map((g) => (
          <div className="cat-group" key={g.major}>
            <div className="cat-group-title">
              <span className="cat-group-icon">{majorIcon(g.major)}</span>
              {g.major}
            </div>
            <div className="cat-minors">
              {g.minors.map((m) => (
                <div className={`cat-chip ${m.preset ? 'preset' : ''}`} key={m.id}>
                  {editingId === m.id ? (
                    <div className="cat-edit">
                      <input
                        type="text"
                        value={editMajor}
                        onChange={(e) => setEditMajor(e.target.value)}
                        placeholder="大类"
                      />
                      <input
                        type="text"
                        value={editMinor}
                        onChange={(e) => setEditMinor(e.target.value)}
                        placeholder="小类"
                      />
                      <button className="btn-ghost-sm" onClick={saveEdit}>
                        保存
                      </button>
                      <button className="btn-ghost-sm" onClick={() => setEditingId(null)}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="cat-chip-name">{m.name}</span>
                      {m.preset ? (
                        <span className="cat-preset-tag">预置</span>
                      ) : confirmId === m.id ? (
                        <span className="cat-chip-ops">
                          <button
                            className="btn-danger-sm"
                            onClick={() => handleDelete(m.id)}
                          >
                            删除
                          </button>
                          <button
                            className="btn-ghost-sm"
                            onClick={() => setConfirmId(null)}
                          >
                            取消
                          </button>
                        </span>
                      ) : (
                        <span className="cat-chip-ops">
                          <button
                            className="cat-icon-btn"
                            title="修改"
                            onClick={() => startEdit(g.major, m)}
                          >
                            ✏️
                          </button>
                          <button
                            className="cat-icon-btn"
                            title="删除"
                            onClick={() => setConfirmId(m.id)}
                          >
                            🗑️
                          </button>
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="cat-note">
        提示:带「预置」标记的是软件自带分类,不能修改或删除;你自己添加的分类可以随时改名或删除。
      </p>
    </div>
  )
}
