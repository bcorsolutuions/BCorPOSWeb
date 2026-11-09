"use client";

import { useRTLContext } from "@/i18n/rtl-provider";
import type { Direction } from "@/i18n/config";

interface UseDirectionResult {
  direction: Direction;
  isRtl: boolean;
  /** Pick between two values based on direction — handy for icons/animations that must flip. */
  choose: <T>(ltrValue: T, rtlValue: T) => T;
}

export function useDirection(): UseDirectionResult {
  const { direction, isRtl } = useRTLContext();

  return {
    direction,
    isRtl,
    choose: (ltrValue, rtlValue) => (isRtl ? rtlValue : ltrValue),
  };
}
