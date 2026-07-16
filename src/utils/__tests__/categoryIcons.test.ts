import { describe, it, expect } from 'vitest';
import { majorIcon } from '../categoryIcons';

describe('majorIcon', () => {
  it('returns correct icon for known major categories', () => {
    expect(majorIcon('餐饮')).toBe('🍚');
    expect(majorIcon('交通')).toBe('🚗');
    expect(majorIcon('购物')).toBe('🛍️');
    expect(majorIcon('居住')).toBe('🏠');
    expect(majorIcon('娱乐')).toBe('🎮');
    expect(majorIcon('医疗')).toBe('💊');
    expect(majorIcon('人情')).toBe('🎁');
    expect(majorIcon('学习')).toBe('📚');
    expect(majorIcon('其他')).toBe('📦');
    expect(majorIcon('工资')).toBe('💰');
    expect(majorIcon('兼职')).toBe('💼');
    expect(majorIcon('投资')).toBe('📈');
  });

  it('returns default icon for unknown categories', () => {
    expect(majorIcon('未知分类')).toBe('🏷️');
    expect(majorIcon('')).toBe('🏷️');
    expect(majorIcon('自定义大类')).toBe('🏷️');
  });
});
