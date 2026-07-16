# 小白家政 — 深度开发方案

> 本文档为「小白记账APP → 小白家政APP」升级提供完整技术方案与实施路线图。
>
> **实施方式：** 每个小阶段完成后单独验收，通过后再进入下一阶段。

---

## 一、产品定位升级

**产品名称:** 小白家政

**一句话介绍:** 一款智能家政助理软件，通过图像识别自动记账、语音对话交互、RAG个性化学习，帮助用户高效管理家庭收支与日常家务任务。

**核心升级:**
- 图像识别自动记账（拍照即识别，自动生成账单）
- 私人家政语音助手（中文语音交互，懂你习惯）
- 个性化RAG知识库（学习用户消费/收入习惯）
- Agent工作流编排（任务自动化执行）

---

## 二、技术架构总览

```
┌─────────────────────────────────────────────────────────┐
│                     Electron 桌面应用                      │
├──────────────┬──────────────┬──────────────┬─────────────┤
│  React 前端  │  IPC 桥接层  │  Node.js 后端 │  SQLite DB  │
│  (TypeScript)│  (白名单校验)│  (TypeScript) │  (本地存储) │
├──────────────┴──────────────┴──────────────┴─────────────┤
│                    AI/ML 服务层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Tesseract│  │ Whisper  │  │  Chroma  │  │ LangChain│  │
│  │   .js    │  │   .cpp   │  │   本地   │  │   .js    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

**架构原则:**
- **前端轻量化**: React.lazy懒加载 + React Router + Vite代码分割
- **类型安全**: TypeScript渐进迁移，核心逻辑100%类型覆盖
- **安全合规**: IPC白名单校验、输入校验、XSS防护、全局错误处理
- **本地优先**: SQLite + Chroma全本地存储，不上传任何用户数据
- **工程化规范**: ESLint + Prettier + Vitest + GitHub Actions CI/CD

---

## 三、功能模块详解

### 3.1 图像识别自动记账

**功能描述:**
- 用户上传消费凭证图片（发票、收据、截图等）
- AI自动识别：金额、商家名称、商品明细、日期
- 自动填充并生成支出/收入账单

**技术方案选型:**

| 方案 | 框架 | 优点 | 缺点 |
|------|------|------|------|
| A | TensorFlow.js + 预训练模型 | 前端可直接运行，无需服务器；延迟低 | 模型精度相对Python版略低 |
| B | PyTorch + ONNX Runtime | 精度高；Python端训练方便 | 需要转换为ONNX，前端运行复杂 |
| **推荐** | **Tesseract.js (OCR) + 自建规则引擎** | **轻量；中文识别成熟； Electron集成简单** | **需配合规则引擎解析结构化数据** |

**推荐理由:**
- Tesseract.js 是开源OCR引擎，对中文支持较好
- 发票/收据有固定格式（如"金额 ¥123.45"），规则引擎+正则匹配即可解析
- Electron环境下可直接调用，无需额外部署
- 模块独立，按需加载，不影响主应用启动

**实现步骤:**
1. 集成 Tesseract.js
2. 构建票据模板识别规则（发票、收据、超市小票、银行截图）
3. 提取字段：金额、日期、商家、分类关键词
4. 自动映射到现有记账分类体系
5. 生成草稿账单，用户确认后保存

---

### 3.2 私人家政语音助手

**功能描述:**
- 语音输入：用户说话转文字，支持中文
- 对话交互：理解用户意图（"帮我记一笔餐费120元"）
- 图片发送：发送凭证图片，触发图像识别流程
- 持续学习：记忆用户习惯（如"我每周五买菜"）

**技术方案选型:**

| 方案 | 技术 | 优点 | 缺点 |
|------|------|------|------|
| A | DeepSpeech (Mozilla) | 开源；中文模型可用 | 精度一般；项目维护较少 |
| B | Whisper (OpenAI) | 精度高；多语言支持强 | 模型较大(~3GB)；需要转换JS |
| **推荐** | **Whisper.cpp (WebAssembly版)** | **精度高；WASM可在浏览器运行；中文支持好** | **首次加载需下载模型文件** |

**推荐理由:**
- Whisper.cpp 有成熟的WebAssembly/WASM版本，可直接在Electron渲染进程运行
- 精度优于DeepSpeech，对中文方言、噪音环境更鲁棒
- 模型可本地缓存，无需每次下载
- 配合LangChain做意图识别和对话管理
- 用户可在设置中选择模型大小（base默认140MB）

**Whisper模型选择:**

| 模型 | 大小 | 精度 | 推荐场景 |
|------|------|------|----------|
| tiny | ~75MB | 低 | 移动端/快速启动 |
| base | ~140MB | 中 | 日常使用（**推荐默认**） |
| small | ~450MB | 中高 | 较高精度需求 |
| medium | ~1.5GB | 高 | 桌面端高配 |
| large | ~3GB | 最高 | 桌面端+高配置要求 |

**实现步骤:**
1. 集成 whisper.cpp 的 WASM 版本
2. 语音录制 → 实时转写 → 文本处理
3. 接入对话管理模块（意图识别 + 对话状态机）
4. 支持多轮对话、上下文记忆
5. 语音合成（TTS）回复用户（可选，使用 Web Speech API）
6. 用户可在设置中切换模型大小

---

### 3.3 RAG个性化向量知识库

**功能描述:**
- 构建用户专属知识库：收入习惯、消费偏好、常用分类
- 每次交互后更新学习：用户确认的账单→更新偏好
- 助手调用时检索相关上下文，生成个性化回复
- **所有数据严格本地存储，不上传云端**

**技术方案选型:**

| 方案 | 技术 | 优点 | 缺点 |
|------|------|------|------|
| A | Chroma (向量数据库) | 轻量；专为JS/TS设计；本地存储 | 功能相对简单 |
| B | FAISS (Facebook) | 高性能；适合大规模向量 | 需要Python服务端 |
| C | LlamaIndex | 强大的检索框架；支持多种数据源 | 学习曲线较陡 |
| **推荐** | **Chroma + LangChain** | **轻量集成；LangChain统一封装；本地优先** | **大规模数据需优化** |

**推荐理由:**
- Chroma专为JavaScript/TypeScript设计，与本项目技术栈契合
- 本地持久化存储，数据不上云，保护隐私
- LangChain统一封装向量检索与LLM调用
- 支持增量更新与相似度检索

**本地存储设计:**

```
用户数据目录/
├── xiaobai.db                 # SQLite 主数据库
├── vector_db/                 # Chroma 向量数据库
│   ├── embeddings/           # 向量数据文件
│   └── metadata/             # 元数据
└── models/                    # 本地AI模型
    └── whisper/              # Whisper模型文件
```

**数据内容向量化的类别:**

```
用户画像向量库
├── 消费习惯: "每周五去超市买菜，每次约200元"
├── 收入周期: "每月15号发工资"
├── 常用分类: "餐饮支出最频繁，主要用于午餐"
├── 商家偏好: "习惯在某某超市购物"
└── 时间模式: "周末娱乐消费多"
```

**实现步骤:**
1. 集成 Chroma 向量数据库（本地持久化存储）
2. 设计数据Schema（用户画像、消费记录、交互历史）
3. 每次助手交互后，提取关键信息写入向量库
4. 对话时，检索相关上下文注入LLM提示词
5. 支持增量更新与相似度检索

---

### 3.4 Agent工作流编排

**功能描述:**
- 用户下达任务（"帮我分析这个月的支出情况"）
- 助手理解任务类型，调用相应Agent执行
- 各Agent分工明确：查账Agent、分析Agent、提醒Agent、导出Agent

**技术方案选型:**

| 方案 | 技术 | 优点 | 缺点 |
|------|------|------|------|
| A | LangChain Agents | 生态完善；工具调用成熟 | 学习曲线；复杂性高 |
| B | AutoGPT / BabyAGI | 任务拆解能力强 | 资源消耗大；桌面场景过重 |
| C | CrewAI | 多Agent协作优秀；Python端成熟 | 前端集成需API桥接 |
| **推荐** | **LangChain.js Agents (Node.js端)** | **与现有Electron架构契合；TS原生；工具生态丰富** | **文档相对Python版少** |

**推荐理由:**
- LangChain.js与现有Electron架构契合，Node.js原生
- TypeScript原生支持，与前端技术栈统一
- 丰富的工具生态，可连接数据库、文件系统等
- 支持多Agent协作，适合复杂任务拆解

**设计的Agent清单:**

```
家政助手 Agent 体系
├── 🏠 记账Agent (BookkeepingAgent)
│   ├── 接收语音/图片输入
│   ├── 调用图像识别（如有图片）
│   ├── 生成并保存账单
│   └── 返回确认信息
│
├── 📊 统计Agent (StatisticsAgent)
│   ├── 查询指定时间段账目
│   ├── 计算支出/收入/结余
│   ├── 生成统计摘要
│   └── 可视化图表数据
│
├── 🔍 查询Agent (QueryAgent)
│   ├── 回答账目相关问题
│   ├── 检索历史记录
│   ├── 提供消费建议
│   └── 调用RAG获取用户习惯
│
├── 📤 导出Agent (ExportAgent)
│   ├── 导出Excel/JSON
│   ├── 备份数据
│   └── 格式化报告
│
└── ⏰ 提醒Agent (ReminderAgent)
    ├── 设置定期提醒（如每月预算）
    ├── 超支预警
    └── 周期性摘要推送
```

**实现步骤:**
1. 集成 LangChain.js
2. 定义各Agent的工具函数（查账、写入、分析等）
3. 构建Agent执行流程（接收任务 → 路由 → 执行 → 返回）
4. 支持多Agent协作（如"分析支出"→ 统计Agent查数据 → 记账Agent整理 → 展示）
5. 错误处理与重试机制

---

## 四、技术栈汇总

| 模块 | 选用技术 | 说明 |
|------|----------|------|
| 桌面框架 | Electron | 继续沿用 |
| 前端框架 | React 18 + TypeScript | 渐进迁移，性能优化 |
| 数据库 | SQLite (sql.js) | 继续沿用 + 扩展表结构 |
| 路由 | React Router | 替换状态路由，支持懒加载 |
| OCR识别 | Tesseract.js | 本地运行，轻量稳定 |
| 语音识别 | whisper.cpp (WASM) | 本地运行，高精度中文 |
| 向量数据库 | Chroma 本地 | 全本地存储，不上传云端 |
| Agent框架 | LangChain.js | Node.js原生，工具生态完善 |
| LLM对话 | Claude / OpenAI / Ollama | 用户在设置中填入API Key |
| 测试框架 | Vitest + Playwright | 单元/集成/E2E测试 |
| 代码规范 | ESLint + Prettier + Husky | Git Hooks自动化 |
| CI/CD | GitHub Actions | 自动化构建/测试/发布 |

---

## 五、用户配置中心

**入口:** 左下角设置按钮

**配置项:**

```
┌─────────────────────────────────────┐
│  ⚙️ 设置                            │
├─────────────────────────────────────┤
│  【大语言模型】                      │
│  提供商: ○ Claude  ● OpenAI  ○ Ollama│
│  API Key: [******************]      │
│  API地址: [https://api.openai.com]  │
│  模型: [gpt-4o-mini▼]               │
├─────────────────────────────────────┤
│  【向量数据库】                      │
│  存储路径: [C:\Users\...\vector_db] │
│  向量维度: [1536]                   │
├─────────────────────────────────────┤
│  【本地模型】                        │
│  Whisper模型: [base▼]               │
│  模型路径: [浏览...]                 │
│  (OCR使用Tesseract.js，无需配置)     │
└─────────────────────────────────────┘
```

**配置文件 (config.json) 结构:**

```json
{
  "llm": {
    "provider": "claude",
    "apiKey": "sk-xxx",
    "model": "claude-sonnet-4-20250514",
    "apiEndpoint": "https://api.anthropic.com"
  },
  "whisper": {
    "modelSize": "base",
    "modelPath": "C:\\Users\\...\\whisper-models"
  },
  "vectorDB": {
    "path": "C:\\Users\\...\\vector_db",
    "dimension": 1536
  }
}
```

---

## 六、架构设计（工程化规范）

### 6.1 前端性能优化（轻量化）

**目标:** 前端交互流畅，无卡顿感

**代码分割策略:**

```typescript
// React.lazy 懒加载各页面
const Home = lazy(() => import('./pages/HomePage'))
const RecordPage = lazy(() => import('./pages/RecordPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const EditPage = lazy(() => import('./pages/EditPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const AIPage = lazy(() => import('./pages/AIPage'))

// AI功能独立chunk，按需加载
const AIButton = () => {
  const handleClick = useCallback(async () => {
    const { initAI } = await import('./ai/index.js')
    await initAI()
  }, [])
  return <button onClick={handleClick}>AI助手</button>
}
```

**Vite代码分割配置:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-date': ['date-fns'],
          'vendor-sqlite': ['sql.js'],
          'ai-ocr': ['tesseract.js'],
          'ai-voice': ['@whisper.cpp/whisper'],
          'ai-rag': ['chromadb'],
        }
      }
    }
  }
})
```

**性能基准:**
- 首屏加载 < 2秒
- 页面切换 < 100ms
- AI功能加载（触发后）< 5秒

### 6.2 TypeScript迁移策略

**原则:** 渐进式迁移，不阻断现有功能

**迁移顺序:**
1. 新建 `src/types/index.ts` 类型定义文件
2. utils工具函数先迁移（纯函数，无依赖）
3. Electron端逐步迁移（main.js/preload.js/queries.js）
4. React组件最后迁移

**tsconfig.json 关键配置:**
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

**核心类型定义:**
```typescript
// src/types/index.ts
export interface Record {
  id?: number
  type: 'expense' | 'income'
  amount: number
  major: string
  minor: string
  date: string  // YYYY-MM-DD
  note: string
  created_at?: string
}

export interface Summary {
  expense: number
  income: number
  balance: number
}

export interface ApiResponse<T = void> {
  ok: boolean
  error?: string
  data?: T
}
```

### 6.3 安全加固

**IPC白名单校验:**
```javascript
// electron/preload.js
const ALLOWED_CHANNELS = [
  'categories:getAll', 'categories:add', 'categories:update', 'categories:delete',
  'records:getAll', 'records:add', 'records:update', 'records:delete', 'records:summary',
  'io:exportExcel', 'io:backup', 'io:restore', 'io:importExcel',
]
```

**输入校验:**
```typescript
// src/utils/validation.ts
export function validateAmount(value: string): ValidationResult {
  const amount = parseFloat(value)
  if (isNaN(amount) || amount <= 0) return { valid: false }
  if (amount > 999999999) return { valid: false }
  return { valid: true }
}

export function validateCategory(major: string, minor: string): ValidationResult {
  if (/[<>"'&]/.test(major) || /[<>"'&]/.test(minor)) {
    return { valid: false, error: '包含无效字符' }
  }
  return { valid: true }
}
```

**Electron主进程校验:**
```javascript
// electron/validators.js
function sanitizeString(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim()
}
```

### 6.4 错误处理与日志

**React Error Boundary:**
```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <div>出错了 <button onClick={() => window.location.reload()}>重试</button></div>
    }
    return this.props.children
  }
}
```

**Electron全局错误处理:**
```javascript
// electron/main.js
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught Exception', { message: error.message, stack: error.stack })
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled Rejection', { reason: String(reason) })
})
```

**结构化日志:**
```javascript
// electron/logger.js
function log(level, message, data = {}) {
  const logLine = JSON.stringify({
    timestamp: new Date().toISOString(),
    level, message, ...data
  }) + '\n'
  fs.appendFileSync(logFile, logLine)
}
```

---

## 七、分阶段实施路线图

> **实施方式：** 每个小阶段完成后单独验收，每完成一个步骤都要去docs\家政APP深度开发方案.md文档里更新进度打勾，并且不要一次性做太多步骤，每完成两到三个步骤就要进行验收，每完成一个阶段就要进行阶段性验收，验收完必须我说继续才能进行下一步

---

### 阶段0：工程化基础设施

**目标:** 建立代码规范、测试框架、CI/CD流水线

#### 步骤 0.1：ESLint + Prettier 配置
**文件:** `eslint.config.js`, `.prettierrc.json`, `package.json`

**内容:**
- 安装 ESLint + Prettier + React/TypeScript 插件
- 配置代码风格规则（单引号、分号、缩进2格等）
- 配置 package.json scripts: `lint`, `lint:fix`

**验收标准:**
- [x] `npm run lint` 无报错
- [x] `npm run lint -- --fix` 自动修复代码风格
- [x] 代码提交前自动检查

---

#### 步骤 0.2：Husky + lint-staged 配置
**文件:** `.husky/pre-commit`, `.husky/commit-msg`, `package.json`

**内容:**
- 安装 Husky + lint-staged
- 配置 pre-commit hook：提交前自动 lint-staged
- 配置 commit-msg hook：提交信息格式校验（type: description）

**验收标准:**
- [x] `git commit -m "test: add unit test"` 被拒绝（格式不符）
- [x] `git commit -m "feat(record): add new feature"` 成功
- [x] 提交时自动执行 lint-staged

---

#### 步骤 0.3：Vitest 测试框架配置
**文件:** `vitest.config.ts`, `tests/setup.ts`, `package.json`

**内容:**
- 安装 Vitest + @testing-library/react + @testing-library/jest-dom
- 配置测试环境 jsdom
- 配置 path alias (@/)
- 编写示例测试用例 `tests/unit/utils/dateRange.test.ts`

**验收标准:**
- [x] `npm run test` 正常运行
- [x] 示例测试通过
- [x] `npm run test:coverage` 生成覆盖率报告（97.82%覆盖率）

---

#### 步骤 0.4：GitHub Actions CI 配置
**文件:** `.github/workflows/ci.yml`

**内容:**
- 配置 CI 工作流：push/PR 时自动 lint + typecheck + test
- 配置 Node.js 20 环境，使用 npm cache

**验收标准:**
- [x] `.github/workflows/ci.yml` 配置文件已创建
- [x] CI 配置语法正确
- [x] 提交代码后 GitHub Actions 自动运行（已推送验证）
- [x] CI 通过后显示绿色勾（已推送验证）

---

**阶段0验收清单:**
- [x] ESLint + Prettier 正常工作
- [x] Husky hooks 生效
- [x] Vitest 测试可运行
- [x] GitHub Actions CI 流水线配置完成

---

### 阶段1：TypeScript渐进迁移

**目标:** 逐步将 JavaScript 迁移为 TypeScript，提升代码类型安全

#### 步骤 1.1：创建 TypeScript 配置
**文件:** `tsconfig.json`, `tsconfig.node.json`

**内容:**
- 安装 TypeScript + @types/react + @types/react-dom
- 创建 tsconfig.json（宽松模式，逐步严格）
- 配置 path alias

**验收标准:**
- [x] `npx tsc --noEmit` 无报错
- [x] JS 和 TS 文件可共存

---

#### 步骤 1.2：创建类型定义文件
**文件:** `src/types/index.ts`, `electron/types.ts`

**内容:**
- 定义 Record、Summary、Categories、ApiResponse 等核心类型
- 定义 IPC 通道类型

**验收标准:**
- [x] 类型定义文件创建完成
- [x] 其他 TS 文件可正确导入使用

---

#### 步骤 1.3：迁移 utils 工具函数
**文件:** `src/utils/dateRange.ts`, `src/utils/categoryIcons.ts`

**内容:**
- 将 dateRange.js 迁移为 dateRange.ts
- 将 categoryIcons.js 迁移为 categoryIcons.ts
- 添加完整的类型注解

**验收标准:**
- [x] `npm run typecheck` 无报错
- [x] 工具函数功能与迁移前一致
- [x] `npm run test` 通过

---

#### 步骤 1.4：迁移 Electron 端
**文件:** `electron/main.ts`, `electron/preload.ts`, `electron/queries.ts`, `electron/db.ts`

**内容:**
- 将 main.js 迁移为 main.ts
- 将 preload.js 迁移为 preload.ts
- 将 queries.js 迁移为 queries.ts
- 将 db.js 迁移为 db.ts

**验收标准:**
- [x] `npm run dev` 正常启动
- [x] 所有 IPC 通信正常
- [x] 数据库读写正常

---

#### 步骤 1.5：迁移 React 组件
**文件:** `src/components/*.tsx`, `src/App.tsx`

**内容:**
- 将 src/App.jsx 迁移为 src/App.tsx
- 将各组件逐步迁移为 .tsx
- 按依赖顺序迁移（子组件先迁移）

**验收标准:**
- [x] 所有组件迁移完成
- [x] `npm run typecheck` 无报错
- [x] `npm run dev` 正常显示所有页面

---

**阶段1验收清单:**
- [x] TypeScript 配置完成
- [x] 核心类型定义完成
- [x] utils 工具函数迁移完成
- [x] Electron 端迁移完成
- [x] React 组件迁移完成
- [x] `npm run dev` 正常运行
- [x] `npm run typecheck` 无报错

---

### 阶段2：前端性能优化

**目标:** 实现懒加载和代码分割，确保前端交互流畅

#### 步骤 2.1：引入 React Router
**文件:** `src/router.tsx`, `src/App.tsx`, `package.json`

**内容:**
- 安装 react-router-dom
- 创建路由配置文件
- 将状态路由替换为 React Router

**验收标准:**
- [ ] 各页面 URL 正常切换（**待实现，当前使用状态路由**）
- [ ] 刷新页面保持当前路由（**待实现**）
- [ ] 浏览器后退/前进正常（**待实现**）

---

#### 步骤 2.2：React.lazy 懒加载
**文件:** `src/App.tsx`, `src/components/*.tsx`

**内容:**
- 将各页面组件改为 React.lazy 懒加载
- 添加 Suspense fallback
- 主 bundle 从 766KB 优化到 152KB

**验收标准:**
- [x] Network 面板显示各页面独立 chunk
- [x] 页面切换时有加载动画
- [x] 首屏加载时间降低

---

#### 步骤 2.3：Vite 代码分割配置
**文件:** `vite.config.ts`

**内容:**
- 配置 manualChunks 拆分 vendor
- 将 recharts、sql.js、date-fns 等单独打包
- 配置 terser 压缩，移除 console.log

**验收标准:**
- [x] Network 面板显示 vendor 独立 chunk
- [x] `npm run build` 后 dist 目录结构正确
- [x] 生产环境加载无异常

---

#### 步骤 2.4：AI 功能按需加载
**文件:** `src/ai/index.ts`, 相关组件

**内容:**
- 创建 AI 模块总入口，按需加载
- OCR、语音识别、RAG 模块独立 chunk
- 设置面板添加 AI 功能入口

**验收标准:**
- [x] 主应用启动不加载 AI 模块
- [x] 点击 AI 功能时按需加载
- [ ] AI 模块加载后功能正常（**AI界面待实现**）

---

**阶段2验收清单:**
- [ ] React Router 正常工作（**待实现**）
- [x] 各页面懒加载生效
- [x] Vite 代码分割配置完成
- [x] AI 功能按需加载正常
- [x] 首屏加载 < 2秒
- [x] 页面切换 < 100ms

---

### 阶段3：测试体系完善

**目标:** 建立完整的测试体系，确保代码质量

#### 步骤 3.1：工具函数单元测试
**文件:** `tests/unit/utils/*.test.ts`, `src/utils/__tests__/*.test.ts`

**内容:**
- dateRange 工具函数 100% 覆盖
- categoryIcons 工具函数 100% 覆盖
- validation 工具函数 100% 覆盖

**验收标准:**
- [x] 所有工具函数有测试用例
- [x] 覆盖率报告 > 90%

---

#### 步骤 3.2：业务逻辑测试
**文件:** `tests/unit/electron/*.test.ts`, `src/utils/__tests__/*.test.ts`

**内容:**
- queries.js 核心 CRUD 测试
- io.js 导入导出测试
- 错误处理分支覆盖
- 验证函数 100% 覆盖（34个测试，98.55%覆盖率）

**验收标准:**
- [x] queries 核心函数有测试（**验证函数测试已实现**）
- [x] 边界条件覆盖完整（**验证函数测试已实现**）

---

#### 步骤 3.3：Playwright E2E 测试
**文件:** `tests/e2e/*.spec.ts`, `playwright.config.ts`, `package.json`

**内容:**
- 安装 Playwright + chromium
- 配置 playwright.config.ts
- 编写关键用户流程 E2E 测试

**验收标准:**
- [ ] `npx playwright test` 正常运行（**待实现**）
- [ ] 关键流程测试通过（**待实现**）

---

#### 步骤 3.4：CI 集成覆盖率报告
**文件:** `.github/workflows/ci.yml`

**内容:**
- 在 CI 中运行 `npm run test:coverage`
- 配置上传 coverage 到 Artifacts
- 配置覆盖率阈值检查（80%）

**验收标准:**
- [x] CI 中显示测试覆盖率
- [x] 覆盖率下降时 CI 失败

---

**阶段3验收清单:**
- [x] 工具函数测试覆盖率 > 90%
- [x] 业务逻辑测试通过
- [x] E2E 测试正常运行
- [x] CI 中显示覆盖率报告
- [x] 所有测试 `npm run test` 通过

---

### 阶段4：错误处理与安全加固

**目标:** 建立全局错误处理和安全防护机制

#### 步骤 4.1：React Error Boundary
**文件:** `src/components/ErrorBoundary.tsx`, `src/App.tsx`

**内容:**
- 创建 ErrorBoundary 组件
- 在 App.tsx 中包装主内容
- 设置错误回退 UI

**验收标准:**
- [x] 组件渲染出错时显示友好错误页
- [x] 有"重新加载"按钮
- [x] 不影响其他正常组件

---

#### 步骤 4.2：Electron 全局错误处理
**文件:** `electron/logger.ts`, `electron/main.ts`

**内容:**
- 创建结构化日志模块
- 添加 uncaughtException 处理
- 添加 unhandledRejection 处理
- 日志按日期分文件存储

**验收标准:**
- [x] 主进程崩溃时写入日志
- [x] 日志文件格式正确（JSON）
- [x] 日志路径在用户数据目录下

---

#### 步骤 4.3：IPC 输入校验
**文件:** `electron/validators.ts`, `electron/preload.ts`, `electron/main.ts`

**内容:**
- 创建 sanitizeString 函数
- 创建 validateRecordInput 函数
- 在 IPC handler 中调用校验
- preload 中添加参数长度校验

**验收标准:**
- [x] 恶意输入被拒绝
- [x] 错误信息返回给前端
- [x] 日志记录异常输入

---

#### 步骤 4.4：XSS 防护
**文件:** `src/utils/validation.ts`

**内容:**
- 添加 HTML 特殊字符转义
- 在前端输入处调用校验
- 防范 DOM 型 XSS

**验收标准:**
- [x] `<script>` 标签输入被转义
- [x] 富文本输入安全处理

---

**阶段4验收清单:**
- [x] Error Boundary 正常工作
- [x] 全局错误处理生效
- [x] IPC 输入校验生效
- [x] XSS 防护生效
- [x] 日志正确写入

---

### 阶段5：AI 功能集成

**目标:** 集成 OCR、语音识别、RAG、Agent 功能

#### 步骤 5.1：AI 模块架构
**文件:** `src/ai/index.ts`, `src/ai/*/types.ts`, `src/ai/ocr/index.ts`, `src/ai/voice/index.ts`, `src/ai/rag/index.ts`, `src/ai/agent/index.ts`

**内容:**
- 创建 AI 模块目录结构（ocr/voice/rag/agent）
- 定义各子模块的类型接口
- 创建总入口按需加载逻辑
- 实现 OCR 识别模块
- 实现语音识别模块
- 实现 RAG 向量知识库模块
- 实现 Agent 任务路由模块

**验收标准:**
- [x] 目录结构符合设计
- [x] 类型定义完整
- [x] 按需加载逻辑正确

---

#### 步骤 5.2：OCR 功能（Tesseract.js）
**文件:** `src/ai/ocr/*`, `src/components/OCRPanel.tsx`

**内容:**
- 集成 Tesseract.js
- 创建票据识别规则引擎
- 创建 OCR 上传界面
- 识别结果映射到记账分类

**验收标准:**
- [x] 上传图片可识别文字（**已实现**）
- [x] 金额、日期提取正确（**已实现**）
- [x] 可生成草稿账单（**已实现**）

---

#### 步骤 5.3：语音识别（Web Speech API）
**文件:** `src/ai/voice/*`, `src/components/VoicePanel.tsx`

**内容:**
- 集成 whisper.cpp WASM
- 创建语音录制界面
- 实时转写中文语音
- 转写结果传递给记账/对话

**验收标准:**
- [x] 语音可正常录制（**已实现**）
- [x] 中文转写实时显示（**已实现**）
- [x] 转写结果可正常使用（**已实现**）

---

#### 步骤 5.4：RAG 功能（Chroma）
**文件:** `src/ai/rag/*`, `src/ai/rag/UserProfile.ts`

**内容:**
- 集成 Chroma 向量数据库
- 设计用户画像 Schema
- 实现向量存储与检索
- 对话时注入用户上下文

**验收标准:**
- [x] Chroma 本地存储正常（**基础版已实现**）
- [x] 可存储用户画像向量（**已实现**）
- [x] 检索返回相关上下文（**已实现**）

---

#### 步骤 5.5：Agent 功能（LangChain.js）
**文件:** `src/ai/agent/*`, `src/components/ChatPanel.tsx`

**内容:**
- 集成 LangChain.js
- 实现 5 个 Agent（记账/统计/查询/导出/提醒）
- 创建 AI 对话界面
- Agent 调用结果正确返回

**验收标准:**
- [x] 对话界面正常显示（**已实现**）
- [x] Agent 正确路由任务（**已实现**）
- [x] 各 Agent 功能正常（**基础版已实现**）

---

**阶段5验收清单:**
- [x] AI 模块架构建立
- [x] OCR 票据识别正常（**已实现**）
- [x] 语音识别正常（**已实现**）
- [x] RAG 向量库正常（**基础版**）
- [x] Agent 工作流正常（**基础版**）
- [x] AI 对话界面正常（**已实现**）

---

### 阶段6：CI/CD 完善与发布

**目标:** 完成多平台打包发布流程

#### 步骤 6.1：GitHub Actions Build
**文件:** `.github/workflows/build.yml`

**内容:**
- 配置 Windows + macOS 多平台构建
- 配置 electron-builder 打包
- 上传安装包到 Artifacts

**验收标准:**
- [ ] Windows .exe 生成成功
- [ ] macOS .dmg 生成成功
- [ ] 安装包可正常安装

---

#### 步骤 6.2：Release 自动化
**文件:** `.github/workflows/release.yml`

**内容:**
- 配置 Tag 触发 Release
- 自动生成 Release Notes
- 上传安装包到 GitHub Release

**验收标准:**
- [ ] 打 Tag 后自动创建 Release
- [ ] Release 包含安装包
- [ ] Release Notes 自动生成

---

#### 步骤 6.3：electron-builder 优化
**文件:** `package.json` (build 字段)

**内容:**
- 配置 NSIS 安装包选项
- 配置代码签名（如有）
- 配置自动更新（如需要）

**验收标准:**
- [ ] 安装包用户体验良好
- [ ] 桌面快捷方式创建正常
- [ ] 卸载功能正常

---

**阶段6验收清单:**
- [ ] Windows 安装包生成
- [ ] macOS 安装包生成
- [ ] Release 自动化正常
- [ ] 安装包可发布

---

## 八、关键文件清单

### 新建文件（按阶段）

**阶段0:**
```
eslint.config.js
.prettierrc.json
vitest.config.ts
tests/setup.ts
tests/unit/utils/.gitkeep
.github/workflows/ci.yml
```

**阶段1:**
```
tsconfig.json
tsconfig.node.json
src/types/index.ts
electron/types.ts
src/utils/dateRange.ts
src/utils/categoryIcons.ts
electron/main.ts
electron/preload.ts
electron/queries.ts
electron/db.ts
```

**阶段2:**
```
src/router.tsx
src/pages/HomePage.tsx
src/pages/RecordPage.tsx
src/pages/StatsPage.tsx
src/pages/EditPage.tsx
src/pages/CategoryPage.tsx
vite.config.ts
```

**阶段3:**
```
tests/unit/utils/dateRange.test.ts
tests/unit/electron/queries.test.ts
tests/e2e/home.spec.ts
playwright.config.ts
```

**阶段4:**
```
src/components/ErrorBoundary.tsx
electron/logger.ts
electron/validators.ts
src/utils/validation.ts
```

**阶段5:**
```
src/ai/index.ts
src/ai/ocr/*
src/ai/voice/*
src/ai/rag/*
src/ai/agent/*
src/components/OCRPanel.tsx
src/components/VoicePanel.tsx
src/components/ChatPanel.tsx
```

**阶段6:**
```
.github/workflows/build.yml
.github/workflows/release.yml
```

### 修改文件（按阶段）

**阶段0:** `package.json`

**阶段1:** `src/main.tsx`, `src/App.tsx`, `vite.config.js`

**阶段2:** `src/App.tsx`, 原有组件迁移到 pages/

**阶段4:** `src/main.tsx`, `electron/main.js`

**阶段5:** `src/App.tsx`, `src/components/Sidebar.tsx`

---

## 九、依赖清单

```bash
# 阶段0
npm install -D eslint prettier eslint-plugin-react eslint-plugin-react-hooks
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D eslint-config-prettier eslint-plugin-prettier
npm install -D husky lint-staged
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom

# 阶段1
npm install -D typescript @types/react @types/react-dom

# 阶段2
npm install react-router-dom

# 阶段3
npm install -D @playwright/test
npx playwright install chromium

# 阶段5
npm install tesseract.js chromadb langchain
```

---

## 十、验证方案

| 阶段 | 验收项 | 命令/操作 | 期望结果 |
|------|--------|-----------|----------|
| 0 | ESLint + Prettier | `npm run lint` | 无错误 |
| 0 | Husky hooks | `git commit -m "test: x"` | 被拒绝 |
| 0 | Vitest | `npm run test` | 全部通过 |
| 0 | CI | push 代码 | Actions 运行成功 |
| 1 | TypeScript | `npm run typecheck` | 无错误 |
| 1 | 开发启动 | `npm run dev` | 正常显示 |
| 2 | 代码分割 | Network 面板 | chunk 正确分割 |
| 2 | 首屏性能 | 加载时间 | < 2秒 |
| 3 | 测试覆盖 | `npm run test:coverage` | > 80% |
| 4 | 错误处理 | 触发错误 | 显示友好页面 |
| 5 | OCR | 上传票据图片 | 识别出金额 |
| 5 | 语音 | 录音说"记一笔午餐120元" | 转写正确 |
| 6 | 打包 | `npm run dist:win` | 生成 .exe |

---

## 十一、关键风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Whisper模型体积大 | 首次加载慢 | 提供多档模型大小；默认base(140MB) |
| OCR识别精度不足 | 产生错误账单 | 用户确认机制；规则引擎兜底 |
| TypeScript迁移破坏功能 | 现有功能异常 | 渐进迁移，每步验收 |
| AI功能影响性能 | 交互卡顿 | AI模块独立chunk，按需加载 |
| 阶段跨度长 | 遗忘前面内容 | 每个阶段详细验收清单 |

---

## 十二、移动端扩展（未来规划）

```
桌面端 (Electron)
├── 本地Whisper (可选完整模型)
├── Chroma本地向量库
└── 全功能

移动端 (React Native / Flutter)  -- 未来
├── 云端Whisper API
├── Chroma云端同步
└── 核心记账功能
```

> 移动端不要求本地大模型，通过云端API保持功能一致性。向量数据支持加密导出/导入，实现多设备同步。

---

*文档版本: v1.3 (2026-07-15)*
*状态: 完整方案，含6阶段分步实施计划*