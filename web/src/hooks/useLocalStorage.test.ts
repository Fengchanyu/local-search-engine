import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('returns stored value from localStorage', () => {
    localStorageMock.setItem('test-key', JSON.stringify('stored'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('updated'));
  });

  it('supports function updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('removes value from localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBe('initial');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('handles custom serializer/deserializer', () => {
    const serializer = (value: Date) => value.toISOString();
    const deserializer = (value: string) => new Date(value);
    const date = new Date('2024-01-01');

    const { result } = renderHook(() =>
      useLocalStorage('date-key', date, { serializer, deserializer })
    );

    expect(result.current[0]).toEqual(date);

    const newDate = new Date('2024-12-31');
    act(() => {
      result.current[1](newDate);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('date-key', newDate.toISOString());
  });
});
