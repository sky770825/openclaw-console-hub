import { useRef, useCallback } from 'react';

interface DebounceOptions {
  delay?: number;
  immediate?: boolean;
}

/**
 * 防抖 Hook
 * 延遲執行函數，避免短時間內多次觸發
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: DebounceOptions = {}
) {
  const { delay = 300, immediate = false } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (immediate && !timeoutRef.current) {
        fn(...args);
      }

      timeoutRef.current = setTimeout(() => {
        if (!immediate) {
          fn(...args);
        }
        timeoutRef.current = null;
      }, delay);
    },
    [fn, delay, immediate]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { debouncedFn, cancel };
}

/**
 * 請求去重 Hook
 * 防止同一請求在進行中被重複發送
 */
export function useRequestDedupe() {
  const pendingRequests = useRef<Map<string, Promise<unknown>>>(new Map());

  const dedupeRequest = useCallback(<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // 如果已有相同 key 的請求在進行中，返回現有的 promise
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key) as Promise<T>;
    }

    // 創建新的請求
    const promise = requestFn().finally(() => {
      // 請求完成後從 map 中移除
      pendingRequests.current.delete(key);
    });

    pendingRequests.current.set(key, promise);
    return promise;
  }, []);

  const clearPending = useCallback((key?: string) => {
    if (key) {
      pendingRequests.current.delete(key);
    } else {
      pendingRequests.current.clear();
    }
  }, []);

  return { dedupeRequest, clearPending };
}

/**
 * 節流 Hook
 * 限制函數執行頻率
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number = 300
) {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledFn = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = limit - (now - lastRunRef.current);

      if (remaining <= 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        lastRunRef.current = now;
        fn(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          timeoutRef.current = null;
          fn(...args);
        }, remaining);
      }
    },
    [fn, limit]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { throttledFn, cancel };
}

/**
 * 組合 Hook：防抖 + 去重
 * 常用於搜尋輸入等場景
 */
export function useDebouncedDedupe<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: { debounceMs?: number; dedupeKey: string | ((...args: Parameters<T>) => string) } = { dedupeKey: 'default' }
) {
  const { debouncedFn } = useDebounce(fn, { delay: options.debounceMs ?? 300 });
  const { dedupeRequest } = useRequestDedupe();
  const { dedupeKey } = options;

  const execute = useCallback(
    (...args: Parameters<T>): ReturnType<T> => {
      const key = typeof dedupeKey === 'function' ? dedupeKey(...args) : dedupeKey;
      
      return dedupeRequest(key, () => debouncedFn(...args)) as ReturnType<T>;
    },
    [debouncedFn, dedupeRequest, dedupeKey]
  );

  return execute;
}
