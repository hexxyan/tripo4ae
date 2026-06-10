import { useTranslation, translations } from '../../src/client/hooks/useTranslation';
import { useStore } from '../../src/client/stores/useStore';
import { renderHook, act } from '@testing-library/react';

describe('useTranslation Hook', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    act(() => {
      useStore.setState({ language: 'en' });
    });
  });

  it('translates keys to English by default', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('tabGenerate')).toBe('Generate');
    expect(result.current.t('connect')).toBe('Connect');
  });

  it('translates keys to Chinese when language is zh', () => {
    act(() => {
      useStore.setState({ language: 'zh' });
    });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('tabGenerate')).toBe('模型生成');
    expect(result.current.t('connect')).toBe('连接');
  });

  it('falls back to English when a key is missing in Chinese', () => {
    // Temporarily add a missing key to translations
    const origZh = (translations.zh as any).onlyInEnglish;
    const origEn = (translations.en as any).onlyInEnglish;
    
    (translations.en as any).onlyInEnglish = 'English Value';
    delete (translations.zh as any).onlyInEnglish;

    try {
      act(() => {
        useStore.setState({ language: 'zh' });
      });
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t('onlyInEnglish' as any)).toBe('English Value');
    } finally {
      // Clean up
      if (origEn) (translations.en as any).onlyInEnglish = origEn;
      else delete (translations.en as any).onlyInEnglish;
      if (origZh) (translations.zh as any).onlyInEnglish = origZh;
    }
  });

  it('returns the key itself if missing in both languages', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('nonExistentKey' as any)).toBe('nonExistentKey');
  });

  it('updates translation dynamically when language is changed', () => {
    const { result } = renderHook(() => useTranslation());
    
    expect(result.current.t('tabLibrary')).toBe('Library');
    
    act(() => {
      result.current.setLanguage('zh');
    });

    expect(result.current.t('tabLibrary')).toBe('本地模型库');
    expect(useStore.getState().language).toBe('zh');
  });
});
