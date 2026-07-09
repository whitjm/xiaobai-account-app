import DatePicker from 'react-datepicker'
import { zhCN } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { rangeLabel } from '../utils/dateRange.js'

// 时间筛选栏:快捷范围(周/月/年/全部/自定义)+ 上一个/下一个翻页 + 自定义日历选起止日期
export default function FilterBar({
  mode,
  anchor,
  customStart,
  customEnd,
  onModeChange,
  onShift,
  onCustomChange,
}) {
  const modes = [
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: 'year', label: '本年' },
    { key: 'all', label: '全部' },
    { key: 'custom', label: '自定义' },
  ]

  const showPager = mode === 'week' || mode === 'month' || mode === 'year'

  return (
    <div className="filter-bar">
      <div className="filter-modes">
        {modes.map((m) => (
          <button
            key={m.key}
            className={mode === m.key ? 'active' : ''}
            onClick={() => onModeChange(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {showPager && (
        <div className="filter-pager">
          <button onClick={() => onShift(-1)}>‹ 上一个</button>
          <span className="filter-label">{rangeLabel(mode, anchor)}</span>
          <button onClick={() => onShift(1)}>下一个 ›</button>
        </div>
      )}

      {mode === 'custom' && (
        <div className="filter-custom">
          <DatePicker
            selected={customStart}
            onChange={(d) => onCustomChange(d, customEnd)}
            selectsStart
            startDate={customStart}
            endDate={customEnd}
            locale={zhCN}
            dateFormat="yyyy-MM-dd"
            placeholderText="开始日期"
            className="date-input"
          />
          <span className="tilde">至</span>
          <DatePicker
            selected={customEnd}
            onChange={(d) => onCustomChange(customStart, d)}
            selectsEnd
            startDate={customStart}
            endDate={customEnd}
            minDate={customStart}
            locale={zhCN}
            dateFormat="yyyy-MM-dd"
            placeholderText="结束日期"
            className="date-input"
          />
        </div>
      )}
    </div>
  )
}
