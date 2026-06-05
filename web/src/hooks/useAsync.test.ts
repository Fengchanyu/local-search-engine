import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAsync, useAsyncEffect } from './useAsync';

describe('useAsync', () => {
  it('returns initial state', () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(asyncFn));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('executes async function and returns data', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('result');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles errors', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('calls onSuccess callback', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAsync(asyncFn, { onSuccess }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith('result');
  });

  it('calls onError callback', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const { result } = renderHook(() => useAsync(asyncFn, { onError }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('sets data manually', () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(asyncFn));

    act(() => {
      result.current.setData('manual data');
    });

    expect(result.current.data).toBe('manual data');
  });

  it('resets state', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(asyncFn, { initialData: 'initial' }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('result');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe('initial');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useAsyncEffect', () => {
  it('executes async function on mount', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsyncEffect(asyncFn, []));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe('result');
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('re-executes when dependencies change', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result, rerender } = renderHook(
      ({ dep }) => useAsyncEffect(() => asyncFn(dep), [dep]),
      { initialProps: { dep: 1 } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);

    rerender({ dep: 2 });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(asyncFn).toHaveBeenCalledTimes(2);
  });
});
