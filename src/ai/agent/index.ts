// Agent 模块 - 任务自动化
// 功能：记账Agent、统计Agent、查询Agent等

import type { AgentResult } from '../types';
import type { RecordEntry } from '../../types';
import { retrieveContext } from '../rag/index';

// Agent 接口
interface Agent {
  name: string;
  description: string;
  execute(task: string, context?: unknown): Promise<AgentResult>;
}

// 解析自然语言记账命令
function parseBookkeepingCommand(task: string): {
  type?: 'expense' | 'income';
  amount?: number;
  major?: string;
  minor?: string;
  note?: string;
} | null {
  const lowerTask = task.toLowerCase();

  // 匹配金额
  const amountMatch = task.match(/(\d+\.?\d{0,2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

  // 判断是支出还是收入
  const isExpense =
    lowerTask.includes('花') ||
    lowerTask.includes('支') ||
    lowerTask.includes('买') ||
    lowerTask.includes('消费') ||
    lowerTask.includes('用了');
  const isIncome =
    lowerTask.includes('收入') ||
    lowerTask.includes('赚') ||
    lowerTask.includes('得到') ||
    lowerTask.includes('进账');

  const type = isIncome ? 'income' : isExpense ? 'expense' : undefined;

  // 判断分类
  const categoryKeywords: Record<string, string[]> = {
    餐饮: ['吃饭', '餐', '食', '饭', '外卖', '厨房'],
    交通: ['车', '交通', '油', '公交', '地铁', '打车', ' taxi'],
    购物: ['买', '购物', '商品', '超市', '网购', '衣服', '鞋', '包'],
    居住: ['房租', '水电', '物业', '宽带', '话费', '住'],
    娱乐: ['娱乐', '电影', '游戏', '旅游', '运动', '健身', ' KTV', '酒吧'],
    医疗: ['医疗', '医院', '药', '看病', '体检', '医保'],
    人情: ['人情', '红包', '送礼', '请客', '孝敬'],
    学习: ['学习', '书籍', '课程', '文具', '培训', '学费'],
    工资: ['工资', '月薪', '奖金', '补贴', '收入'],
    兼职: ['兼职', '外快', '副业'],
    投资: ['投资', '理财', '利息', '分红', '股票'],
  };

  let major = '其他';
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((k) => lowerTask.includes(k))) {
      major = cat;
      break;
    }
  }

  if (!type && !amount) {
    return null;
  }

  return {
    type,
    amount,
    major,
    minor: 'AI识别',
    note: task,
  };
}

// 记账 Agent
const bookkeepingAgent: Agent = {
  name: '记账Agent',
  description: '帮助用户快速记账，识别语音或图片中的记账信息',
  async execute(task: string): Promise<AgentResult> {
    try {
      const parsed = parseBookkeepingCommand(task);

      if (!parsed || !parsed.type || !parsed.amount) {
        return {
          success: false,
          message: '我需要知道是支出还是收入以及金额。请说"记一笔支出100元"这样的格式',
        };
      }

      // 返回记账数据，由调用方通过 IPC 保存
      return {
        success: true,
        message: `已识别：${parsed.type === 'expense' ? '支出' : '收入'} ${parsed.amount} 元，分类：${parsed.major}`,
        data: {
          type: parsed.type,
          amount: parsed.amount,
          major: parsed.major,
          minor: parsed.minor || 'AI识别',
          date: new Date().toISOString().split('T')[0],
          note: parsed.note || 'AI助手记录',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: '记账失败',
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  },
};

// 统计 Agent
const statisticsAgent: Agent = {
  name: '统计Agent',
  description: '分析用户的收支情况，生成统计摘要',
  async execute(
    task: string,
    context?: { records?: RecordEntry[]; ragContext?: string }
  ): Promise<AgentResult> {
    try {
      const records = context?.records || [];
      const ragContext = context?.ragContext;

      if (records.length === 0) {
        return { success: true, message: '暂无记录，无法统计' };
      }

      let totalExpense = 0;
      let totalIncome = 0;
      const categoryMap: Record<string, number> = {};

      for (const record of records) {
        if (record.type === 'expense') {
          totalExpense += record.amount;
        } else {
          totalIncome += record.amount;
        }

        const key = `${record.major}-${record.minor}`;
        categoryMap[key] = (categoryMap[key] || 0) + record.amount;
      }

      // 找出支出最多的分类
      const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
      const topCategory = sortedCategories[0];

      let message = `📊 统计摘要\n\n💰 总收入：${totalIncome.toFixed(2)} 元\n💸 总支出：${totalExpense.toFixed(2)} 元\n📈 结余：${(totalIncome - totalExpense).toFixed(2)} 元\n\n📝 共 ${records.length} 笔记录`;

      if (topCategory) {
        message += `\n\n🏆 最大支出：${topCategory[0]} (${topCategory[1].toFixed(2)} 元)`;
      }

      // 如果有 RAG 上下文，添加用户习惯分析
      if (ragContext) {
        message += `\n\n📋 根据您的习惯分析：${ragContext}`;
      }

      return {
        success: true,
        message,
        data: {
          totalExpense,
          totalIncome,
          balance: totalIncome - totalExpense,
          topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
          recordCount: records.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: '统计失败',
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  },
};

// 查询 Agent
const queryAgent: Agent = {
  name: '查询Agent',
  description: '回答用户关于账目、分类、习惯的问题',
  async execute(
    task: string,
    context?: { records?: RecordEntry[]; ragContext?: string }
  ): Promise<AgentResult> {
    try {
      const records = context?.records || [];
      const ragContext = context?.ragContext;
      const lowerQuery = task.toLowerCase();

      // 查询支出相关
      if (lowerQuery.includes('支出') || lowerQuery.includes('花了多少')) {
        const expenseRecords = records.filter((r) => r.type === 'expense');
        const total = expenseRecords.reduce((sum, r) => sum + r.amount, 0);
        let message = `您共有 ${expenseRecords.length} 笔支出记录，总支出 ${total.toFixed(2)} 元。`;
        if (expenseRecords.length > 0) {
          const avg = total / expenseRecords.length;
          message += ` 平均每笔 ${avg.toFixed(2)} 元。`;
        }
        return { success: true, message };
      }

      // 查询收入相关
      if (lowerQuery.includes('收入') || lowerQuery.includes('赚了多少')) {
        const incomeRecords = records.filter((r) => r.type === 'income');
        const total = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
        return {
          success: true,
          message: `您共有 ${incomeRecords.length} 笔收入记录，总收入 ${total.toFixed(2)} 元。`,
        };
      }

      // 查询结余
      if (lowerQuery.includes('结余') || lowerQuery.includes('剩多少')) {
        let totalExpense = 0;
        let totalIncome = 0;
        for (const r of records) {
          if (r.type === 'expense') totalExpense += r.amount;
          else totalIncome += r.amount;
        }
        const balance = totalIncome - totalExpense;
        return {
          success: true,
          message: `您的结余为 ${balance.toFixed(2)} 元 (收入 ${totalIncome.toFixed(2)} - 支出 ${totalExpense.toFixed(2)})`,
        };
      }

      // 如果有 RAG 上下文，回复个性化内容
      if (ragContext) {
        return {
          success: true,
          message: `根据您的记录：${ragContext}\n\n您可以问我："这个月花了多少？"、"收入多少？"等统计问题。`,
        };
      }

      // 默认返回最近记录
      const recent = records.slice(0, 5);
      if (recent.length === 0) {
        return { success: true, message: '您还没有任何记录，要我帮您记一笔吗？😊' };
      }

      const recordList = recent
        .map(
          (r) =>
            `${r.type === 'expense' ? '💸' : '💰'} ${r.type === 'expense' ? '支出' : '收入'}${r.amount}元 (${r.major})`
        )
        .join('\n');

      return {
        success: true,
        message: `📝 您最近有 ${recent.length} 笔记录：\n\n${recordList}`,
      };
    } catch (error) {
      return {
        success: false,
        message: '查询失败',
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  },
};

// 路由函数：根据任务类型选择 Agent
export async function routeTask(task: string, context?: unknown): Promise<AgentResult> {
  const lowerTask = task.toLowerCase();

  // 获取 RAG 上下文
  let ragContext = '';
  try {
    const ragResult = await retrieveContext(task);
    if (ragResult.success && ragResult.context) {
      ragContext = ragResult.context;
    }
  } catch {
    // RAG 不可用时继续
  }

  const agentContext = { ...((context as object) || {}), ragContext };

  // 根据关键词路由到不同的 Agent
  if (
    lowerTask.includes('记') ||
    lowerTask.includes('花') ||
    lowerTask.includes('支') ||
    lowerTask.includes('收入') ||
    lowerTask.includes('赚')
  ) {
    // 检查是否像记账命令
    const parsed = parseBookkeepingCommand(task);
    if (parsed && (parsed.type || parsed.amount)) {
      return bookkeepingAgent.execute(task, agentContext);
    }
  }

  if (
    lowerTask.includes('统计') ||
    lowerTask.includes('分析') ||
    lowerTask.includes('多少') ||
    lowerTask.includes('总和')
  ) {
    return statisticsAgent.execute(task, agentContext);
  }

  if (
    lowerTask.includes('查') ||
    lowerTask.includes('看') ||
    lowerTask.includes('有') ||
    lowerTask.includes('吗')
  ) {
    return queryAgent.execute(task, agentContext);
  }

  // 默认使用查询 Agent
  return queryAgent.execute(task, agentContext);
}

// 处理用户命令并返回结果
export async function processCommand(command: string): Promise<AgentResult> {
  return routeTask(command);
}

// 获取所有 Agent 列表
export function getAgents(): Agent[] {
  return [bookkeepingAgent, statisticsAgent, queryAgent];
}
