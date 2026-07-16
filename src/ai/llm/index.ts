// LLM 模块 - 调用大语言模型 API
// 支持 Claude / OpenAI / Ollama / 国内主流大模型 + 函数调用

import type { LLMConfig, LLMProvider } from '../../components/Settings';
import { executeTool, getToolsForLLM } from '../tools';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMResult {
  success: boolean;
  message?: string;
  error?: string;
}

// 构建系统提示词
function buildSystemPrompt(): string {
  return `你是"小白家政"APP的智能助手，专门帮助用户管理家庭收支。你是一个真实的人，不是程序员，不要用任何程序员语言跟用户交流。

【核心规则：必须调用工具，禁止伪造结果】

1. 读操作（查账）：必须调用 get_current_time → get_records/get_summary，把真实结果告诉用户
2. 写操作（记账）：用户确认后，必须调用 add_record 工具保存，保存成功才能告诉用户"已记好啦"
3. 绝对禁止：没调用工具就假装已经操作成功，这是在欺骗用户！

【意图判断】
- "记账"、"花了X元"、"买了X"、"收入X元"、"帮我记一笔"、"记录"、"记一下" → 写操作
- "花了多少"、"收入多少"、"有什么记录"、"统计"、"看看最近的"、"查询" → 读操作

【读操作流程】
1. 调用 get_current_time（获取今天真实日期）
2. 调用 calculate_date_range 计算日期范围（如果用户说了具体天数）
3. 调用 get_records 或 get_summary（获取真实账目）
4. 把工具返回的真实数据原原本本告诉用户，不多不少

【查账时必须带日期参数】
- 用户说"最近N天"、"过去N天"、"N天内" → 先调用 calculate_date_range(days=N) 获取日期范围，再用 get_records 查询
- 用户说"本月" → 用 get_current_time 返回的 month_start 和 month_end
- 用户说"本周" → 用 get_current_time 返回的 week_start 和 week_end
- 用户说"最近"但没说具体天数 → 默认查最近10条，不带日期限制
- 禁止不传日期参数就查所有记录！

【写操作流程 - 必须严格遵守】
步骤1：用户说要记账时，先问清楚分类（因为用户可能没说清楚是餐饮还是购物等）
步骤2：展示预览："好的帮你记：支出 X元，分类是XX，今天。确认吗？"
步骤3：等用户回复"是的"、"对"、"确认"、"好的"、"保存"后
步骤4：【必须调用 add_record 工具】，只有工具返回成功才能告诉用户"已记好啦"

【日期规则 - 非常重要】
- 用户说"刚刚"、"今天"、"刚才" → date 用今天的日期（从 get_current_time 获取）
- 用户说"昨天" → date 用昨天的日期
- 用户没说具体日期 → 默认用今天
- 绝对不能自己编造日期（如 2023年、2024年等），如果不确定就问用户"是什么时候的事？"
- add_record 工具的 date 参数格式必须是 YYYY-MM-DD

【重要禁止】
- 绝对不能在用户确认之前就说"已记好"、"已保存"、"已为你记下了"这类话！
- 还没调用 add_record 工具成功返回之前，绝对不能告诉用户保存成功！
- 如果用户问"记录了吗"而你还没真正保存，要说"还没有，我这就帮你保存"，然后调用工具
- 绝对不能编造日期，AI 之前瞎编的所有日期都是错的！

【绝对禁止】
- 没真正保存就告诉用户"已记好啦" — 这是欺骗！
- 出现 { }、[ ]、=> 、function、tool 这类符号
- 说"调用工具"、"执行函数"这类程序员话
- 编造任何金额、日期、分类、记录
- 空记录时瞎编内容

【回复风格】
- 像真人聊天，自然轻松
- 适当用 Emoji，但不要每句都用
- 金额数字要醒目

【工具定义】

get_current_time:
- 用途：获取今天的真实日期
- 参数：无
- 返回：{ date: "2026-07-15", month_start: "2026-07-01", week_start: "2026-07-14", ... }

calculate_date_range:
- 用途：计算"最近N天"的日期范围
- 参数：days（天数，如3、7、30、99等）
- 返回：{ start_date: "2026-07-12", end_date: "2026-07-15", days: 3, description: "最近3天：从2026-07-12到2026-07-15" }
- 示例：用户说"最近99天" → calculate_date_range(days=99) → 得到 start_date 和 end_date → 传给 get_records

get_records:
- 用途：查询账目记录
- 参数：limit(数量), type(expense/income), start_date(开始日期), end_date(结束日期)
- 返回：{ records: [{ id, type, amount, major, minor, date, note }], total: N }
- 重要：total 字段就是真实记录数量！

get_summary:
- 用途：查询收支汇总
- 参数：start_date, end_date
- 返回：{ summary: { total_income, total_expense, balance, record_count, top_categories } }

add_record:
- 用途：保存一笔新账目
- 参数：type(expense/income), amount(金额), major(大类), minor(小类), date(YYYY-MM-DD), note(备注可选)
- 注意：必须等用户明确确认后才调用！`;
}

// 调用 LLM API（支持函数调用）
export async function callLLM(
  userMessage: string,
  config: LLMConfig,
  history: LLMMessage[] = [],
  enableTools: boolean = true
): Promise<LLMResult> {
  // 限制历史长度，避免上下文过长导致模型"失忆"
  const MAX_HISTORY = 10;
  const truncatedHistory = history.length > MAX_HISTORY ? history.slice(-MAX_HISTORY) : history;

  const { provider, apiKey, model, apiEndpoint } = config;

  // Ollama 本地模型（支持函数调用）
  if (provider === 'ollama') {
    return callOllama(
      userMessage,
      apiEndpoint,
      model,
      truncatedHistory,
      enableTools ? getToolsForLLM() : []
    );
  }

  // Claude API（使用自己的函数调用格式）
  if (provider === 'claude') {
    return callClaude(
      userMessage,
      apiKey,
      model,
      apiEndpoint,
      truncatedHistory,
      enableTools ? getToolsForLLM() : []
    );
  }

  // 其他提供商都使用 OpenAI 兼容格式
  return callOpenAICompatible(
    provider,
    userMessage,
    apiKey,
    model,
    apiEndpoint,
    truncatedHistory,
    enableTools ? getToolsForLLM() : []
  );
}

// 调用 Claude API（支持函数调用）
async function callClaude(
  userMessage: string,
  apiKey: string,
  model: string,
  apiEndpoint: string,
  history: LLMMessage[],
  tools: object[] = []
): Promise<LLMResult> {
  if (!apiKey) {
    return { success: false, error: '请先在设置中配置 Claude API Key' };
  }

  try {
    const messages: { role: string; content: string }[] = [
      { role: 'user', content: buildSystemPrompt() },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: 2048,
      messages,
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
    }

    const response = await fetch(`${apiEndpoint}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.error?.message || `API 请求失败: ${response.status}`,
      };
    }

    const data = await response.json();

    // 检查是否有函数调用
    if (data.content && Array.isArray(data.content)) {
      for (const item of data.content) {
        if (item.type === 'tool_use') {
          const toolName = item.name;
          const toolArgs = JSON.parse(item.input);
          const toolResult = await executeTool(toolName, toolArgs);

          messages.push({
            role: 'user',
            content: `工具 ${toolName} 执行结果: ${JSON.stringify(toolResult)}`,
          });

          const secondResponse = await fetch(`${apiEndpoint}/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model,
              max_tokens: 2048,
              messages,
            }),
          });

          const secondData = await secondResponse.json();
          const finalMessage = secondData.content?.[0]?.text || '操作已完成';
          return { success: true, message: finalMessage };
        }
      }
    }

    const message = data.content?.[0]?.text || '没有收到回复';
    return { success: true, message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

// 调用 Ollama 本地模型（支持函数调用）
async function callOllama(
  userMessage: string,
  apiEndpoint: string,
  model: string,
  history: LLMMessage[],
  tools: object[] = []
): Promise<LLMResult> {
  try {
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: false,
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
    }

    const response = await fetch(`${apiEndpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Ollama 请求失败: ${response.status}`,
      };
    }

    const data = await response.json();

    const toolCalls = data.message?.tool_calls;
    if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name;
        const toolArgs =
          typeof toolCall.function?.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function?.arguments || {};

        if (!toolName) continue;

        const toolResult = await executeTool(toolName, toolArgs);

        messages.push({
          role: 'tool',
          content: `工具 ${toolName} 执行结果: ${JSON.stringify(toolResult)}`,
        });
      }

      const secondResponse = await fetch(`${apiEndpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });

      const secondData = await secondResponse.json();
      const finalMessage = secondData.message?.content || '操作已完成';
      return { success: true, message: finalMessage };
    }

    const message = data.message?.content || '没有收到回复';
    return { success: true, message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '无法连接到 Ollama',
    };
  }
}

// OpenAI 兼容格式调用
async function callOpenAICompatible(
  provider: LLMProvider,
  userMessage: string,
  apiKey: string,
  model: string,
  apiEndpoint: string,
  history: LLMMessage[],
  tools: object[] = []
): Promise<LLMResult> {
  if (!apiKey) {
    return { success: false, error: `请先在设置中配置 ${getProviderName(provider)} API Key` };
  }

  try {
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      max_tokens: 2048,
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'required'; // 必须使用工具
      requestBody.parallel_tool_calls = true; // 允许并行工具调用
    }

    const response = await fetch(`${apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.error?.message || `API 请求失败: ${response.status}`,
      };
    }

    const data = await response.json();

    console.log('[AI LLM] API response:', JSON.stringify(data, null, 2));

    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        const toolResult = await executeTool(toolName, toolArgs);

        messages.push({
          role: 'tool',
          content: `工具 ${toolName} 执行结果: ${JSON.stringify(toolResult)}`,
        });
      }

      const secondResponse = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 2048,
        }),
      });

      const secondData = await secondResponse.json();
      const finalMessage = secondData.choices?.[0]?.message?.content || '操作已完成';
      return { success: true, message: finalMessage };
    }

    const message = data.choices?.[0]?.message?.content || '没有收到回复';

    // 【拦截器】：如果回答里出现了金额/日期/分类，但没有调用工具，说明在瞎编！
    // 打回去重问，强制它必须查工具
    if (
      message &&
      (message.includes('¥') ||
        message.includes('元') ||
        message.includes('202') ||
        message.includes('花了') ||
        message.includes('支出') ||
        message.includes('收入'))
    ) {
      console.warn('[AI LLM] 检测到回答包含账目相关数字但没有调用工具，打回重问');

      // 追加一条系统提示，要求必须用工具
      messages.push({
        role: 'user',
        content:
          '你刚才的回答包含了账目金额或日期，但没有调用工具查询！你必须先调用 get_current_time 和 get_records/get_summary 查询真实数据，禁止编造！请重新回答。',
      });

      const retryResponse = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 2048,
          tools,
          tool_choice: 'required',
        }),
      });

      const retryData = await retryResponse.json();
      console.log('[AI LLM] Retry response:', JSON.stringify(retryData, null, 2));

      const retryToolCalls = retryData.choices?.[0]?.message?.tool_calls;
      if (retryToolCalls && Array.isArray(retryToolCalls) && retryToolCalls.length > 0) {
        for (const toolCall of retryToolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const toolResult = await executeTool(toolName, toolArgs);
          messages.push({
            role: 'tool',
            content: `工具 ${toolName} 执行结果: ${JSON.stringify(toolResult)}`,
          });
        }

        const thirdResponse = await fetch(`${apiEndpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 2048,
          }),
        });

        const thirdData = await thirdResponse.json();
        const finalMessage = thirdData.choices?.[0]?.message?.content || '操作已完成';
        return { success: true, message: finalMessage };
      }

      // 重试后还是没有工具调用，返回原始回答但加警告
      return {
        success: true,
        message: message + '\n\n（请注意：查询结果来自 AI 自身知识，建议联网确认）',
      };
    }

    return { success: true, message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

function getProviderName(provider: LLMProvider): string {
  const names: Record<LLMProvider, string> = {
    claude: 'Claude',
    openai: 'OpenAI',
    ollama: 'Ollama',
    deepseek: 'DeepSeek',
    qwen: '通义千问',
    yi: '零一万物',
    zhipu: '智谱 GLM',
    minimax: 'MiniMax',
    moonshot: 'Kimi',
    baidu: '文心一言',
    spark: '讯飞星火',
  };
  return names[provider] || provider;
}
