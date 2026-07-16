// RAG 模块 - 本地向量知识库
// 功能：存储用户消费习惯、学习偏好，检索相关上下文

import type { UserProfile, RAGResult } from '../types';

// 简化的本地向量存储（使用 LocalStorage）
// 生产环境应使用 Chroma 等专业向量数据库
const PROFILE_KEY = 'xiaobai_user_profiles';

// 获取所有用户画像
function getProfiles(): UserProfile[] {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 保存用户画像
function saveProfiles(profiles: UserProfile[]): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

// 添加用户画像
export async function addProfile(type: UserProfile['type'], content: string): Promise<RAGResult> {
  try {
    const profiles = getProfiles();
    const now = new Date().toISOString();

    const newProfile: UserProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      createdAt: now,
      updatedAt: now,
    };

    profiles.push(newProfile);
    saveProfiles(profiles);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '添加画像失败',
    };
  }
}

// 更新用户画像
export async function updateProfile(id: string, content: string): Promise<RAGResult> {
  try {
    const profiles = getProfiles();
    const index = profiles.findIndex((p) => p.id === id);

    if (index === -1) {
      return { success: false, error: '画像不存在' };
    }

    profiles[index].content = content;
    profiles[index].updatedAt = new Date().toISOString();
    saveProfiles(profiles);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新画像失败',
    };
  }
}

// 检索相关上下文（简单关键词匹配）
// 生产环境应使用向量相似度检索
export async function retrieveContext(query: string): Promise<RAGResult> {
  try {
    const profiles = getProfiles();

    // 简单的关键词匹配
    const queryWords = query.toLowerCase().split(/\s+/);
    const matchedProfiles = profiles.filter((profile) => {
      const content = profile.content.toLowerCase();
      return queryWords.some((word) => content.includes(word));
    });

    if (matchedProfiles.length === 0) {
      return { success: true, context: '' };
    }

    // 拼接匹配的上下文
    const context = matchedProfiles.map((p) => `[${p.type}]: ${p.content}`).join('\n');

    return { success: true, context };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '检索失败',
    };
  }
}

// 从记账记录学习用户习惯
export async function learnFromRecord(record: {
  type: string;
  amount: number;
  major: string;
  minor: string;
  note?: string;
}): Promise<void> {
  const content = `用户于${record.type === 'expense' ? '支出' : '收入'}了${record.amount}元，分类为${record.major}-${record.minor}${record.note ? `，备注：${record.note}` : ''}`;

  await addProfile('spending_habit', content);
}

// 清除所有画像
export async function clearProfiles(): Promise<void> {
  localStorage.removeItem(PROFILE_KEY);
}

// 获取统计信息
export function getProfileStats(): { total: number; byType: Record<string, number> } {
  const profiles = getProfiles();
  const byType: Record<string, number> = {};

  for (const profile of profiles) {
    byType[profile.type] = (byType[profile.type] || 0) + 1;
  }

  return { total: profiles.length, byType };
}
