import { useState, useCallback, useEffect } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseAsyncOptions<T> {
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseAsyncReturn<T> extends UseAsyncState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  setData: (data: T | null) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T> {
  const { initialData = null, onSuccess, onError } = options;

  const [state, setState] = useState<UseAsyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await asyncFunction(...args);
      setState({ data: result, isLoading: false, error: null });
      onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, isLoading: false, error: err }));
      onError?.(err);
      return null;
    }
  }, [asyncFunction, onSuccess, onError]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, isLoading: false, error: null });
  }, [initialData]);

  return {
    ...state,
    execute,
    setData,
    setError,
    reset,
  };
}

export function useAsyncEffect<T>(
  asyncFunction: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseAsyncOptions<T> = {}
): UseAsyncState<T> {
  const { initialData = null, onSuccess, onError } = options;

  const [state, setState] = useState<UseAsyncState<T>>({
    data: initialData,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const execute = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await asyncFunction();
        if (isMounted) {
          setState({ data: result, isLoading: false, error: null });
          onSuccess?.(result);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (isMounted) {
          setState(prev => ({ ...prev, isLoading: false, error: err }));
          onError?.(err);
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, deps);

  return state;
}
