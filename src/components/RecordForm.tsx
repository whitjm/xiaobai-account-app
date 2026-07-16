import { useEffect, useState } from 'react'
import { majorIcon } from '../utils/categoryIcons'
import type { RecordEntry, Categories, RecordType } from '../types'
import OCRPanel from './OCRPanel'
import VoicePanel from './VoicePanel'

// 今天的日期,格式 YYYY-MM-DD
function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

interface FormState {
  type: RecordType
  amount: string
  major: string
  minor: string
  date: string
  note: string
}

const EMPTY: FormState = { type: 'expense', amount: '', major: '', minor: '', date: today(), note: '' }

type AIPanelType = 'ocr' | 'voice' | null

interface RecordFormProps {
  categories: Categories
  editing: RecordEntry | null
  onSave: (record: RecordEntry) => void
  onCancel: () => void
}

// 记账表单:新增或编辑一笔账。categories 为两级分类数据。
export default function RecordForm({ categories, editing, onSave, onCancel }: RecordFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [err, setErr] = useState('')
  const [aiPanel, setAiPanel] = useState<AIPanelType>(null)

  // 处理 OCR 识别结果
  function handleOCRResult(result: { amount?: number; date?: string; merchant?: string; category?: string }) {
    const updates: Partial<FormState> = {}

    if (result.amount) {
      updates.amount = String(result.amount)
    }
    if (result.date) {
      updates.date = result.date
    }
    if (result.merchant) {
      updates.note = result.merchant
    }

    // 尝试自动选择分类
    if (result.category) {
      const lowerCategory = result.category.toLowerCase()
      for (const type of ['expense', 'income'] as const) {
        const groups = categories[type] || []
        for (const group of groups) {
          for (const minor of group.minors) {
            if (minor.name.includes(result.category!) || lowerCategory.includes(minor.name.toLowerCase())) {
              updates.type = type
              updates.major = group.major
              updates.minor = minor.name
              break
            }
          }
          if (updates.major) break
        }
        if (updates.major) break
      }
    }

    if (Object.keys(updates).length > 0) {
      update(updates)
    }

    setAiPanel(null)
  }

  // 处理语音识别结果
  function handleVoiceResult(result: { text?: string }) {
    if (result.text) {
      // 简单解析语音文本，尝试提取金额
      const amountMatch = result.text.match(/(\d+\.?\d{0,2})/)
      if (amountMatch) {
        update({ amount: amountMatch[1] })
      }

      // 尝试解析日期
      const dateMatch = result.text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
      if (dateMatch) {
        update({ date: dateMatch[1].replace(/\//g, '-') })
      }

      // 尝试识别分类关键词
      const categoryKeywords: Record<string, string[]> = {
        餐饮: ['吃饭', '餐', '食', '饭'],
        交通: ['车', '交通', '油', '公交', '地铁'],
        购物: ['买', '购物', '商品'],
        娱乐: ['娱乐', '电影', '游戏', '旅游'],
        医疗: ['医疗', '医院', '药'],
      }

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(k => result.text!.includes(k))) {
          // 找到对应的大类
          const groups = categories.expense || []
          const group = groups.find(g => g.major === category)
          if (group) {
            update({ type: 'expense', major: group.major, minor: group.minors[0]?.name || '' })
          }
          break
        }
      }
    }

    setAiPanel(null)
  }

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

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  // 切换支出/收入时,分类要重置(两者分类不同)
  function switchType(type: RecordType) {
    update({ type, major: '', minor: '' })
  }

  // 选大类时,重置小类
  function selectMajor(major: string) {
    update({ major, minor: '' })
  }

  function submit(e: React.FormEvent) {
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
    onSave({ ...form, amount } as RecordEntry)
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

      {/* AI 快捷按钮 */}
      {!editing && (
        <div className="ai-quick-actions">
          <button
            type="button"
            className="btn-ai"
            onClick={() => setAiPanel('ocr')}
          >
            📷 OCR拍照
          </button>
          <button
            type="button"
            className="btn-ai"
            onClick={() => setAiPanel('voice')}
          >
            🎤 语音输入
          </button>
        </div>
      )}

      {/* AI 面板 */}
      {aiPanel === 'ocr' && (
        <div className="ai-panel-overlay">
          <OCRPanel
            onResult={handleOCRResult}
            onClose={() => setAiPanel(null)}
          />
        </div>
      )}
      {aiPanel === 'voice' && (
        <div className="ai-panel-overlay">
          <VoicePanel
            onResult={handleVoiceResult}
            onClose={() => setAiPanel(null)}
          />
        </div>
      )}

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
