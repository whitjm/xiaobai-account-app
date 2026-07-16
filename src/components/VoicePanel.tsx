import { useState, useRef, useEffect } from 'react'

interface VoiceResult {
  success: boolean
  text?: string
  error?: string
}

interface VoicePanelProps {
  onResult?: (result: VoiceResult) => void
  onClose?: () => void
}

export default function VoicePanel({ onResult, onClose }: VoicePanelProps) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VoiceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    // 初始化语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('当前浏览器不支持语音识别，请使用 Chrome 或 Edge')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript_part = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript_part
        } else {
          interimText += transcript_part
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText)
      }
      setInterim(interimText)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setListening(false)
      if (event.error === 'not-allowed') {
        setError('请允许麦克风权限')
      } else if (event.error === 'no-speech') {
        setError('未检测到语音，请重试')
      } else {
        setError(`语音识别错误: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setListening(false)
      setLoading(false)
      stopAnimation()
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
      stopAnimation()
    }
  }, [])

  function startAnimation() {
    const circles = document.querySelectorAll('.voice-circle')
    let scale = 1

    function animate() {
      scale = scale === 1 ? 1.2 : 1
      circles.forEach((circle) => {
        ;(circle as HTMLElement).style.transform = `scale(${scale})`
      })
      animationRef.current = setTimeout(animate, 600) as unknown as number
    }

    animate()
  }

  function stopAnimation() {
    clearTimeout(animationRef.current)
    const circles = document.querySelectorAll('.voice-circle')
    circles.forEach((circle) => {
      ;(circle as HTMLElement).style.transform = 'scale(1)'
    })
  }

  function startListening() {
    if (!recognitionRef.current) {
      setError('语音识别不可用')
      return
    }

    setError(null)
    setResult(null)
    setListening(true)
    setLoading(true)
    startAnimation()

    try {
      recognitionRef.current.start()
    } catch (err) {
      console.error('Failed to start recognition:', err)
      setListening(false)
      setLoading(false)
      stopAnimation()
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setListening(false)
    stopAnimation()
  }

  function handleSubmit() {
    if (!transcript.trim()) {
      setError('请先说些什么')
      return
    }

    const voiceResult: VoiceResult = {
      success: true,
      text: transcript,
    }

    setResult(voiceResult)
    setLoading(false)

    if (onResult) {
      onResult(voiceResult)
    }
  }

  function handleClear() {
    setTranscript('')
    setInterim('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="voice-panel">
      <div className="voice-header">
        <h3>🎤 语音记账</h3>
        {onClose && (
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <p className="voice-tip">说出你的消费，比如"今天吃饭花了120元"</p>

      {/* 语音动画区域 */}
      <div className="voice-visualizer">
        <div className="voice-circles">
          <div className="voice-circle" />
          <div className="voice-circle" />
          <div className="voice-circle" />
        </div>
        <div className={`voice-icon ${listening ? 'listening' : ''}`}>🎙️</div>
      </div>

      {/* 语音按钮 */}
      <div className="voice-controls">
        {!listening ? (
          <button
            type="button"
            className="btn-voice"
            onClick={startListening}
            disabled={!!error && !window.SpeechRecognition && !window.webkitSpeechRecognition}
          >
            开始说话
          </button>
        ) : (
          <button type="button" className="btn-voice stop" onClick={stopListening}>
            停止录音
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && <p className="voice-error">{error}</p>}

      {/* 识别文本显示 */}
      {(transcript || interim) && (
        <div className="voice-transcript">
          <div className="transcript-text">
            {transcript}
            {interim && <span className="interim-text">{interim}</span>}
          </div>
        </div>
      )}

      {/* 提交和清除按钮 */}
      {(transcript || result) && (
        <div className="voice-actions">
          {result ? (
            <button type="button" className="btn-primary" onClick={handleClear}>
              继续录音
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!transcript.trim() || loading}
              >
                确认
              </button>
              <button type="button" className="btn-ghost" onClick={handleClear}>
                清除
              </button>
            </>
          )}
        </div>
      )}

      {/* 识别结果 */}
      {result && (
        <div className="voice-result">
          <h4>✅ 识别完成</h4>
          <p className="result-text">{result.text}</p>
        </div>
      )}
    </div>
  )
}
