import { useId, type ReactNode } from "react";

/**
 * Native Popover API 元件
 * 使用瀏覽器原生 popover 屬性（Chrome 114+, Firefox 125+, Safari 17+）
 * 自動享有 top-layer、light-dismiss、鍵盤 ESC 關閉
 */

interface NativePopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function NativePopover({ trigger, children, className = "" }: NativePopoverProps) {
  const id = useId();
  const popoverId = `popover-${id}`;

  return (
    <>
      {/* @ts-expect-error — popovertarget 尚未在 React 18 型別中定義 */}
      <button popovertarget={popoverId} className="inline-flex">
        {trigger}
      </button>
      {/* @ts-expect-error — popover 屬性尚未在 React 18 型別中定義 */}
      <div id={popoverId} popover="auto" className={className}>
        {children}
      </div>
    </>
  );
}
