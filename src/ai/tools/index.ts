// 工具模块 - AI 可调用的函数
// 定义记账相关的操作，供 AI 调用

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

// 可用工具列表
export const AVAILABLE_TOOLS: Tool[] = [
  {
    name: 'get_current_time',
    description:
      '获取当前日期和时间。返回今天的日期、本周/本月/上周的开始和结束日期，以及今天是什么星期几。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'calculate_date_range',
    description:
      '根据天数计算日期范围。比如用户说"最近N天"、"过去N天"、"N天内"，就用这个工具计算从N天前到今天的日期范围。',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: '天数，比如3表示最近3天，7表示最近7天，30表示最近30天',
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_records',
    description:
      '获取账目记录列表。返回按日期倒序的所有记录，每条记录包含类型、金额、分类、日期、备注。',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '返回记录数量，默认10条，最大100条' },
        type: {
          type: 'string',
          description: '筛选类型：expense(支出) 或 income(收入)，不填则返回所有',
        },
        start_date: { type: 'string', description: '开始日期，格式 YYYY-MM-DD' },
        end_date: { type: 'string', description: '结束日期，格式 YYYY-MM-DD' },
      },
      required: [],
    },
  },
  {
    name: 'get_summary',
    description: '获取收支汇总统计。返回总收入、总支出、结余、支出最多的分类。',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: '开始日期，格式 YYYY-MM-DD' },
        end_date: { type: 'string', description: '结束日期，格式 YYYY-MM-DD' },
      },
      required: [],
    },
  },
  {
    name: 'add_record',
    description:
      '新增一笔账目记录。只有当用户明确确认（如回复"确认"、"好的"、"保存"）后才调用此工具。',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '类型：expense(支出) 或 income(收入)' },
        amount: { type: 'number', description: '金额，必须大于0' },
        major: { type: 'string', description: '大类分类，如"餐饮"、"交通"、"工资"' },
        minor: { type: 'string', description: '小类分类，如"早餐"、"打车"、"月薪"' },
        date: { type: 'string', description: '日期，格式 YYYY-MM-DD，默认为今天' },
        note: { type: 'string', description: '备注说明，可选' },
      },
      required: ['type', 'amount', 'major', 'minor'],
    },
  },
];

// 工具执行函数
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  console.log('[AI Tools] executeTool called:', toolName, args);

  // 强制刷新账目数据
  if (toolName === 'get_records' || toolName === 'get_summary') {
    console.log('[AI Tools] 正在从数据库获取真实数据...');
  }

  switch (toolName) {
    case 'calculate_date_range': {
      const days = Number(args.days);
      if (isNaN(days) || days < 1) {
        return { success: false, error: '天数必须是正整数' };
      }
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - days);
      const start = startDate.toISOString().split('T')[0];
      return {
        success: true,
        start_date: start,
        end_date: today,
        days,
        description: `最近${days}天：从${start}到${today}`,
      };
    }

    case 'get_current_time': {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const date = now.getDate();
      const day = now.getDay();

      // 计算本月第一天和最后一天
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);

      // 计算本周第一天（周一）和最后一天（周日）
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(date - day + (day === 0 ? -6 : 1));
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

      // 计算上周
      const lastWeekStart = new Date(firstDayOfWeek);
      lastWeekStart.setDate(firstDayOfWeek.getDate() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

      // 计算3天前和7天前
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(date - 3);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(date - 7);

      return {
        success: true,
        current_time: {
          date: `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
          datetime: now.toISOString(),
          week_start: firstDayOfWeek.toISOString().split('T')[0],
          week_end: lastDayOfWeek.toISOString().split('T')[0],
          month_start: firstDayOfMonth.toISOString().split('T')[0],
          month_end: lastDayOfMonth.toISOString().split('T')[0],
          last_week_start: lastWeekStart.toISOString().split('T')[0],
          last_week_end: lastWeekEnd.toISOString().split('T')[0],
          three_days_ago: threeDaysAgo.toISOString().split('T')[0],
          seven_days_ago: sevenDaysAgo.toISOString().split('T')[0],
          day_of_week: day,
          day_names: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
        },
      };
    }

    case 'get_records': {
      console.log('[AI Tools] Calling window.api.getRecords()');
      const records = await window.api.getRecords();
      console.log('[AI Tools] getRecords returned:', records.length, 'records');
      let filtered = records;

      // 按类型筛选
      if (args.type) {
        filtered = filtered.filter((r: { type: string }) => r.type === args.type);
      }

      // 按日期筛选
      if (args.start_date) {
        filtered = filtered.filter((r: { date: string }) => r.date >= (args.start_date as string));
      }
      if (args.end_date) {
        filtered = filtered.filter((r: { date: string }) => r.date <= (args.end_date as string));
      }

      // 限制数量
      const limit = Math.min(Number(args.limit) || 10, 100);
      filtered = filtered.slice(0, limit);

      return {
        success: true,
        records: filtered,
        total: filtered.length,
        query_params: {
          start_date: args.start_date,
          end_date: args.end_date,
          type: args.type,
          limit,
        },
        note: `数据库中最近3天有 ${filtered.length} 笔记录`,
      };
    }

    case 'get_summary': {
      const records = await window.api.getRecords();
      let filtered = records;

      // 按日期筛选
      if (args.start_date) {
        filtered = filtered.filter((r: { date: string }) => r.date >= (args.start_date as string));
      }
      if (args.end_date) {
        filtered = filtered.filter((r: { date: string }) => r.date <= (args.end_date as string));
      }

      // 计算汇总
      let totalIncome = 0;
      let totalExpense = 0;
      const categoryMap: Record<string, number> = {};

      for (const record of filtered) {
        if (record.type === 'income') {
          totalIncome += record.amount;
        } else {
          totalExpense += record.amount;
          const key = `${record.major}-${record.minor}`;
          categoryMap[key] = (categoryMap[key] || 0) + record.amount;
        }
      }

      // 找出支出最多的分类
      const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amount]) => ({ name, amount }));

      return {
        success: true,
        summary: {
          total_income: totalIncome,
          total_expense: totalExpense,
          balance: totalIncome - totalExpense,
          record_count: filtered.length,
          top_categories: topCategories,
        },
      };
    }

    case 'add_record': {
      const today = new Date().toISOString().split('T')[0];
      let recordDate = (args.date as string) || today;

      // 如果日期是过去太久的日期（AI瞎编的），用今天
      const recordYear = parseInt(recordDate.split('-')[0]);
      if (recordYear < 2025) {
        console.warn('[AI Tools] AI传入日期异常，使用今天日期:', recordDate);
        recordDate = today;
      }

      const record = {
        type: args.type as 'expense' | 'income',
        amount: Number(args.amount),
        major: args.major as string,
        minor: args.minor as string,
        date: recordDate,
        note: (args.note as string) || '',
      };

      if (!record.type || !record.amount || !record.major || !record.minor) {
        return { success: false, error: '缺少必要的参数' };
      }
      if (record.amount <= 0) {
        return { success: false, error: '金额必须大于0' };
      }

      console.log('[AI Tools] 正在保存记录:', record);
      await window.api.addRecord(record);
      return {
        success: true,
        message: `已保存成功！`,
      };
    }

    default:
      return { success: false, error: `未知工具: ${toolName}` };
  }
}

// 将工具转换为 OpenAI 格式
export function getToolsForLLM(): object[] {
  return AVAILABLE_TOOLS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
