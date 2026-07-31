import { useEffect } from 'react';

/**
 * Hook to handle global keyboard shortcuts.
 * @param {Object} shortcuts - Key-value map of shortcut combos to handler functions.
 *                             Keys should be like 'ctrl+n', 'escape', 'alt+v'.
 * @param {boolean} active - Whether the shortcuts are currently active.
 */
export function useKeyboardShortcuts(shortcuts, active = true) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        // Allow Escape to work even in inputs (e.g. to close modals)
        if (e.key.toLowerCase() !== 'escape') {
          return;
        }
      }

      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey; // Support Mac Cmd as well
      const isAlt = e.altKey;
      const isShift = e.shiftKey;

      let combo = '';
      if (isCtrl && key !== 'control' && key !== 'meta') combo += 'ctrl+';
      if (isAlt && key !== 'alt') combo += 'alt+';
      if (isShift && key !== 'shift') combo += 'shift+';
      combo += key;

      // Handle raw key like 'escape'
      if (!isCtrl && !isAlt && !isShift) {
        combo = key;
      }

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, active]);
}
