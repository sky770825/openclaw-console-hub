/**
 * DataExportGuard — 資料外帶管控
 *
 * 攔截以下行為：
 * 1. 複製（Ctrl+C / Cmd+C）核心敏感資料
 * 2. 右鍵選單（防止另存新檔）
 * 3. 拖曳資料至外部
 * 4. 列印 / 截圖提示
 *
 * 非高階權限不能帶重要資料出去，要有授權才行。
 *
 * 用法：
 *   <DataExportGuard dataType="tasks">
 *     <SensitiveDataComponent />
 *   </DataExportGuard>
 */

import { useEffect, useRef, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useCoreAuth } from './CoreAuthProvider';

type DataType = 'tasks' | 'reviews' | 'logs' | 'config' | 'all';

export function DataExportGuard({
  children,
  dataType,
  showWarning = true,
}: {
  children: React.ReactNode;
  dataType: DataType;
  showWarning?: boolean;
}) {
  const { checkExport, token } = useCoreAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const canExport = checkExport(dataType);

  // 攔截複製
  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (canExport) return; // 有權限就放行
    e.preventDefault();
    e.clipboardData?.setData('text/plain', '[Openclaw] 無權限外帶此資料');
  }, [canExport]);

  // 攔截右鍵
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (canExport) return;
    e.preventDefault();
  }, [canExport]);

  // 攔截拖曳
  const handleDragStart = useCallback((e: DragEvent) => {
    if (canExport) return;
    e.preventDefault();
  }, [canExport]);

  // 攔截列印
  const handleBeforePrint = useCallback(() => {
    if (canExport) return;
    // 在列印前隱藏內容
    if (containerRef.current) {
      containerRef.current.dataset.printing = 'true';
    }
  }, [canExport]);

  const handleAfterPrint = useCallback(() => {
    if (containerRef.current) {
      delete containerRef.current.dataset.printing;
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('copy', handleCopy);
    el.addEventListener('contextmenu', handleContextMenu);
    el.addEventListener('dragstart', handleDragStart);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      el.removeEventListener('copy', handleCopy);
      el.removeEventListener('contextmenu', handleContextMenu);
      el.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [handleCopy, handleContextMenu, handleDragStart, handleBeforePrint, handleAfterPrint]);

  return (
    <div
      ref={containerRef}
      className="relative [&[data-printing='true']]:invisible"
      style={canExport ? undefined : { WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {children}
      {!canExport && showWarning && (
        <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded bg-yellow-500/10 text-[10px] text-yellow-600">
          <ShieldAlert className="h-3 w-3 flex-shrink-0" />
          <span>此區域資料受保護 — 需要更高權限才能外帶</span>
        </div>
      )}
    </div>
  );
}
