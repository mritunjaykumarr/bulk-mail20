import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button className="iconButton themeToggle" type="button" onClick={onToggle} title="Toggle theme">
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span className="srOnly">{isDark ? 'Use light theme' : 'Use dark theme'}</span>
    </button>
  );
}
