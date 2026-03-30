import { useEffect, useState } from 'react';
import { Bell, Moon, Sun, User } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export function TopBar() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode) {
      setIsDark(savedMode === 'dark');
      return;
    }

    setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <StatusBadge status="healthy" />
        <div className="hidden sm:block text-sm text-muted-foreground">
          Workspace: <span className="font-medium text-foreground">Production</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIsDark((prev) => !prev)}
          className="p-2 border border-border bg-muted hover:bg-accent"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 border border-border bg-muted hover:bg-accent transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary"></span>
        </button>

        <div className="flex items-center gap-2 pl-4 border-l border-border">
          <div className="w-8 h-8 bg-primary flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm hidden sm:block">
            <div className="font-medium text-foreground">Dr. Sarah Chen</div>
            <div className="text-muted-foreground text-xs">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}