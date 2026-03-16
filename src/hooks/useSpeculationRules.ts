import { useEffect } from "react";

/**
 * Speculation Rules API — 預渲染/預載入近鄰頁面
 * Chrome 121+（2024-01）原生支援
 * 不支援的瀏覽器會自動忽略 <script type="speculationrules">
 */

interface SpeculationRule {
  prerender?: { source: "list"; urls: string[] }[];
  prefetch?: { source: "list"; urls: string[] }[];
}

export function useSpeculationRules(urls: string[]) {
  useEffect(() => {
    if (!urls.length) return;

    // 檢查是否支援 Speculation Rules
    if (!HTMLScriptElement.supports?.("speculationrules")) return;

    const rules: SpeculationRule = {
      prerender: [{ source: "list", urls }],
    };

    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = JSON.stringify(rules);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [urls.join(",")]);
}

/** 靜態注入：預渲染星艦三大頁面 + 首頁 */
export const STARSHIP_PRERENDER_URLS = [
  "/",
  "/starship/mdci",
  "/starship/frameworks",
  "/starship/manufacturing",
  "/tasks",
  "/center",
];
