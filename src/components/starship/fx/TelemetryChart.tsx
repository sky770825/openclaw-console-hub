/**
 * TelemetryChart — ECharts GPU 加速即時遙測圖表
 *
 * 模擬星艦感測器的即時資料流。
 * 支援多系列、串流資料、自動更新。
 */
import { useRef, useEffect, useCallback, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

interface TelemetrySeries {
  name: string;
  color: string;
}

interface Props {
  /** 系列定義 */
  series?: TelemetrySeries[];
  /** 資料點數量上限 */
  maxPoints?: number;
  /** 更新間隔（ms） */
  interval?: number;
  /** 圖表高度 */
  height?: number;
  /** 標題 */
  title?: string;
}

const DEFAULT_SERIES: TelemetrySeries[] = [
  { name: "護盾功率", color: "#22d3ee" },
  { name: "引擎輸出", color: "#fbbf24" },
  { name: "感測器靈敏度", color: "#a78bfa" },
];

function generateValue(prev: number): number {
  const delta = (Math.random() - 0.5) * 15;
  return Math.max(5, Math.min(100, prev + delta));
}

export default function TelemetryChart({
  series = DEFAULT_SERIES,
  maxPoints = 60,
  interval = 1000,
  height = 220,
  title = "即時遙測",
}: Props) {
  const chartRef = useRef<ReactECharts>(null);
  const dataRef = useRef<number[][]>(
    series.map(() => Array.from({ length: 20 }, () => 40 + Math.random() * 30)),
  );
  const [, forceUpdate] = useState(0);

  const buildOption = useCallback((): EChartsOption => {
    const now = Date.now();
    const timeLabels = dataRef.current[0].map((_, i) => {
      const t = new Date(now - (dataRef.current[0].length - 1 - i) * interval);
      return `${t.getMinutes().toString().padStart(2, "0")}:${t.getSeconds().toString().padStart(2, "0")}`;
    });

    return {
      backgroundColor: "transparent",
      title: {
        text: title,
        textStyle: { color: "#9d9daa", fontSize: 12, fontWeight: "normal" },
        left: 0,
        top: 0,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(6,6,10,0.9)",
        borderColor: "rgba(34,211,238,0.3)",
        textStyle: { color: "#e2e8f0", fontSize: 11 },
      },
      legend: {
        data: series.map((s) => s.name),
        textStyle: { color: "#9d9daa", fontSize: 10 },
        top: 0,
        right: 0,
      },
      grid: { left: 40, right: 12, top: 32, bottom: 24 },
      xAxis: {
        type: "category",
        data: timeLabels,
        axisLine: { lineStyle: { color: "#2a2a3a" } },
        axisLabel: { color: "#6b7280", fontSize: 9 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisLabel: { color: "#6b7280", fontSize: 9 },
        splitLine: { lineStyle: { color: "#1a1a2a" } },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: "line" as const,
        data: dataRef.current[i],
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: s.color },
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: s.color + "30" },
              { offset: 1, color: s.color + "05" },
            ],
          },
        },
      })),
      animation: true,
      animationDuration: 300,
    };
  }, [series, interval, maxPoints, title]);

  useEffect(() => {
    const timer = setInterval(() => {
      dataRef.current = dataRef.current.map((arr) => {
        const newVal = generateValue(arr[arr.length - 1]);
        const next = [...arr, newVal];
        if (next.length > maxPoints) next.shift();
        return next;
      });
      forceUpdate((n) => n + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, maxPoints]);

  return (
    <ReactECharts
      ref={chartRef}
      option={buildOption()}
      style={{ height, width: "100%" }}
      notMerge
      lazyUpdate
    />
  );
}
