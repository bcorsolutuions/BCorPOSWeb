"use client";

import { useEffect } from "react";

export interface PosKeyboardActions {
  onFocusSearch?: () => void;
  onHold?: () => void;
  onRecall?: () => void;
  onPay?: () => void;
  onCashDrawer?: () => void;
  onReturn?: () => void;
  onNewSale?: () => void;
}

/**
 * F-keys don't collide with typing (unlike letter shortcuts), so this
 * listens globally rather than only when a specific element is focused —
 * a cashier mid-scan can still hit F4 to pay. Each handler is optional so
 * a screen can wire only the actions it actually offers.
 */
export function usePosKeyboardShortcuts(actions: PosKeyboardActions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const handlers: Record<string, (() => void) | undefined> = {
        F1: actions.onFocusSearch,
        F2: actions.onHold,
        F3: actions.onRecall,
        F4: actions.onPay,
        F6: actions.onCashDrawer,
        F8: actions.onReturn,
        F9: actions.onNewSale,
      };

      const handler = handlers[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actions.onFocusSearch,
    actions.onHold,
    actions.onRecall,
    actions.onPay,
    actions.onCashDrawer,
    actions.onReturn,
    actions.onNewSale,
  ]);
}
