/**
 * useViewTransition — View Transitions API 包裝
 *
 * 在支援的瀏覽器中啟用頁面轉場動畫，
 * 不支援時 fallback 為直接執行。
 */
import { useCallback } from "react";

/**
 * 檢查瀏覽器是否支援 View Transitions API
 */
function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

/**
 * 包裝一個 DOM 更新函式，在支援的瀏覽器中觸發 View Transition。
 *
 * @example
 * const transition = useViewTransition();
 * transition(() => navigate("/starship/mdci"));
 */
export function useViewTransition() {
  return useCallback((updateFn: () => void | Promise<void>) => {
    if (supportsViewTransitions()) {
      (document as any).startViewTransition(updateFn);
    } else {
      updateFn();
    }
  }, []);
}
