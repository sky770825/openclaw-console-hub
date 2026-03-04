/**
 * Live2D 角色渲染組件
 * 使用 @naari3/pixi-live2d-display + PixiJS v8
 * 支援 Cubism 4 模型載入、互動點擊、表情/動作切換
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Live2DCharacterProps {
  /** Live2D 模型 URL（.model3.json） */
  modelUrl: string;
  /** 容器高度（px） */
  height?: number;
  /** 容器寬度（px），預設 100% */
  width?: number | string;
  /** 是否允許互動（點擊觸發動作） */
  interactive?: boolean;
  /** 背景透明 */
  transparent?: boolean;
  /** 額外 class */
  className?: string;
  /** 點擊回調 */
  onTap?: (hitAreas: string[]) => void;
}

// 動態載入 — 避免 SSR 和首屏 bundle 負擔
let pixiPromise: Promise<typeof import("pixi.js")> | null = null;
let live2dPromise: Promise<typeof import("@naari3/pixi-live2d-display")> | null = null;

function loadPixi() {
  if (!pixiPromise) pixiPromise = import("pixi.js");
  return pixiPromise;
}
function loadLive2D() {
  if (!live2dPromise) live2dPromise = import("@naari3/pixi-live2d-display");
  return live2dPromise;
}

export default function Live2DCharacter({
  modelUrl,
  height = 480,
  width = "100%",
  interactive = true,
  transparent = true,
  className,
  onTap,
}: Live2DCharacterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<InstanceType<(typeof import("pixi.js"))["Application"]> | null>(null);
  const modelRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (appRef.current) {
      try {
        appRef.current.destroy(true);
      } catch {
        // ignore
      }
      appRef.current = null;
      modelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const PIXI = await loadPixi();
        const { Live2DModel } = await loadLive2D();

        if (cancelled) return;

        // 建立 PixiJS Application
        const app = new PIXI.Application();
        const container = containerRef.current!;
        const rect = container.getBoundingClientRect();

        await app.init({
          width: rect.width || 600,
          height: height,
          backgroundAlpha: transparent ? 0 : 1,
          backgroundColor: transparent ? 0x000000 : 0x13131b,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (cancelled) { app.destroy(true); return; }

        // 掛載 Canvas
        container.innerHTML = "";
        container.appendChild(app.canvas as HTMLCanvasElement);

        // 載入 Live2D 模型
        const model = await Live2DModel.from(modelUrl, {
          autoInteract: interactive,
        });

        if (cancelled) { app.destroy(true); return; }

        // 縮放模型到容器大小
        const scale = Math.min(
          (rect.width || 600) / model.width,
          height / model.height
        ) * 0.8;
        model.scale.set(scale);
        model.x = ((rect.width || 600) - model.width * scale) / 2;
        model.y = (height - model.height * scale) / 2;

        app.stage.addChild(model);

        // 互動事件
        if (interactive) {
          model.on("hit", (hitAreas: string[]) => {
            onTap?.(hitAreas);
          });
        }

        appRef.current = app;
        modelRef.current = model;
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[Live2DCharacter] 載入失敗:", msg);
          setError(msg);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [modelUrl, height, interactive, transparent, cleanup, onTap]);

  // 窗口大小變化時調整
  useEffect(() => {
    const handleResize = () => {
      if (!appRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      appRef.current.renderer.resize(rect.width || 600, height);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [height]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "border border-[var(--oc-border)] bg-[var(--oc-s2)]",
        className
      )}
      style={{ height, width }}
    >
      {/* Loading 狀態 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--oc-indigo)] border-t-transparent" />
            <span className="text-xs text-[var(--oc-t3)]">載入 Live2D 模型中…</span>
          </div>
        </div>
      )}

      {/* 錯誤狀態 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="rounded-lg bg-[var(--oc-s3)] p-4 text-center">
            <p className="text-sm text-[var(--oc-red)]">Live2D 載入失敗</p>
            <p className="mt-1 text-xs text-[var(--oc-t3)]">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
