/**
 * Live2D 展示頁面 — PoC
 * 路由: /starship/live2d
 */
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import Live2DCharacter from "@/components/starship/fx/Live2DCharacter";

// 免費測試模型（Live2D 官方 Sample）
const SAMPLE_MODELS = [
  {
    name: "Hiyori",
    url: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/hiyori/hiyori_pro_t10.model3.json",
    description: "Live2D 官方示範角色",
  },
  {
    name: "Shizuku",
    url: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json",
    description: "Cubism 2.1 經典角色",
  },
];

export default function Live2DShowcase() {
  const [selectedModel, setSelectedModel] = useState(0);
  const [lastHit, setLastHit] = useState<string>("");

  const handleTap = useCallback((hitAreas: string[]) => {
    setLastHit(hitAreas.join(", ") || "body");
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--oc-t1)]">
          Live2D 互動角色
        </h1>
        <p className="mt-1 text-sm text-[var(--oc-t3)]">
          PoC — pixi-live2d-display + PixiJS v8 | 點擊角色觸發互動
        </p>
      </div>

      {/* 模型選擇 */}
      <div className="flex gap-2">
        {SAMPLE_MODELS.map((m, i) => (
          <button
            key={m.name}
            onClick={() => setSelectedModel(i)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm transition-all",
              "border border-[var(--oc-border)]",
              i === selectedModel
                ? "bg-[var(--oc-indigo)] text-white border-[var(--oc-indigo)]"
                : "bg-[var(--oc-s2)] text-[var(--oc-t2)] hover:bg-[var(--oc-s3)]"
            )}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Live2D 角色 */}
      <Live2DCharacter
        modelUrl={SAMPLE_MODELS[selectedModel].url}
        height={500}
        interactive
        onTap={handleTap}
        className="w-full"
      />

      {/* 狀態面板 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-s2)] p-4">
          <p className="text-xs text-[var(--oc-t3)]">模型</p>
          <p className="mt-1 text-sm font-medium text-[var(--oc-t1)]">
            {SAMPLE_MODELS[selectedModel].name}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-s2)] p-4">
          <p className="text-xs text-[var(--oc-t3)]">說明</p>
          <p className="mt-1 text-sm text-[var(--oc-t2)]">
            {SAMPLE_MODELS[selectedModel].description}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--oc-border)] bg-[var(--oc-s2)] p-4">
          <p className="text-xs text-[var(--oc-t3)]">最後互動</p>
          <p className="mt-1 text-sm text-[var(--oc-cyan)]">
            {lastHit || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
