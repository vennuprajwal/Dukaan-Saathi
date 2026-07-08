import { useState, useEffect } from "react";

function applyTheme(theme) {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;
  
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
  
  localStorage.setItem("dukaan_theme", theme);
  localStorage.setItem("dukaan_theme_explicit", theme);
}

export function useTheme() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem("dukaan_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      applyTheme(newTheme);
      return newTheme;
    });
  };

  return { theme, toggleTheme, setTheme };
}
