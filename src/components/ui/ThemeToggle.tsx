"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label="테마 전환"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center
        shadow-lg transition-all duration-300 hover:scale-110 active:scale-95
        glass-card border border-white/10"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-[#f5c842]" />
      ) : (
        <Moon className="w-5 h-5 text-[#6b7fd7]" />
      )}
    </button>
  );
}
