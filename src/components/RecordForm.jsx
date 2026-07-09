import { useEffect, useState } from 'react'
import { majorIcon } from '../utils/categoryIcons.js'

// 今天的日期,格式 YYYY-MM-DD
function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const EMPTY = { type: 'expense', amount: '', major: '', minor: '', date: today(), note: '' }

// 记账表单:新增或编辑一笔账。categories 为两级分类数据。
export default function RecordForm({ categories, editing, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')

  // 进入编辑模式时,把待编辑的记录填进表单;退出编辑则清空
  useEffect(() => {
    if (editing) {
      setForm({ ...editing, amount: String(editing.amount) })
    } else {
      setForm(EMPTY)
    }
    setErr('')
  }, [editing])

  // 当前类型下的大类列表
  const majorGroups = categories[form.type] || []
  // 当前大类下的小类列表
  const currentGroup = majorGroups.find((g) => g.major === form.major)
  const minors = currentGroup ? currentGroup.minors : []

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  // 切换支出/收入时,分类要重置(两者分类不同)
  function switchType(type) {
    update({ type, major: '', minor: '' })
  }

  // 选大类时,重置小类
  function selectMajor(major) {
    update({ major, minor: '' })
  }

  function submit(e) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setErr('请填写正确的金额(大于 0)')
      return
    }
    if (!form.major || !form.minor) {
      setErr('请选择大类和小类')
      return
    }
    if (!form.date) {
      setErr('请选择日期')
      return
    }
    onSave({ ...form, amount })
  }

  return (
    <form className="record-form" onSubmit={submit}>
      <h2>{editing ? '编辑一笔' : '记一笔'}</h2>

      {/* 类型:支出 / 收入 */}
      <div className="type-toggle">
        <button
          type="button"
          className={form.type === 'expense' ? 'active expense' : ''}
          onClick={() => switchType('expense')}
        >
          支出
        </button>
        <button
          type="button"
          className={form.type === 'income' ? 'active income' : ''}
          onClick={() => switchType('income')}
        >
          收入
        </button>
      </div>

      {/* 金额 */}
      <label className="field">
        <span>金额(元)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => update({ amount: e.target.value })}
        />
      </label>

      {/* 大类 */}
      <label className="field">
        <span>大类</span>
        <select value={form.major} onChange={(e) => selectMajor(e.target.value)}>
          <option value="">请选择</option>
          {majorGroups.map((g) => (
            <option key={g.major} value={g.major}>
              {majorIcon(g.major)} {g.major}
            </option>
          ))}
        </select>
      </label>

      {/* 小类 */}
      <label className="field">
        <span>小类</span>
        <select
          value={form.minor}
          onChange={(e) => update({ minor: e.target.value })}
          disabled={!form.major}
        >
          <option value="">{form.major ? '请选择' : '请先选大类'}</option>
          {minors.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      {/* 日期 */}
      <label className="field">
        <span>日期</span>
        <input
          type="date"
          value={form.date}
          onChange={(e) => update({ date: e.target.value })}
        />
      </label>

      {/* 备注 */}
      <label className="field">
        <span>备注(可选)</span>
        <input
          type="text"
          placeholder="比如:和朋友聚餐"
          value={form.note}
          onChange={(e) => update({ note: e.target.value })}
        />
      </label>

      {err && <p className="form-err">{err}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editing ? '保存修改' : '记录'}
        </button>
        {editing && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </form>
  )
}
