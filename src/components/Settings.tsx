import { useState, useEffect } from 'react'

export type LLMProvider =
  | 'claude'       // Anthropic Claude
  | 'openai'       // OpenAI GPT
  | 'ollama'       // Ollama 本地
  | 'deepseek'     // DeepSeek
  | 'qwen'         // 阿里通义千问
  | 'yi'           // 零一万物 Yi
  | 'zhipu'        // 智谱 GLM
  | 'minimax'      // MiniMax
  | 'moonshot'     // 月之暗面 Kimi
  | 'baidu'        // 百度文心
  | 'spark'        // 讯飞星火

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  model: string
  apiEndpoint: string
}

export interface SettingsData {
  llm: LLMConfig
  whisper: {
    modelSize: string
  }
}

// 各提供商的默认配置
const PROVIDER_DEFAULTS: Record<LLMProvider, { model: string; endpoint: string }> = {
  claude:    { model: 'claude-sonnet-4-20250514', endpoint: 'https://api.anthropic.com' },
  openai:    { model: 'gpt-4o-mini',               endpoint: 'https://api.openai.com' },
  ollama:    { model: 'llama3.2',                  endpoint: 'http://localhost:11434' },
  deepseek:  { model: 'deepseek-chat',             endpoint: 'https://api.deepseek.com' },
  qwen:      { model: 'qwen-plus',                 endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  yi:        { model: 'yi-large',                  endpoint: 'https://api.lingyiwanwu.com/v1' },
  zhipu:     { model: 'glm-4-flash',               endpoint: 'https://open.bigmodel.cn/api/paas/v4' },
  minimax:   { model: 'abab6.5s-chat',             endpoint: 'https://api.minimax.chat/v1' },
  moonshot:  { model: 'moonshot-v1-8k',            endpoint: 'https://api.moonshot.cn/v1' },
  baidu:     { model: 'ernie-4.0-8k-latest',      endpoint: 'https://qianfan.baidubce.com/v2' },
  spark:     { model: 'generalv3.5',               endpoint: 'https://spark-api.xf-yun.com/v3.5/chat' },
}

const DEFAULT_SETTINGS: SettingsData = {
  llm: {
    provider: 'deepseek',
    apiKey: '',
    model: PROVIDER_DEFAULTS.deepseek.model,
    apiEndpoint: PROVIDER_DEFAULTS.deepseek.endpoint,
  },
  whisper: {
    modelSize: 'base',
  },
}

const SETTINGS_KEY = 'xiaobai_settings'

// 异步获取设置（从数据库）
export async function getSettingsAsync(): Promise<SettingsData> {
  try {
    const data = await window.api.getSetting(SETTINGS_KEY)
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

// 同步获取设置（使用缓存）
let cachedSettings: SettingsData | null = null
export function getSettings(): SettingsData {
  if (cachedSettings) return cachedSettings
  return DEFAULT_SETTINGS
}

// 保存设置
export async function saveSettings(settings: SettingsData): Promise<void> {
  cachedSettings = settings
  await window.api.setSetting(SETTINGS_KEY, JSON.stringify(settings))
}

// 检查 LLM 是否已配置
export async function isLLMConfigured(): Promise<boolean> {
  const settings = await getSettingsAsync()
  return !!(settings.llm.apiKey || settings.llm.provider === 'ollama')
}

interface SettingsProps {
  onClose?: () => void
}

export default function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    getSettingsAsync().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS))
  }, [])

  function updateLLM(patch: Partial<LLMConfig>) {
    setSettings((s) => ({
      ...s,
      llm: { ...s.llm, ...patch },
    }))
    setSaved(false)
  }

  async function handleSave() {
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)

    try {
      const { callLLM } = await import('../ai/llm')
      const result = await callLLM('你好，请回复"测试成功"，不需要多余的话', settings.llm)

      if (result.success) {
        setTestResult('✅ ' + result.message)
      } else {
        setTestResult('❌ ' + (result.error || '未知错误'))
      }
    } catch (error) {
      setTestResult('❌ ' + (error instanceof Error ? error.message : '测试失败'))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>⚙️ 设置</h3>
        {onClose && (
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* LLM 配置 */}
      <section className="settings-section">
        <h4>🤖 大语言模型</h4>

        <label className="field">
          <span>提供商</span>
          <select
            value={settings.llm.provider}
            onChange={(e) => {
              const provider = e.target.value as LLMProvider
              const defaults = PROVIDER_DEFAULTS[provider]
              updateLLM({
                provider,
                model: defaults.model,
                apiEndpoint: defaults.endpoint,
              })
            }}
          >
            <optgroup label="国际">
              <option value="claude">Claude (Anthropic)</option>
              <option value="openai">OpenAI GPT</option>
              <option value="ollama">Ollama (本地)</option>
            </optgroup>
            <optgroup label="国内">
              <option value="deepseek">DeepSeek</option>
              <option value="qwen">通义千问 (阿里)</option>
              <option value="yi">零一万物 Yi</option>
              <option value="zhipu">智谱 GLM</option>
              <option value="minimax">MiniMax</option>
              <option value="moonshot">Kimi (月之暗面)</option>
              <option value="baidu">文心一言 (百度)</option>
              <option value="spark">讯飞星火</option>
            </optgroup>
          </select>
        </label>

        {settings.llm.provider !== 'ollama' && (
          <label className="field">
            <span>API Key</span>
            <input
              type="password"
              value={settings.llm.apiKey}
              onChange={(e) => updateLLM({ apiKey: e.target.value })}
              placeholder={
                settings.llm.provider === 'deepseek' ? 'sk-...' :
                settings.llm.provider === 'qwen' ? 'sk-...' :
                settings.llm.provider === 'zhipu' ? 'sk-...' :
                settings.llm.provider === 'baidu' ? 'API Key' :
                settings.llm.provider === 'minimax' ? 'API Key' :
                settings.llm.provider === 'moonshot' ? 'sk-...' :
                settings.llm.provider === 'yi' ? 'API Key' :
                settings.llm.provider === 'spark' ? 'API Key' :
                'sk-...'
              }
            />
          </label>
        )}

        <label className="field">
          <span>API 地址</span>
          <input
            type="text"
            value={settings.llm.apiEndpoint}
            onChange={(e) => updateLLM({ apiEndpoint: e.target.value })}
            placeholder={PROVIDER_DEFAULTS[settings.llm.provider].endpoint}
          />
        </label>

        <label className="field">
          <span>模型</span>
          <input
            type="text"
            value={settings.llm.model}
            onChange={(e) => updateLLM({ model: e.target.value })}
            placeholder={PROVIDER_DEFAULTS[settings.llm.provider].model}
          />
        </label>

        <div className="field-actions">
          <button
            type="button"
            className="btn-test"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
        </div>

        {testResult && <p className="test-result">{testResult}</p>}
      </section>

      {/* Whisper 配置 */}
      <section className="settings-section">
        <h4>🎤 语音识别</h4>

        <label className="field">
          <span>Whisper 模型</span>
          <select
            value={settings.whisper.modelSize}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                whisper: { ...s.whisper, modelSize: e.target.value },
              }))
            }
          >
            <option value="tiny">tiny (~75MB)</option>
            <option value="base">base (~140MB) - 推荐</option>
            <option value="small">small (~450MB)</option>
            <option value="medium">medium (~1.5GB)</option>
          </select>
        </label>
        <p className="field-hint">注：当前使用 Web Speech API，Whisper 模型配置暂未启用</p>
      </section>

      {/* 保存按钮 */}
      <div className="settings-footer">
        <button type="button" className="btn-primary" onClick={handleSave}>
          {saved ? '✅ 已保存' : '保存设置'}
        </button>
      </div>
    </div>
  )
}
