import { useState, useRef } from 'react'

interface OCRResult {
  success: boolean
  text?: string
  amount?: number
  date?: string
  merchant?: string
  category?: string
  error?: string
}

interface OCRPanelProps {
  onResult?: (result: OCRResult) => void
  onClose?: () => void
}

export default function OCRPanel({ onResult, onClose }: OCRPanelProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setPreview(url)
    setResult(null)
  }

  async function handleRecognize() {
    if (!imageUrl) return

    setLoading(true)
    setProgress(0)
    setResult(null)

    try {
      // 动态导入 AI 模块
      const { processReceipt } = await import('../ai/ocr/index')

      // 模拟进度更新（实际进度由 Tesseract 内部管理）
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90))
      }, 500)

      const ocrResult = await processReceipt(imageUrl)

      clearInterval(progressInterval)
      setProgress(100)
      setResult(ocrResult)

      if (ocrResult.success && onResult) {
        onResult(ocrResult)
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'OCR识别失败',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setImageUrl(null)
    setPreview(null)
    setResult(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="ocr-panel">
      <div className="ocr-header">
        <h3>📷 拍照记账</h3>
        {onClose && (
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <p className="ocr-tip">上传票据图片，AI自动识别金额、日期、商家</p>

      {/* 图片选择 */}
      <div className="ocr-upload">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {preview ? (
          <div className="ocr-preview">
            <img src={preview} alt="预览" />
            <button type="button" className="btn-clear" onClick={handleClear}>
              清除图片
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ocr-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="upload-icon">📷</span>
            <span>点击上传票据图片</span>
            <span className="upload-hint">支持发票、收据、超市小票等</span>
          </button>
        )}
      </div>

      {/* 识别按钮 */}
      {preview && !result && (
        <button
          type="button"
          className="btn-primary ocr-recognize-btn"
          onClick={handleRecognize}
          disabled={loading}
        >
          {loading ? '识别中...' : '开始识别'}
        </button>
      )}

      {/* 加载进度 */}
      {loading && (
        <div className="ocr-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {/* 识别结果 */}
      {result && (
        <div className={`ocr-result ${result.success ? 'success' : 'error'}`}>
          <h4>{result.success ? '✅ 识别成功' : '❌ 识别失败'}</h4>

          {result.success ? (
            <div className="result-fields">
              {result.amount && (
                <div className="result-field">
                  <span className="field-label">金额</span>
                  <span className="field-value">¥{result.amount.toFixed(2)}</span>
                </div>
              )}
              {result.date && (
                <div className="result-field">
                  <span className="field-label">日期</span>
                  <span className="field-value">{result.date}</span>
                </div>
              )}
              {result.merchant && (
                <div className="result-field">
                  <span className="field-label">商家</span>
                  <span className="field-value">{result.merchant}</span>
                </div>
              )}
              {result.text && (
                <div className="result-full-text">
                  <span className="field-label">识别原文</span>
                  <pre>{result.text}</pre>
                </div>
              )}
            </div>
          ) : (
            <p className="error-msg">{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
