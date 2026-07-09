// 合计条:显示总收入、总支出、结余
export default function Summary({ summary }) {
  const fmt = (n) => Number(n).toFixed(2)
  return (
    <div className="summary">
      <div className="summary-item income">
        <span className="summary-icon">📈</span>
        <div className="summary-text">
          <span className="summary-label">总收入</span>
          <span className="summary-value">¥{fmt(summary.income)}</span>
        </div>
      </div>
      <div className="summary-item expense">
        <span className="summary-icon">📉</span>
        <div className="summary-text">
          <span className="summary-label">总支出</span>
          <span className="summary-value">¥{fmt(summary.expense)}</span>
        </div>
      </div>
      <div className="summary-item balance">
        <span className="summary-icon">💰</span>
        <div className="summary-text">
          <span className="summary-label">结余</span>
          <span className="summary-value">¥{fmt(summary.balance)}</span>
        </div>
      </div>
    </div>
  )
}
