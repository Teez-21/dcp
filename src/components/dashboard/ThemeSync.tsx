"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function ThemeSync() {
  const theme = useDashboardStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
