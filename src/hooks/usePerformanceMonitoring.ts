import { useEffect, useRef } from 'react';

type MetricType = 
  | 'page_load'
  | 'api_latency'
  | 'render_time'
  | 'interaction_delay'
  | 'error_rate';

interface Metric {
  type: MetricType;
  name: string;
  value: number;
  unit: 'ms' | 's' | 'percent' | 'count';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * 效能監控 Hook
 * 收集頁面載入時間、API 延遲、渲染時間等指標
 */
export function usePerformanceMonitoring() {
  const metricsRef = useRef<Metric[]>([]);

  // 記錄效能指標
  const recordMetric = (metric: Omit<Metric, 'timestamp'>) => {
    const fullMetric: Metric = {
      ...metric,
      timestamp: Date.now(),
    };
    
    metricsRef.current.push(fullMetric);
    
    // 只保留最近 100 條記錄
    if (metricsRef.current.length > 100) {
      metricsRef.current = metricsRef.current.slice(-100);
    }
    
    // 開發環境輸出到 console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance]', fullMetric);
    }
    
    // 可以擴展發送到遠端監控服務
    // sendToMonitoringService(fullMetric);
  };

  // 測量 API 延遲
  const measureApiLatency = async <T,>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      
      recordMetric({
        type: 'api_latency',
        name: apiName,
        value: Math.round(duration),
        unit: 'ms',
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      recordMetric({
        type: 'api_latency',
        name: `${apiName}_error`,
        value: Math.round(duration),
        unit: 'ms',
        metadata: { error: error instanceof Error ? error.message : 'Unknown' },
      });
      
      throw error;
    }
  };

  // 測量組件渲染時間
  const useRenderTime = (componentName: string) => {
    const startTime = useRef<number>(performance.now());
    
    useEffect(() => {
      const duration = performance.now() - startTime.current;
      
      // 只記錄超過 16ms（1 幀）的渲染
      if (duration > 16) {
        recordMetric({
          type: 'render_time',
          name: componentName,
          value: Math.round(duration),
          unit: 'ms',
        });
      }
    });
  };

  // 測量頁面載入時間
  useEffect(() => {
    const measurePageLoad = () => {
      // 等待頁面完全載入
      if (document.readyState !== 'complete') {
        return;
      }
      
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = [
          { name: 'DNS', value: navigation.domainLookupEnd - navigation.domainLookupStart },
          { name: 'TCP', value: navigation.connectEnd - navigation.connectStart },
          { name: 'TTFB', value: navigation.responseStart - navigation.requestStart },
          { name: 'DOM_parse', value: navigation.domInteractive - navigation.responseEnd },
          { name: 'DOM_complete', value: navigation.domComplete - navigation.domInteractive },
          { name: 'total', value: navigation.loadEventEnd - navigation.startTime },
        ];
        
        metrics.forEach(({ name, value }) => {
          if (value > 0) {
            recordMetric({
              type: 'page_load',
              name: `page_load_${name}`,
              value: Math.round(value),
              unit: 'ms',
            });
          }
        });
      }
    };
    
    // 延遲執行以確保頁面載入完成
    const timer = setTimeout(measurePageLoad, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // 監聽錯誤
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      recordMetric({
        type: 'error_rate',
        name: 'javascript_error',
        value: 1,
        unit: 'count',
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };
    
    const handleRejection = (event: PromiseRejectionEvent) => {
      recordMetric({
        type: 'error_rate',
        name: 'unhandled_rejection',
        value: 1,
        unit: 'count',
        metadata: {
          reason: event.reason?.toString?.() || 'Unknown',
        },
      });
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // 獲取所有指標
  const getMetrics = () => [...metricsRef.current];
  
  // 獲取摘要統計
  const getSummary = () => {
    const metrics = metricsRef.current;
    const lastHour = Date.now() - 3600000;
    
    const recentMetrics = metrics.filter(m => m.timestamp > lastHour);
    
    return {
      totalMetrics: metrics.length,
      recentMetrics: recentMetrics.length,
      avgPageLoad: average(recentMetrics.filter(m => m.type === 'page_load' && m.name === 'page_load_total').map(m => m.value)),
      avgApiLatency: average(recentMetrics.filter(m => m.type === 'api_latency').map(m => m.value)),
      errorCount: recentMetrics.filter(m => m.type === 'error_rate').reduce((sum, m) => sum + m.value, 0),
    };
  };
  
  return {
    recordMetric,
    measureApiLatency,
    useRenderTime,
    getMetrics,
    getSummary,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * 簡化版效能監控 Hook
 * 用於快速測量特定操作
 */
export function usePerformanceTimer() {
  return (operation: string) => {
    const start = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - start;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Timer] ${operation}: ${Math.round(duration)}ms`);
        }
        return duration;
      },
    };
  };
}

export default usePerformanceMonitoring;
