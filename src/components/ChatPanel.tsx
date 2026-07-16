import { useState, useRef, useEffect, useCallback } from 'react'
import { getSettings, getSettingsAsync, isLLMConfigured, type LLMConfig } from './Settings'
import { callLLM, type LLMMessage } from '../ai/llm'
import { executeTool } from '../ai/tools'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  onClose?: () => void
  initialMessage?: string
  onSaveRecord?: () => void
  onRefresh?: () => void
}

const CHAT_STORAGE_KEY = 'xiaobai_chat_history'
const MAX_CHAT_DAYS = 30 // 只保存近30天的聊天记录

// 计算N天前的日期
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// 今天
function today(): string {
  return new Date().toISOString().split('T')[0]
}

// 让 LLM 解析用户意图，返回结构化的操作指令
async function parseIntentWithLLM(text: string, config: LLMConfig): Promise<{
  action: 'query' | 'add' | 'unknown'
  params: Record<string, unknown>
  response: string // LLM 初步回复（如果是记账，需要先展示给用户确认）
}> {
  const prompt = `用户说："${text}"

请判断用户的意图，返回结构化指令：

如果用户要记账（如：花了X元、买了X、收入X、记一笔、捡到X、收到X），返回：
{"action":"add","params":{"type":"expense"|"income","amount":X,"major":"大类","minor":"小类","note":"备注"}}

如果用户要查询账目（如：花了多少、最近有什么、统计），返回：
{"action":"query","params":{"type":"expense"|"income"|"all","days":N或"week"|"month"|"year"}}

如果不确定用户在说什么，就问清楚。
只返回JSON，不要多余的话。`

  const result = await callLLM(prompt, config, [], false)
  if (!result.success || !result.message) {
    return { action: 'unknown', params: {}, response: '抱歉，理解不了你的话，请换个说法试试？' }
  }

  // 解析 JSON 响应
  try {
    const jsonMatch = result.message.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.action === 'add') {
        const type = parsed.params.type === 'income' ? 'income' : 'expense'
        const typeLabel = type === 'income' ? '收入' : '支出'
        const typeEmoji = type === 'income' ? '💰' : '💸'
        return {
          action: 'add',
          params: {
            type,
            amount: parseFloat(parsed.params.amount) || 0,
            major: parsed.params.major || (type === 'income' ? '其他' : '其他支出'),
            minor: parsed.params.minor || (type === 'income' ? '其他收入' : '其他'),
            note: parsed.params.note || '',
          },
          response: `好的，帮你记一笔：\n${typeEmoji} ${typeLabel} ${parsed.params.amount} 元\n📂 分类：${parsed.params.major || (type === 'income' ? '其他' : '其他支出')} - ${parsed.params.minor || (type === 'income' ? '其他收入' : '其他')}\n📅 日期：今天\n\n确认保存吗？`,
        }
      } else if (parsed.action === 'query') {
        return {
          action: 'query',
          params: {
            type: parsed.params.type || 'all',
            days: parsed.params.days || 10,
          },
          response: '',
        }
      }
    }
  } catch {
    // JSON 解析失败
  }

  // 解析失败，用关键词回退
  const t = text.toLowerCase()
  if (t.includes('花了') || t.includes('买') || t.includes('消费') || t.includes('支出')) {
    return { action: 'add', params: {}, response: '请告诉我要记多少钱，是支出还是收入？' }
  }
  if (t.includes('收入') || t.includes('捡到') || t.includes('收到') || t.includes('发工资') || t.includes('赚钱')) {
    return { action: 'add', params: { type: 'income' }, response: '请告诉我要记多少钱，是收入？' }
  }
  return { action: 'query', params: { type: 'all', days: 10 }, response: '' }
}

// 从 localStorage 加载聊天记录
function loadChatHistory(): ChatMessage[] {
  try {
    const data = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!data) return []
    const messages: ChatMessage[] = JSON.parse(data)
    // 过滤掉30天前的消息
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MAX_CHAT_DAYS)
    return messages.filter((m) => new Date(m.timestamp) > thirtyDaysAgo)
  } catch {
    return []
  }
}

// 保存聊天记录到 localStorage
function saveChatHistory(messages: ChatMessage[]) {
  try {
    // 过滤30天内的记录，并只保留最近100条
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MAX_CHAT_DAYS)
    const filtered = messages
      .filter((m) => new Date(m.timestamp) > thirtyDaysAgo)
      .slice(-100) // 只保留最近100条
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    // ignore
  }
}

// 检查浏览器是否支持语音识别
function checkSpeechRecognition(): { supported: boolean; error?: string } {
  const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
  if (!SpeechRecognition) {
    return { supported: false, error: '当前浏览器不支持 Web Speech API，请使用 Chrome 或 Edge 浏览器' }
  }
  return { supported: true }
}

export default function ChatPanel({ onClose, initialMessage, onSaveRecord, onRefresh }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [llmConfigured, setLlmConfigured] = useState(false)
  const [showSettingsHint, setShowSettingsHint] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [speechReady, setSpeechReady] = useState(false)
  const [confirmedMsgId, setConfirmedMsgId] = useState<string | null>(null) // 已确认/取消的消息ID，按钮消失
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationHistoryRef = useRef<LLMMessage[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Whisper 服务默认就绪（通过 IPC 调用，出错会提示）
  useEffect(() => {
    setSpeechReady(true)
  }, [])

  useEffect(() => {
    isLLMConfigured().then((configured) => {
      setLlmConfigured(configured)
      if (!configured) {
        setShowSettingsHint(true)
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 保存聊天记录变化
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages)
    }
  }, [messages])

  function addMessage(role: 'user' | 'assistant', content: string) {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, message])
    return message.id
  }

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return

    const configured = await isLLMConfigured()
    if (!configured) {
      addMessage('assistant', '请先在设置中配置大语言模型 API，才能使用 AI 助手功能。')
      return
    }

    const userMessage = input.trim()
    setInput('')

    addMessage('user', userMessage)
    setLoading(true)

    try {
      const settings = await getSettingsAsync()
      const config: LLMConfig = settings.llm

      // 让 LLM 解析用户意图
      const intentResult = await parseIntentWithLLM(userMessage, config)

      if (intentResult.action === 'unknown') {
        addMessage('assistant', intentResult.response)
        conversationHistoryRef.current.push({ role: 'user', content: userMessage })
        conversationHistoryRef.current.push({ role: 'assistant', content: intentResult.response })
        setLoading(false)
        return
      }

      // 记账操作 - 先展示预览，等用户确认
      if (intentResult.action === 'add') {
        const msgId = addMessage('assistant', intentResult.response)
        conversationHistoryRef.current.push({ role: 'user', content: userMessage })
        conversationHistoryRef.current.push({ role: 'assistant', content: intentResult.response })
        // 保存意图参数到全局，等待确认
        ;(window as unknown as { _pendingAddRecord: unknown })._pendingAddRecord = intentResult.params
        setConfirmedMsgId(msgId) // 记录这条消息有确认按钮
        setLoading(false)
        return
      }

      // 查询操作 - 直接调用工具获取数据
      conversationHistoryRef.current.push({ role: 'user', content: userMessage })

      // 获取当前时间
      const timeResult = await executeTool('get_current_time', {}) as { success: boolean; current_time: { date: string; month_start: string; week_start: string } }
      const currentDate = timeResult.current_time.date

      // 计算日期范围
      const params = intentResult.params
      let startDate: string, endDate: string
      const days = params.days as string | number

      if (days === 'week') {
        startDate = timeResult.current_time.week_start
        endDate = currentDate
      } else if (days === 'month') {
        startDate = timeResult.current_time.month_start
        endDate = currentDate
      } else if (days === 'year') {
        startDate = `${new Date().getFullYear()}-01-01`
        endDate = currentDate
      } else {
        const numDays = parseInt(String(days)) || 10
        startDate = daysAgo(numDays)
        endDate = today()
      }

      const filterType = params.type === 'income' ? 'income' : params.type === 'expense' ? 'expense' : undefined

      const recordsResult = await executeTool('get_records', {
        start_date: startDate,
        end_date: endDate,
        type: filterType,
        limit: 50,
      }) as { success: boolean; records: Array<{ type: string; amount: number; major: string; minor: string; date: string; note: string }>; total: number }

      let resultText = ''
      if (!recordsResult.success || !recordsResult.records || recordsResult.records.length === 0) {
        resultText = `${currentDate} 最近没有找到消费记录哦，账本还是空的呢 🎯`
      } else {
        const records = recordsResult.records
        let total = 0
        for (const r of records) {
          if (r.type === 'expense') total += r.amount
          else if (r.type === 'income') total -= r.amount
        }
        resultText = `${currentDate} 查询结果：\n\n共 ${records.length} 笔记录，合计 ${Math.abs(total).toFixed(2)} 元\n\n`
        for (const r of records) {
          const emoji = r.type === 'expense' ? '💸' : '💰'
          resultText += `${emoji} ${r.date} ${r.major}·${r.minor} ${r.type === 'expense' ? '-' : '+'}${r.amount.toFixed(2)}元\n`
        }
      }

      // 让 AI 把工具结果包装成自然语言
      const llmResult = await callLLM(
        `用户问："${userMessage}"\n\n工具查询结果：\n${resultText}\n\n请用自然语言简洁地告诉用户查询结果，不要编造任何数字。`,
        config,
        conversationHistoryRef.current,
        false
      )

      if (llmResult.success && llmResult.message) {
        addMessage('assistant', llmResult.message)
        conversationHistoryRef.current.push({ role: 'assistant', content: llmResult.message })
      } else {
        addMessage('assistant', resultText || '查询失败了，稍后重试吧')
      }
    } catch (error) {
      addMessage('assistant', `抱歉：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }, [input, loading, onSaveRecord])

  // 处理用户确认保存
  const handleConfirmSave = useCallback(async (confirm: boolean) => {
    // 立即隐藏按钮
    setConfirmedMsgId(null)

    if (!confirm) {
      addMessage('assistant', '好的，已取消保存。')
      delete (window as unknown as { _pendingAddRecord?: unknown })._pendingAddRecord
      return
    }

    const pending = (window as unknown as { _pendingAddRecord?: { type?: string; amount: number; major: string; minor: string; note: string } })._pendingAddRecord
    if (!pending) {
      addMessage('assistant', '抱歉，没有找到待保存的记录，请重新发起记账。')
      return
    }

    setLoading(true)
    try {
      const addResult = await executeTool('add_record', {
        type: pending.type || 'expense',
        amount: pending.amount,
        major: pending.major,
        minor: pending.minor,
        date: today(),
        note: pending.note || '',
      })

      if ((addResult as { success: boolean }).success) {
        const isIncome = pending.type === 'income'
        const emoji = isIncome ? '💰' : '💸'
        const typeLabel = isIncome ? '收入' : '支出'
        addMessage('assistant', `已记好啦！🎉\n${emoji} ${typeLabel} ${pending.amount} 元，分类 ${pending.major} - ${pending.minor}，已保存成功。`)
        onRefresh?.()
      } else {
        addMessage('assistant', '保存失败了，麻烦重试一下')
      }
    } catch (error) {
      addMessage('assistant', `保存失败了：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      delete (window as unknown as { _pendingAddRecord?: unknown })._pendingAddRecord
      setLoading(false)
    }
  }, [onRefresh])

  async function toggleVoice() {
    if (!speechReady) {
      setSpeechError('语音服务未就绪，请重启 APP')
      return
    }

    if (listening) {
      // 停止录音
      mediaRecorderRef.current?.stop()
      setListening(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        setListening(false)

        if (audioChunksRef.current.length === 0) {
          setSpeechError('没有录到音频')
          return
        }

        try {
          // 使用 Blob + FileReader 正确获取 base64
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              // result 是 data:image/webm;base64,xxxxx 格式，取逗号后面的部分
              const dataUrl = reader.result as string
              const b64 = dataUrl.split(',')[1]
              resolve(b64 || '')
            }
            reader.onerror = reject
            reader.readAsDataURL(audioBlob)
          })

          const result = await window.api.transcribe(base64)
          if (result.success && result.text) {
            setInput((prev) => prev + result.text)
          } else {
            setSpeechError(result.error || '识别失败')
          }
        } catch (err) {
          console.error('Transcribe error:', err)
          setSpeechError('识别请求失败')
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setListening(true)
      setSpeechError(null)
    } catch (err) {
      console.error('Failed to start recording:', err)
      if ((err as Error).name === 'NotAllowedError') {
        setSpeechError('麦克风权限被拒绝，请在系统设置中允许使用麦克风')
      } else {
        setSpeechError('启动录音失败')
      }
    }
  }

  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 家政助手</h3>
        {onClose && (
          <button type="button" className="btn-close" onClick={onClose}>✕</button>
        )}
      </div>

      {showSettingsHint && messages.length === 0 && (
        <div className="chat-setup-hint">
          <p>🤖 请先配置大语言模型才能使用 AI 助手</p>
          <p className="hint-sub">点击左侧菜单"设置"，选择提供商并填入 API Key</p>
        </div>
      )}

      {messages.length === 0 && llmConfigured && (
        <div className="chat-welcome">
          <p>👋 你好！我是你的家政助手</p>
          <p className="welcome-hint">你可以：</p>
          <ul>
            <li>"这个月花了多少钱？"</li>
            <li>"帮我记一笔支出100元买书"</li>
            <li>"最近有什么消费？"</li>
          </ul>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="message-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div className="message-content">
              <div className="message-text">
                {msg.content}
                {msg.content.includes('确认保存吗') && confirmedMsgId === msg.id && (
                  <span className="confirm-buttons">
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => handleConfirmSave(true)}
                      disabled={loading}
                    >
                      确认
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => handleConfirmSave(false)}
                      disabled={loading}
                    >
                      取消
                    </button>
                  </span>
                )}
              </div>
              <div className="message-time">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-text loading">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <button
          type="button"
          className={`btn-voice-input ${listening ? 'listening' : ''} ${speechError ? 'disabled' : ''}`}
          onClick={toggleVoice}
          title={speechError || (listening ? '停止录音' : '语音输入')}
          disabled={!!speechError}
        >
          🎤
        </button>

        {speechError && <span className="voice-error-tip">{speechError}</span>}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={llmConfigured ? '输入消息...' : '请先配置 LLM API'}
          rows={2}
          disabled={loading || !llmConfigured}
        />

        <button
          type="button"
          className="btn-send"
          onClick={handleSend}
          disabled={!input.trim() || loading || !llmConfigured}
        >
          ➤
        </button>
      </div>
    </div>
  )
}
