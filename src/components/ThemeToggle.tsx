"use client";

import { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

function getCurrentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // ignore
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const label = useMemo(() => {
    return theme === "dark" ? "Dark" : "Light";
  }, [theme]);

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      Theme: {label}
    </button>
  );
}
