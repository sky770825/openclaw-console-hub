import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

/**
 * 鍵盤快捷鍵 Hook
 * 統一管理應用快捷鍵
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts);
  
  // 更新 shortcuts ref
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在輸入框中，不觸發快捷鍵（除了 Escape）
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      for (const shortcut of shortcutsRef.current) {
        // 檢查是否匹配
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const altMatch = !!shortcut.alt === e.altKey;
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        
        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // 如果在輸入框中，只允許特定快捷鍵
          if (isInput && shortcut.key !== 'Escape') {
            continue;
          }
          
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

/**
 * 全域快捷鍵 Hook
 * 定義應用級快捷鍵
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'n',
      description: '新增任務',
      action: () => {
        navigate('/tasks?new=true');
        toast.info('新增任務', { description: '按 N 快速新增任務' });
      },
    },
    {
      key: '/',
      description: '聚焦搜尋',
      action: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          toast.info('搜尋模式', { description: '輸入關鍵字搜尋' });
        }
      },
    },
    {
      key: 'Escape',
      description: '取消/關閉',
      action: () => {
        // 關閉開啟的對話框或抽屜
        const closeButtons = document.querySelectorAll('[data-radix-dialog-close]');
        if (closeButtons.length > 0) {
          (closeButtons[0] as HTMLButtonElement).click();
        }
      },
    },
    {
      key: 'g',
      meta: true,
      description: '前往...',
      action: () => {
        toast.info('快捷導航', { 
          description: 'T: 任務, R: 執行, D: 儀表板, S: 設定' 
        });
      },
    },
    {
      key: 't',
      meta: true,
      description: '前往任務看板',
      action: () => navigate('/tasks'),
    },
    {
      key: 'r',
      meta: true,
      description: '前往執行紀錄',
      action: () => navigate('/runs'),
    },
    {
      key: 'd',
      meta: true,
      description: '前往儀表板',
      action: () => navigate('/'),
    },
    {
      key: 's',
      meta: true,
      description: '前往設定',
      action: () => navigate('/settings'),
    },
    {
      key: '?',
      shift: true,
      description: '顯示快捷鍵說明',
      action: () => {
        toast.info('鍵盤快捷鍵', {
          description: 'N:新增, /:搜尋, ⌘T:任務, ⌘R:執行, ⌘D:儀表板, Esc:關閉',
          duration: 5000,
        });
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

/**
 * 任務看板專用快捷鍵
 */
export function useTaskBoardShortcuts(
  onRunTask?: (taskId: string) => void,
  onEditTask?: (taskId: string) => void,
  selectedTaskId?: string | null
) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'r',
      description: '執行選中任務',
      action: () => {
        if (selectedTaskId && onRunTask) {
          onRunTask(selectedTaskId);
        }
      },
    },
    {
      key: 'e',
      description: '編輯選中任務',
      action: () => {
        if (selectedTaskId && onEditTask) {
          onEditTask(selectedTaskId);
        }
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

export default useKeyboardShortcuts;
