import { useState } from 'react'
import type { RecordEntry } from '../types'

// 账目列表:按日期倒序展示每一笔,支持编辑和删除(删除有确认提示)。
// title/emptyTip 可自定义标题与空态文案,供记账页/编辑记录页复用。
interface RecordListProps {
  records: RecordEntry[]
  onEdit: (record: RecordEntry) => void
  onDelete: (id: number) => void
  title?: string
  emptyTip?: string
}

export default function RecordList({
  records,
  onEdit,
  onDelete,
  title = '账目明细',
  emptyTip = '还没有记录,快去记第一笔吧 📝',
}: RecordListProps) {
  const [confirmId, setConfirmId] = useState<number | null>(null) // 正在确认删除的记录 id

  if (records.length === 0) {
    return (
      <div className="record-list empty">
        <h2>{title}</h2>
        <p className="empty-tip">{emptyTip}</p>
      </div>
    )
  }

  return (
    <div className="record-list">
      <h2>{title}</h2>
      <ul>
        {records.map((r) => (
          <li className="record-item" key={r.id}>
            <div className="record-main">
              <span className={`record-tag ${r.type}`}>
                {r.type === 'expense' ? '支' : '收'}
              </span>
              <div className="record-info">
                <div className="record-cat">
                  {r.major} · {r.minor}
                </div>
                <div className="record-sub">
                  {r.date}
                  {r.note ? ` · ${r.note}` : ''}
                </div>
              </div>
            </div>

            <div className="record-right">
              <span className={`record-amount ${r.type}`}>
                {r.type === 'expense' ? '-' : '+'}¥{Number(r.amount).toFixed(2)}
              </span>

              {confirmId === r.id ? (
                <div className="confirm-box">
                  <span>确认删除?</span>
                  <button
                    className="btn-danger-sm"
                    onClick={() => {
                      onDelete(r.id!)
                      setConfirmId(null)
                    }}
                  >
                    删除
                  </button>
                  <button className="btn-ghost-sm" onClick={() => setConfirmId(null)}>
                    取消
                  </button>
                </div>
              ) : (
                <div className="record-ops">
                  <button className="btn-ghost-sm" onClick={() => onEdit(r)}>
                    编辑
                  </button>
                  <button className="btn-ghost-sm" onClick={() => setConfirmId(r.id!)}>
                    删除
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
